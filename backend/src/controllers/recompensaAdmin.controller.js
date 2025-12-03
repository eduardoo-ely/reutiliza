const Recompensa = require('../models/Recompensa');
const ResgateRecompensa = require('../models/ResgateRecompensa');
const AuditoriaAdmin = require('../models/AuditoriaAdmin');
const User = require('../models/UserModel');
const Notificacao = require('../models/Notificacao');

// Listar todos os resgates
exports.listarResgates = async (req, res) => {
    try {
        const { status, limite = 50, pagina = 1 } = req.query;

        const filtro = {};
        if (status) filtro.status = status;

        const skip = (parseInt(pagina) - 1) * parseInt(limite);

        const [resgates, total] = await Promise.all([
            ResgateRecompensa.find(filtro)
                .populate('usuario', 'nome email pontos')
                .populate('recompensa', 'nome descricao pontosNecessarios tipo')
                .sort({ createdAt: -1 })
                .limit(parseInt(limite))
                .skip(skip)
                .lean(),
            ResgateRecompensa.countDocuments(filtro)
        ]);

        res.json({
            success: true,
            data: {
                resgates,
                total,
                pagina: parseInt(pagina),
                totalPaginas: Math.ceil(total / parseInt(limite))
            }
        });
    } catch (error) {
        console.error('❌ Erro ao listar resgates:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar resgates',
            error: error.message
        });
    }
};

// Listar resgates pendentes
exports.listarResgatesPendentes = async (req, res) => {
    try {
        const resgates = await ResgateRecompensa.getPendentesValidacao();

        res.json({
            success: true,
            count: resgates.length,
            data: resgates
        });
    } catch (error) {
        console.error('❌ Erro ao listar resgates pendentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar resgates pendentes',
            error: error.message
        });
    }
};

// Buscar resgate por ID
exports.buscarResgatePorId = async (req, res) => {
    try {
        const { id } = req.params;

        const resgate = await ResgateRecompensa.findById(id)
            .populate('usuario', 'nome email pontos pontosUtilizados')
            .populate('recompensa')
            .populate('validadoPor', 'nome email')
            .lean();

        if (!resgate) {
            return res.status(404).json({
                success: false,
                message: 'Resgate não encontrado'
            });
        }

        res.json({
            success: true,
            data: resgate
        });
    } catch (error) {
        console.error('❌ Erro ao buscar resgate:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar resgate',
            error: error.message
        });
    }
};

// Validar resgate
exports.validarResgate = async (req, res) => {
    try {
        const { id } = req.params;
        const { observacoes } = req.body;
        const adminId = req.admin._id || req.admin.id;

        const resgate = await ResgateRecompensa.findById(id);

        if (!resgate) {
            return res.status(404).json({
                success: false,
                message: 'Resgate não encontrado'
            });
        }

        if (resgate.status !== 'pendente') {
            return res.status(400).json({
                success: false,
                message: 'Este resgate já foi processado'
            });
        }

        await resgate.validar(adminId, observacoes);

        // Registrar auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'validar',
            modulo: 'recompensas',
            registroId: id,
            registroTipo: 'ResgateRecompensa',
            descricao: `Validado resgate de recompensa - Código: ${resgate.codigo}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'media'
        });

        res.json({
            success: true,
            message: 'Resgate validado com sucesso',
            data: resgate
        });
    } catch (error) {
        console.error('❌ Erro ao validar resgate:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao validar resgate',
            error: error.message
        });
    }
};

// Cancelar resgate
exports.cancelarResgate = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const adminId = req.admin._id || req.admin.id;

        if (!motivo) {
            return res.status(400).json({
                success: false,
                message: 'Motivo do cancelamento é obrigatório'
            });
        }

        const resgate = await ResgateRecompensa.findById(id);

        if (!resgate) {
            return res.status(404).json({
                success: false,
                message: 'Resgate não encontrado'
            });
        }

        await resgate.cancelar(adminId, motivo);

        // Registrar auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'editar',
            modulo: 'recompensas',
            registroId: id,
            registroTipo: 'ResgateRecompensa',
            dadosNovos: { motivo },
            descricao: `Cancelado resgate - Código: ${resgate.codigo} - Motivo: ${motivo}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'alta'
        });

        res.json({
            success: true,
            message: 'Resgate cancelado com sucesso',
            data: resgate
        });
    } catch (error) {
        console.error('❌ Erro ao cancelar resgate:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao cancelar resgate',
            error: error.message
        });
    }
};

// Estatísticas de resgates
exports.estatisticasResgates = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;

        const stats = await ResgateRecompensa.getEstatisticas(parseInt(periodo));

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas de resgates',
            error: error.message
        });
    }
};

// Criar nova recompensa
exports.criarRecompensa = async (req, res) => {
    try {
        const adminId = req.admin._id || req.admin.id;

        const recompensa = await Recompensa.create(req.body);

        // Registrar auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'criar',
            modulo: 'recompensas',
            registroId: recompensa._id,
            registroTipo: 'Recompensa',
            dadosNovos: req.body,
            descricao: `Criada recompensa: ${recompensa.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'media'
        });

        res.status(201).json({
            success: true,
            message: 'Recompensa criada com sucesso',
            data: recompensa
        });
    } catch (error) {
        console.error('❌ Erro ao criar recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar recompensa',
            error: error.message
        });
    }
};

// Editar recompensa
exports.editarRecompensa = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id || req.admin.id;

        const recompensaAntiga = await Recompensa.findById(id).lean();

        if (!recompensaAntiga) {
            return res.status(404).json({
                success: false,
                message: 'Recompensa não encontrada'
            });
        }

        const recompensa = await Recompensa.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        // Registrar auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'editar',
            modulo: 'recompensas',
            registroId: id,
            registroTipo: 'Recompensa',
            dadosAnteriores: recompensaAntiga,
            dadosNovos: req.body,
            descricao: `Editada recompensa: ${recompensa.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'media'
        });

        res.json({
            success: true,
            message: 'Recompensa atualizada com sucesso',
            data: recompensa
        });
    } catch (error) {
        console.error('❌ Erro ao editar recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao editar recompensa',
            error: error.message
        });
    }
};

// Atualizar estoque
exports.atualizarEstoque = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidadeDisponivel, disponivel } = req.body;
        const adminId = req.admin._id || req.admin.id;

        const recompensa = await Recompensa.findById(id);

        if (!recompensa) {
            return res.status(404).json({
                success: false,
                message: 'Recompensa não encontrada'
            });
        }

        const dadosAnteriores = {
            quantidadeDisponivel: recompensa.quantidadeDisponivel,
            disponivel: recompensa.disponivel
        };

        if (quantidadeDisponivel !== undefined) {
            recompensa.quantidadeDisponivel = quantidadeDisponivel;
        }

        if (disponivel !== undefined) {
            recompensa.disponivel = disponivel;
        }

        await recompensa.save();

        // Registrar auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'editar',
            modulo: 'recompensas',
            registroId: id,
            registroTipo: 'Recompensa',
            dadosAnteriores,
            dadosNovos: { quantidadeDisponivel, disponivel },
            descricao: `Atualizado estoque da recompensa: ${recompensa.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'media'
        });

        res.json({
            success: true,
            message: 'Estoque atualizado com sucesso',
            data: recompensa
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar estoque:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar estoque',
            error: error.message
        });
    }
};