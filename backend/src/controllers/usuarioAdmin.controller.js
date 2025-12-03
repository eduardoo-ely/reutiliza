const User = require('../models/UserModel');
const AuditoriaAdmin = require('../models/AuditoriaAdmin');
const MaterialReciclado = require('../models/MaterialReciclado');
const Notificacao = require('../models/Notificacao');
const { adicionarPermissao, removerPermissao } = require('../middlewares/permissions.middleware');

exports.listarTodos = async (req, res) => {
    try {
        const {
            role,
            ativo,
            busca,
            limite = 50,
            pagina = 1,
            ordenar = '-createdAt'
        } = req.query;

        const filtro = {};

        if (role) filtro.role = role;
        if (ativo !== undefined) filtro.ativo = ativo === 'true';

        if (busca) {
            filtro.$or = [
                { nome: new RegExp(busca, 'i') },
                { email: new RegExp(busca, 'i') }
            ];
        }

        const skip = (parseInt(pagina) - 1) * parseInt(limite);

        const [usuarios, total] = await Promise.all([
            User.find(filtro)
                .select('-senha')
                .sort(ordenar)
                .limit(parseInt(limite))
                .skip(skip)
                .lean(),
            User.countDocuments(filtro)
        ]);

        res.json({
            success: true,
            data: {
                usuarios,
                total,
                pagina: parseInt(pagina),
                totalPaginas: Math.ceil(total / parseInt(limite))
            }
        });
    } catch (error) {
        console.error('❌ Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar usuários',
            error: error.message
        });
    }
};

/**
 * Buscar usuário por ID
 */
exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const usuario = await User.findById(id)
            .select('-senha')
            .lean();

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Buscar estatísticas do usuário
        const [totalMateriais, pontosGanhos, resgatosRealizados] = await Promise.all([
            MaterialReciclado.countDocuments({ usuario: id }),
            MaterialReciclado.aggregate([
                { $match: { usuario: id, status: 'validado' } },
                { $group: { _id: null, total: { $sum: '$pontos' } } }
            ]),
            require('../models/ResgateRecompensa').countDocuments({ usuario: id })
        ]);

        res.json({
            success: true,
            data: {
                ...usuario,
                estatisticas: {
                    totalMateriais,
                    pontosGanhos: pontosGanhos[0]?.total || 0,
                    resgatosRealizados
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuário',
            error: error.message
        });
    }
};

/**
 * Alterar permissões de um usuário
 */
exports.alterarPermissoes = async (req, res) => {
    try {
        const { id } = req.params;
        const { modulo, acoes, operacao } = req.body;
        const adminId = req.admin._id || req.admin.id;

        if (!modulo || !acoes || !operacao) {
            return res.status(400).json({
                success: false,
                message: 'Módulo, ações e operação são obrigatórios'
            });
        }

        if (!['adicionar', 'remover'].includes(operacao)) {
            return res.status(400).json({
                success: false,
                message: 'Operação deve ser "adicionar" ou "remover"'
            });
        }

        // Buscar dados antigos
        const usuarioAntigo = await User.findById(id).select('permissoes').lean();

        // Aplicar operação
        let usuario;
        if (operacao === 'adicionar') {
            usuario = await adicionarPermissao(id, modulo, acoes);
        } else {
            usuario = await removerPermissao(id, modulo, acoes);
        }

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'alterar_permissoes',
            modulo: 'usuarios',
            registroId: id,
            registroTipo: 'User',
            dadosAnteriores: usuarioAntigo,
            dadosNovos: { modulo, acoes, operacao },
            descricao: `${operacao === 'adicionar' ? 'Adicionadas' : 'Removidas'} permissões de ${modulo} para usuário ${usuario.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'critica'
        });

        // Notificar usuário
        await Notificacao.create({
            usuario: id,
            tipo: 'sistema',
            titulo: '🔐 Permissões Alteradas',
            mensagem: `Suas permissões foram ${operacao === 'adicionar' ? 'expandidas' : 'limitadas'} no módulo ${modulo}.`,
            prioridade: 'alta'
        });

        res.json({
            success: true,
            message: 'Permissões alteradas com sucesso',
            data: usuario
        });
    } catch (error) {
        console.error('❌ Erro ao alterar permissões:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar permissões',
            error: error.message
        });
    }
};

/**
 * Alterar role de um usuário
 */
exports.alterarRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const adminId = req.admin._id || req.admin.id;

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role é obrigatório'
            });
        }

        const rolesValidos = ['usuario', 'moderador', 'admin', 'super_admin'];
        if (!rolesValidos.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Role inválido. Valores aceitos: ${rolesValidos.join(', ')}`
            });
        }

        // Buscar usuário atual
        const usuarioAtual = await User.findById(id);

        if (!usuarioAtual) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        const roleAnterior = usuarioAtual.role;

        // Atualizar role
        usuarioAtual.role = role;

        // Se está promovendo para admin/moderador, definir nível de acesso padrão
        if (['admin', 'moderador'].includes(role) && !usuarioAtual.nivelAcesso) {
            usuarioAtual.nivelAcesso = role === 'admin' ? 3 : 2;
        }

        await usuarioAtual.save();

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'alterar_permissoes',
            modulo: 'usuarios',
            registroId: id,
            registroTipo: 'User',
            dadosAnteriores: { role: roleAnterior },
            dadosNovos: { role },
            descricao: `Alterado role de ${roleAnterior} para ${role} - Usuário: ${usuarioAtual.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'critica'
        });

        // Notificar usuário
        const mensagens = {
            usuario: 'Suas permissões administrativas foram removidas.',
            moderador: 'Você foi promovido a Moderador!',
            admin: 'Você foi promovido a Administrador!',
            super_admin: 'Você foi promovido a Super Administrador!'
        };

        await Notificacao.create({
            usuario: id,
            tipo: 'sistema',
            titulo: '🎖️ Role Alterado',
            mensagem: mensagens[role],
            prioridade: 'urgente'
        });

        res.json({
            success: true,
            message: 'Role alterado com sucesso',
            data: usuarioAtual
        });
    } catch (error) {
        console.error('❌ Erro ao alterar role:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar role',
            error: error.message
        });
    }
};

/**
 * Suspender usuário
 */
exports.suspender = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo, duracao } = req.body; // duracao em dias (opcional)
        const adminId = req.admin._id || req.admin.id;

        if (!motivo) {
            return res.status(400).json({
                success: false,
                message: 'Motivo da suspensão é obrigatório'
            });
        }

        const usuario = await User.findById(id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        if (!usuario.ativo) {
            return res.status(400).json({
                success: false,
                message: 'Usuário já está suspenso'
            });
        }

        // Calcular data de expiração da suspensão
        let dataExpiracao = null;
        if (duracao && duracao > 0) {
            dataExpiracao = new Date();
            dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(duracao));
        }

        // Suspender usuário
        usuario.ativo = false;
        usuario.motivoSuspensao = motivo;
        usuario.dataSuspensao = new Date();
        usuario.dataExpiracaoSuspensao = dataExpiracao;
        await usuario.save();

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'suspender',
            modulo: 'usuarios',
            registroId: id,
            registroTipo: 'User',
            dadosNovos: { motivo, duracao, dataExpiracao },
            descricao: `Suspenso usuário: ${usuario.nome} - Motivo: ${motivo}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'critica'
        });

        // Notificar usuário
        const mensagemDuracao = duracao
            ? ` por ${duracao} dias (até ${dataExpiracao.toLocaleDateString('pt-BR')})`
            : ' indefinidamente';

        await Notificacao.create({
            usuario: id,
            tipo: 'sistema',
            titulo: '🚫 Conta Suspensa',
            mensagem: `Sua conta foi suspensa${mensagemDuracao}. Motivo: ${motivo}`,
            prioridade: 'urgente'
        });

        res.json({
            success: true,
            message: 'Usuário suspenso com sucesso',
            data: usuario
        });
    } catch (error) {
        console.error('❌ Erro ao suspender usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao suspender usuário',
            error: error.message
        });
    }
};

/**
 * Reativar usuário
 */
exports.reativar = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id || req.admin.id;

        const usuario = await User.findById(id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        if (usuario.ativo) {
            return res.status(400).json({
                success: false,
                message: 'Usuário já está ativo'
            });
        }

        const motivoAnterior = usuario.motivoSuspensao;

        // Reativar usuário
        usuario.ativo = true;
        usuario.motivoSuspensao = null;
        usuario.dataSuspensao = null;
        usuario.dataExpiracaoSuspensao = null;
        await usuario.save();

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'reativar',
            modulo: 'usuarios',
            registroId: id,
            registroTipo: 'User',
            descricao: `Reativado usuário: ${usuario.nome} (Suspensão anterior: ${motivoAnterior})`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'alta'
        });

        // Notificar usuário
        await Notificacao.create({
            usuario: id,
            tipo: 'sistema',
            titulo: '✅ Conta Reativada',
            mensagem: 'Sua conta foi reativada. Você pode usar a plataforma normalmente novamente.',
            prioridade: 'alta'
        });

        res.json({
            success: true,
            message: 'Usuário reativado com sucesso',
            data: usuario
        });
    } catch (error) {
        console.error('❌ Erro ao reativar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao reativar usuário',
            error: error.message
        });
    }
};

/**
 * Obter atividades recentes do usuário
 */
exports.atividadesRecentes = async (req, res) => {
    try {
        const { id } = req.params;
        const { limite = 20 } = req.query;

        const [materiais, resgates, notificacoes] = await Promise.all([
            MaterialReciclado.find({ usuario: id })
                .sort({ createdAt: -1 })
                .limit(parseInt(limite))
                .populate('pontoColeta', 'nome')
                .lean(),

            require('../models/ResgateRecompensa').find({ usuario: id })
                .sort({ createdAt: -1 })
                .limit(parseInt(limite))
                .populate('recompensa', 'nome')
                .lean(),

            Notificacao.find({ usuario: id })
                .sort({ createdAt: -1 })
                .limit(parseInt(limite))
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                materiais,
                resgates,
                notificacoes
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar atividades:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar atividades recentes',
            error: error.message
        });
    }
};

/**
 * Obter log de auditoria do usuário
 */
exports.logAuditoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { limite = 50, pagina = 1 } = req.query;

        const logs = await AuditoriaAdmin.getAcoesAdmin(id, {
            limite: parseInt(limite),
            pagina: parseInt(pagina)
        });

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('❌ Erro ao buscar log de auditoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar log de auditoria',
            error: error.message
        });
    }
};

/**
 * Estatísticas gerais de usuários
 */
exports.estatisticas = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        const [
            totalUsuarios,
            usuariosAtivos,
            usuariosSuspensos,
            novoUsuarios,
            usuariosPorRole,
            topUsuariosPontos
        ] = await Promise.all([
            User.countDocuments({ role: 'usuario' }),
            User.countDocuments({ role: 'usuario', ativo: true, lastLogin: { $gte: dataInicio } }),
            User.countDocuments({ role: 'usuario', ativo: false }),
            User.countDocuments({ role: 'usuario', createdAt: { $gte: dataInicio } }),

            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]),

            User.find({ role: 'usuario', ativo: true })
                .sort({ pontos: -1 })
                .limit(10)
                .select('nome email pontos')
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                total: totalUsuarios,
                ativos: usuariosAtivos,
                suspensos: usuariosSuspensos,
                novos: novoUsuarios,
                porRole: usuariosPorRole,
                topUsuarios: topUsuariosPontos
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            error: error.message
        });
    }
};