// backend/src/middlewares/permissions.middleware.js
const User = require('../models/UserModel');
const AuditoriaAdmin = require('../models/AuditoriaAdmin');

/**
 * Middleware para verificar permissões específicas
 * @param {string} modulo - Nome do módulo (ex: 'pontos', 'usuarios')
 * @param {string} acao - Ação a ser executada (ex: 'ler', 'criar', 'editar', 'deletar')
 */
const checkPermission = (modulo, acao) => {
    return async (req, res, next) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id || req.admin?._id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Não autorizado.'
                });
            }

            const user = await User.findById(userId).select('role permissoes nivelAcesso');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.'
                });
            }

            // Super admin tem todas as permissões
            if (user.role === 'super_admin') {
                req.admin = user;
                return next();
            }

            // Verificar se usuário tem permissões
            if (!user.permissoes || user.permissoes.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: `Você não tem permissões para ${acao} em ${modulo}.`
                });
            }

            // Verificar se tem a permissão específica
            const temPermissao = user.permissoes.some(p =>
                p.modulo === modulo && p.acoes && p.acoes.includes(acao)
            );

            if (!temPermissao) {
                // Registrar tentativa não autorizada
                await AuditoriaAdmin.registrar({
                    admin: userId,
                    acao,
                    modulo,
                    descricao: `Tentativa não autorizada de ${acao} em ${modulo}`,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    resultado: 'falha',
                    severidade: 'alta',
                    erro: 'Permissão negada'
                });

                return res.status(403).json({
                    success: false,
                    message: `Você não tem permissão para ${acao} em ${modulo}.`,
                    permissoesNecessarias: { modulo, acao }
                });
            }

            req.admin = user;
            next();

        } catch (error) {
            console.error('❌ Erro no middleware checkPermission:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar permissões.',
                error: error.message
            });
        }
    };
};

/**
 * Middleware para verificar múltiplas permissões (OR - basta ter uma)
 */
const checkAnyPermission = (permissoes) => {
    return async (req, res, next) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id || req.admin?._id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Não autorizado.'
                });
            }

            const user = await User.findById(userId).select('role permissoes');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.'
                });
            }

            // Super admin sempre passa
            if (user.role === 'super_admin') {
                req.admin = user;
                return next();
            }

            // Verificar se tem pelo menos uma das permissões
            const temAlgumaPermissao = permissoes.some(({ modulo, acao }) =>
                user.permissoes?.some(p =>
                    p.modulo === modulo && p.acoes?.includes(acao)
                )
            );

            if (!temAlgumaPermissao) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem nenhuma das permissões necessárias.',
                    permissoesNecessarias: permissoes
                });
            }

            req.admin = user;
            next();

        } catch (error) {
            console.error('❌ Erro no middleware checkAnyPermission:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar permissões.',
                error: error.message
            });
        }
    };
};

/**
 * Middleware para verificar múltiplas permissões (AND - precisa ter todas)
 */
const checkAllPermissions = (permissoes) => {
    return async (req, res, next) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id || req.admin?._id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Não autorizado.'
                });
            }

            const user = await User.findById(userId).select('role permissoes');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.'
                });
            }

            // Super admin sempre passa
            if (user.role === 'super_admin') {
                req.admin = user;
                return next();
            }

            // Verificar se tem TODAS as permissões
            const temTodasPermissoes = permissoes.every(({ modulo, acao }) =>
                user.permissoes?.some(p =>
                    p.modulo === modulo && p.acoes?.includes(acao)
                )
            );

            if (!temTodasPermissoes) {
                const permissoesFaltando = permissoes.filter(({ modulo, acao }) =>
                    !user.permissoes?.some(p =>
                        p.modulo === modulo && p.acoes?.includes(acao)
                    )
                );

                return res.status(403).json({
                    success: false,
                    message: 'Você não tem todas as permissões necessárias.',
                    permissoesFaltando
                });
            }

            req.admin = user;
            next();

        } catch (error) {
            console.error('❌ Erro no middleware checkAllPermissions:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar permissões.',
                error: error.message
            });
        }
    };
};

/**
 * Middleware para verificar se pode gerenciar outro usuário
 * (não pode gerenciar usuários de nível superior)
 */
const canManageUser = async (req, res, next) => {
    try {
        const adminUserId = req.headers['x-user-id'] || req.user?.id || req.admin?._id;
        const targetUserId = req.params.id || req.body.userId;

        if (!adminUserId || !targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'IDs de usuário inválidos.'
            });
        }

        const [adminUser, targetUser] = await Promise.all([
            User.findById(adminUserId).select('role nivelAcesso'),
            User.findById(targetUserId).select('role nivelAcesso')
        ]);

        if (!adminUser || !targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado.'
            });
        }

        // Super admin pode gerenciar qualquer um
        if (adminUser.role === 'super_admin') {
            req.admin = adminUser;
            req.targetUser = targetUser;
            return next();
        }

        // Não pode gerenciar super admins
        if (targetUser.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Você não pode gerenciar super administradores.'
            });
        }

        // Não pode gerenciar usuário de nível superior ou igual
        const adminLevel = adminUser.nivelAcesso || 1;
        const targetLevel = targetUser.nivelAcesso || 1;

        if (targetLevel >= adminLevel) {
            return res.status(403).json({
                success: false,
                message: 'Você só pode gerenciar usuários de nível inferior ao seu.'
            });
        }

        req.admin = adminUser;
        req.targetUser = targetUser;
        next();

    } catch (error) {
        console.error('❌ Erro no middleware canManageUser:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao verificar permissões.',
            error: error.message
        });
    }
};

/**
 * Middleware para verificar se pode modificar recurso próprio
 */
const canModifyOwn = (getUserIdFromReq) => {
    return async (req, res, next) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;
            const resourceUserId = getUserIdFromReq(req);

            if (!userId || !resourceUserId) {
                return res.status(401).json({
                    success: false,
                    message: 'Não autorizado.'
                });
            }

            const user = await User.findById(userId).select('role');

            // Admin pode modificar qualquer coisa
            if (user.role === 'admin' || user.role === 'super_admin') {
                req.admin = user;
                return next();
            }

            // Usuário comum só pode modificar próprio recurso
            if (userId.toString() !== resourceUserId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Você só pode modificar seus próprios recursos.'
                });
            }

            next();

        } catch (error) {
            console.error('❌ Erro no middleware canModifyOwn:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar permissões.',
                error: error.message
            });
        }
    };
};

/**
 * Helper para adicionar permissão a um usuário
 */
const adicionarPermissao = async (userId, modulo, acoes) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('Usuário não encontrado');
    }

    if (!user.permissoes) {
        user.permissoes = [];
    }

    // Verificar se já tem permissão para o módulo
    const permissaoExistente = user.permissoes.find(p => p.modulo === modulo);

    if (permissaoExistente) {
        // Adicionar novas ações sem duplicar
        const acoesUnicas = [...new Set([...permissaoExistente.acoes, ...acoes])];
        permissaoExistente.acoes = acoesUnicas;
    } else {
        user.permissoes.push({ modulo, acoes });
    }

    await user.save();
    return user;
};

/**
 * Helper para remover permissão de um usuário
 */
const removerPermissao = async (userId, modulo, acoes) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('Usuário não encontrado');
    }

    if (!user.permissoes || user.permissoes.length === 0) {
        return user;
    }

    const permissaoExistente = user.permissoes.find(p => p.modulo === modulo);

    if (permissaoExistente) {
        if (acoes && acoes.length > 0) {
            // Remover apenas ações específicas
            permissaoExistente.acoes = permissaoExistente.acoes.filter(
                a => !acoes.includes(a)
            );

            // Se não sobrou nenhuma ação, remover o módulo todo
            if (permissaoExistente.acoes.length === 0) {
                user.permissoes = user.permissoes.filter(p => p.modulo !== modulo);
            }
        } else {
            // Remover módulo inteiro
            user.permissoes = user.permissoes.filter(p => p.modulo !== modulo);
        }
    }

    await user.save();
    return user;
};

/**
 * Constantes de permissões disponíveis
 */
const MODULOS_DISPONIVEIS = [
    'pontos',
    'usuarios',
    'materiais',
    'denuncias',
    'recompensas',
    'validacoes',
    'estoque',
    'notificacoes',
    'configuracoes',
    'metricas',
    'auditoria'
];

const ACOES_DISPONIVEIS = [
    'ler',
    'criar',
    'editar',
    'deletar',
    'validar',
    'rejeitar',
    'exportar',
    'importar'
];

module.exports = {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    canManageUser,
    canModifyOwn,
    adicionarPermissao,
    removerPermissao,
    MODULOS_DISPONIVEIS,
    ACOES_DISPONIVEIS
};