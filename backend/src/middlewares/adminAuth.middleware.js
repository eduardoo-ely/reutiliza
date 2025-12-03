const User = require('../models/UserModel');
const AuditoriaAdmin = require('../models/AuditoriaAdmin');

const isAdmin = async (req, res, next) => {
    try {
        // Pegar ID do usuário do header (assumindo JWT ou sessão)
        const userId = req.headers['x-user-id'] || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Não autorizado. Token inválido ou ausente.'
            });
        }

        // Buscar usuário
        const user = await User.findById(userId).select('role nome email nivelAcesso permissoes');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado.'
            });
        }

        // Verificar se é admin, moderador ou super_admin
        if (!['admin', 'moderador', 'super_admin'].includes(user.role)) {
            // Registrar tentativa não autorizada
            await AuditoriaAdmin.registrar({
                admin: userId,
                acao: 'visualizar',
                modulo: 'auditoria',
                descricao: 'Tentativa de acesso não autorizado à área administrativa',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                resultado: 'falha',
                severidade: 'alta',
                erro: 'Usuário sem permissão de administrador'
            });

            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Você não tem permissões de administrador.'
            });
        }

        // Anexar usuário à requisição
        req.admin = user;

        next();
    } catch (error) {
        console.error('❌ Erro no middleware isAdmin:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao verificar permissões.',
            error: error.message
        });
    }
};

/**
 * Middleware para verificar se o usuário é super admin
 */
const isSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'] || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Não autorizado.'
            });
        }

        const user = await User.findById(userId).select('role');

        if (!user || user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas super administradores.'
            });
        }

        req.admin = user;
        next();
    } catch (error) {
        console.error('❌ Erro no middleware isSuperAdmin:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao verificar permissões.',
            error: error.message
        });
    }
};

/**
 * Middleware para verificar nível de acesso mínimo
 */
const checkAccessLevel = (nivelMinimo) => {
    return async (req, res, next) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Não autorizado.'
                });
            }

            const user = await User.findById(userId).select('nivelAcesso role');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.'
                });
            }

            // Super admin sempre tem acesso total
            if (user.role === 'super_admin') {
                req.admin = user;
                return next();
            }

            const nivelUsuario = user.nivelAcesso || 1;

            if (nivelUsuario < nivelMinimo) {
                return res.status(403).json({
                    success: false,
                    message: `Nível de acesso insuficiente. Necessário nível ${nivelMinimo}.`
                });
            }

            req.admin = user;
            next();
        } catch (error) {
            console.error('❌ Erro no middleware checkAccessLevel:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar nível de acesso.',
                error: error.message
            });
        }
    };
};

/**
 * Middleware para registrar ação na auditoria
 */
const logAction = (modulo, acao) => {
    return async (req, res, next) => {
        // Guardar timestamp inicial
        req.startTime = Date.now();

        // Interceptar res.json para capturar resposta
        const originalJson = res.json;

        res.json = function(data) {
            const duracao = Date.now() - req.startTime;

            // Registrar na auditoria de forma assíncrona (não bloquear resposta)
            (async () => {
                try {
                    const admin = req.admin || req.user;

                    if (!admin) return;

                    let descricao = `${acao} em ${modulo}`;
                    if (req.params.id) descricao += ` - ID: ${req.params.id}`;

                    await AuditoriaAdmin.registrar({
                        admin: admin._id || admin.id,
                        acao,
                        modulo,
                        registroId: req.params.id || req.body.id,
                        registroTipo: modulo,
                        dadosAnteriores: req.dadosOriginais, // Se disponível
                        dadosNovos: req.body,
                        descricao,
                        ip: req.ip,
                        userAgent: req.headers['user-agent'],
                        resultado: data.success ? 'sucesso' : 'falha',
                        erro: data.success ? null : data.message,
                        severidade: determinarSeveridade(acao, modulo),
                        duracao
                    });
                } catch (error) {
                    console.error('❌ Erro ao registrar auditoria:', error);
                }
            })();

            // Chamar o json original
            return originalJson.call(this, data);
        };

        next();
    };
};

/**
 * Determinar severidade da ação para auditoria
 */
function determinarSeveridade(acao, modulo) {
    // Ações críticas
    if (['deletar', 'suspender', 'alterar_permissoes'].includes(acao)) {
        return 'critica';
    }

    // Ações de alta severidade
    if (['desativar', 'rejeitar', 'cancelar'].includes(acao) ||
        ['usuarios', 'permissoes', 'configuracoes'].includes(modulo)) {
        return 'alta';
    }

    // Ações médias
    if (['criar', 'editar', 'validar'].includes(acao)) {
        return 'media';
    }

    // Resto é baixa severidade
    return 'baixa';
}

/**
 * Middleware para limitar taxa de requisições (rate limiting)
 */
const rateLimit = (maxRequests = 100, windowMs = 60000) => {
    const requests = new Map();

    return (req, res, next) => {
        const userId = req.headers['x-user-id'] || req.user?.id || req.ip;
        const now = Date.now();

        if (!requests.has(userId)) {
            requests.set(userId, []);
        }

        const userRequests = requests.get(userId);

        // Limpar requisições antigas
        const validRequests = userRequests.filter(time => now - time < windowMs);

        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: `Limite de ${maxRequests} requisições por ${windowMs/1000}s excedido. Tente novamente mais tarde.`
            });
        }

        validRequests.push(now);
        requests.set(userId, validRequests);

        next();
    };
};

/**
 * Middleware para detectar atividades suspeitas
 */
const detectSuspiciousActivity = async (req, res, next) => {
    try {
        const userId = req.admin?._id || req.admin?.id;

        if (!userId) return next();

        // Verificar atividades suspeitas nas últimas 24 horas
        const alertas = await AuditoriaAdmin.detectarAtividadesSuspeitas(userId, 24);

        if (alertas.length > 0) {
            console.warn('⚠️ ATIVIDADE SUSPEITA DETECTADA:', {
                admin: userId,
                alertas,
                ip: req.ip
            });

            // Se for crítico, registrar e notificar super admins
            const alertasCriticos = alertas.filter(a => a.severidade === 'critica');

            if (alertasCriticos.length > 0) {
                // Notificar super admins
                const User = require('../models/UserModel');
                const Notificacao = require('../models/Notificacao');

                const superAdmins = await User.find({ role: 'super_admin' });

                for (const superAdmin of superAdmins) {
                    await Notificacao.create({
                        usuario: superAdmin._id,
                        tipo: 'sistema',
                        titulo: '🚨 ALERTA: Atividade Suspeita Detectada',
                        mensagem: `Admin ${userId} apresenta comportamento suspeito: ${alertasCriticos.map(a => a.mensagem).join(', ')}`,
                        prioridade: 'urgente',
                        metadata: {
                            adminId: userId.toString(),
                            alertas: alertasCriticos
                        }
                    });
                }
            }
        }

        next();
    } catch (error) {
        console.error('❌ Erro ao detectar atividades suspeitas:', error);
        // Não bloquear a requisição
        next();
    }
};

module.exports = {
    isAdmin,
    isSuperAdmin,
    checkAccessLevel,
    logAction,
    rateLimit,
    detectSuspiciousActivity
};