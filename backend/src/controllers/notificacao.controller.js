const Notificacao = require('../models/Notificacao');

// Obter todas as notificações do usuário
const getNotificacoesUsuario = async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const { limite = 50, pagina = 1, apenasNaoLidas = false } = req.query;

        const filtro = { usuario: usuarioId };
        if (apenasNaoLidas === 'true') {
            filtro.lida = false;
        }

        const skip = (parseInt(pagina) - 1) * parseInt(limite);

        const [notificacoes, total, naoLidas] = await Promise.all([
            Notificacao.find(filtro)
                .sort({ createdAt: -1 })
                .limit(parseInt(limite))
                .skip(skip)
                .lean(),
            Notificacao.countDocuments(filtro),
            Notificacao.countDocuments({ usuario: usuarioId, lida: false })
        ]);

        res.json({
            success: true,
            data: {
                notificacoes,
                total,
                naoLidas,
                pagina: parseInt(pagina),
                totalPaginas: Math.ceil(total / parseInt(limite))
            }
        });
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar notificações',
            error: error.message
        });
    }
};

// Marcar notificação como lida
const marcarComoLida = async (req, res) => {
    try {
        const { id } = req.params;

        const notificacao = await Notificacao.findById(id);

        if (!notificacao) {
            return res.status(404).json({
                success: false,
                message: 'Notificação não encontrada'
            });
        }

        await notificacao.marcarComoLida();

        res.json({
            success: true,
            message: 'Notificação marcada como lida',
            data: notificacao
        });
    } catch (error) {
        console.error('Erro ao marcar notificação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar notificação como lida',
            error: error.message
        });
    }
};

// Marcar todas como lidas
const marcarTodasComoLidas = async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const resultado = await Notificacao.updateMany(
            { usuario: usuarioId, lida: false },
            { lida: true, dataLeitura: new Date() }
        );

        res.json({
            success: true,
            message: `${resultado.modifiedCount} notificações marcadas como lidas`,
            data: { modificadas: resultado.modifiedCount }
        });
    } catch (error) {
        console.error('Erro ao marcar todas notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar todas notificações como lidas',
            error: error.message
        });
    }
};

// Deletar notificação
const deletarNotificacao = async (req, res) => {
    try {
        const { id } = req.params;

        const notificacao = await Notificacao.findByIdAndDelete(id);

        if (!notificacao) {
            return res.status(404).json({
                success: false,
                message: 'Notificação não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Notificação deletada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar notificação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar notificação',
            error: error.message
        });
    }
};

// Limpar notificações antigas
const limparAntigas = async (req, res) => {
    try {
        const { diasAntigos = 30 } = req.query;

        const resultado = await Notificacao.limparAntigas(parseInt(diasAntigos));

        res.json({
            success: true,
            message: `${resultado.deletedCount} notificações antigas removidas`,
            data: { removidas: resultado.deletedCount }
        });
    } catch (error) {
        console.error('Erro ao limpar notificações antigas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao limpar notificações antigas',
            error: error.message
        });
    }
};

// Criar notificação (admin)
const criarNotificacao = async (req, res) => {
    try {
        const {
            usuario,
            tipo,
            titulo,
            mensagem,
            prioridade,
            referencia,
            metadata
        } = req.body;

        if (!usuario || !tipo || !titulo || !mensagem) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: usuario, tipo, titulo, mensagem'
            });
        }

        const notificacao = await Notificacao.create({
            usuario,
            tipo,
            titulo,
            mensagem,
            prioridade: prioridade || 'normal',
            referencia,
            metadata
        });

        res.status(201).json({
            success: true,
            message: 'Notificação criada com sucesso',
            data: notificacao
        });
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar notificação',
            error: error.message
        });
    }
};

module.exports = {
    getNotificacoesUsuario,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    limparAntigas,
    criarNotificacao
};