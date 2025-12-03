const Denuncia = require('../models/Denuncia');

exports.listarTodas = async (req, res) => {
    try {
        const {
            status,
            tipo,
            prioridade,
            limite = 50,
            pagina = 1,
            dataInicio,
            dataFim
        } = req.query;

        const filtro = {};

        if (status) filtro.status = status;
        if (tipo) filtro.tipo = tipo;
        if (prioridade) filtro.prioridade = prioridade;

        if (dataInicio || dataFim) {
            filtro.createdAt = {};
            if (dataInicio) filtro.createdAt.$gte = new Date(dataInicio);
            if (dataFim) filtro.createdAt.$lte = new Date(dataFim);
        }

        const skip = (parseInt(pagina) - 1) * parseInt(limite);

        const [denuncias, total] = await Promise.all([
            Denuncia.find(filtro)
                .populate('denunciante', 'nome email')
                .populate('denunciado', 'nome email')
                .populate('materialRelacionado', 'tipo quantidade')
                .populate('pontoColetaRelacionado', 'nome endereco')
                .populate('analisadoPor', 'nome email')
                .sort({ prioridade: -1, createdAt: -1 })
                .limit(parseInt(limite))
                .skip(skip)
                .lean(),
            Denuncia.countDocuments(filtro)
        ]);

        res.json({
            success: true,
            data: {
                denuncias,
                total,
                pagina: parseInt(pagina),
                totalPaginas: Math.ceil(total / parseInt(limite))
            }
        });
    } catch (error) {
        console.error('Erro ao listar denúncias:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar denúncias',
            error: error.message
        });
    }
};

exports.listarPendentes = async (req, res) => {
    try {
        const denuncias = await Denuncia.find({ status: 'pendente' })
            .populate('denunciante', 'nome email')
            .populate('denunciado', 'nome email')
            .populate('materialRelacionado', 'tipo quantidade')
            .populate('pontoColetaRelacionado', 'nome endereco')
            .sort({ prioridade: -1, createdAt: 1 });

        res.json({
            success: true,
            count: denuncias.length,
            data: denuncias
        });
    } catch (error) {
        console.error('Erro ao listar denúncias pendentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar denúncias pendentes',
            error: error.message
        });
    }
};

exports.listarUrgentes = async (req, res) => {
    try {
        const denuncias = await Denuncia.getPendentesUrgentes();

        res.json({
            success: true,
            count: denuncias.length,
            data: denuncias
        });
    } catch (error) {
        console.error('Erro ao listar denúncias urgentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar denúncias urgentes',
            error: error.message
        });
    }
};

exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const denuncia = await Denuncia.findById(id)
            .populate('denunciante', 'nome email pontos')
            .populate('denunciado', 'nome email pontos')
            .populate('materialRelacionado')
            .populate('pontoColetaRelacionado')
            .populate('analisadoPor', 'nome email')
            .populate('comentariosInternos.admin', 'nome email')
            .populate('acoesTomadas.executadaPor', 'nome email');

        if (!denuncia) {
            return res.status(404).json({
                success: false,
                message: 'Denúncia não encontrada'
            });
        }

        res.json({
            success: true,
            data: denuncia
        });
    } catch (error) {
        console.error('Erro ao buscar denúncia:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar denúncia',
            error: error.message
        });
    }
};

exports.iniciarAnalise = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id || req.admin.id;

        const denuncia = await Denuncia.findById(id);

        if (!denuncia) {
            return res.status(404).json({
                success: false,
                message: 'Denúncia não encontrada'
            });
        }

        if (denuncia.status !== 'pendente') {
            return res.status(400).json({
                success: false,
                message: 'Denúncia já está em análise ou foi resolvida'
            });
        }

        await denuncia.iniciarAnalise(adminId);

        res.json({
            success: true,
            message: 'Análise iniciada com sucesso',
            data: denuncia
        });
    } catch (error) {
        console.error('Erro ao iniciar análise:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao iniciar análise',
            error: error.message
        });
    }
};

exports.tomarDecisao = async (req, res) => {
    try {
        const { id } = req.params;
        const { decisao, justificativa } = req.body;
        const adminId = req.admin._id || req.admin.id;

        if (!decisao || !justificativa) {
            return res.status(400).json({
                success: false,
                message: 'Decisão e justificativa são obrigatórios'
            });
        }

        const denuncia = await Denuncia.findById(id);

        if (!denuncia) {
            return res.status(404).json({
                success: false,
                message: 'Denúncia não encontrada'
            });
        }

        await denuncia.tomarDecisao(decisao, justificativa, adminId);

        res.json({
            success: true,
            message: 'Decisão registrada com sucesso',
            data: denuncia
        });
    } catch (error) {
        console.error('Erro ao tomar decisão:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao tomar decisão',
            error: error.message
        });
    }
};

exports.adicionarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { texto } = req.body;
        const adminId = req.admin._id || req.admin.id;

        if (!texto) {
            return res.status(400).json({
                success: false,
                message: 'Texto do comentário é obrigatório'
            });
        }

        const denuncia = await Denuncia.findById(id);

        if (!denuncia) {
            return res.status(404).json({
                success: false,
                message: 'Denúncia não encontrada'
            });
        }

        await denuncia.adicionarComentarioInterno(adminId, texto);

        res.json({
            success: true,
            message: 'Comentário adicionado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao adicionar comentário',
            error: error.message
        });
    }
};

exports.registrarAcao = async (req, res) => {
    try {
        const { id } = req.params;
        const { acao, detalhes } = req.body;
        const adminId = req.admin._id || req.admin.id;

        const denuncia = await Denuncia.findById(id);

        if (!denuncia) {
            return res.status(404).json({
                success: false,
                message: 'Denúncia não encontrada'
            });
        }

        await denuncia.registrarAcao(acao, detalhes, adminId);

        res.json({
            success: true,
            message: 'Ação registrada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao registrar ação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar ação',
            error: error.message
        });
    }
};

exports.estatisticas = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;

        const estatisticas = await Denuncia.getEstatisticas(parseInt(periodo));

        res.json({
            success: true,
            data: estatisticas
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            error: error.message
        });
    }
};