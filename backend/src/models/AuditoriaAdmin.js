const mongoose = require('mongoose');

const auditoriaAdminSchema = new mongoose.Schema({
    // Admin que executou a ação
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Tipo de ação
    acao: {
        type: String,
        required: true,
        enum: [
            'criar',
            'editar',
            'deletar',
            'validar',
            'rejeitar',
            'ativar',
            'desativar',
            'suspender',
            'reativar',
            'alterar_permissoes',
            'login',
            'logout',
            'visualizar',
            'exportar',
            'outro'
        ],
        index: true
    },

    // Módulo afetado
    modulo: {
        type: String,
        required: true,
        enum: [
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
        ],
        index: true
    },

    // ID do registro afetado
    registroId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },

    // Tipo do registro (ex: 'PontoColeta', 'User', etc)
    registroTipo: String,

    // Dados ANTES da alteração (para rollback)
    dadosAnteriores: {
        type: mongoose.Schema.Types.Mixed,
        select: false // Não retornar por padrão (pode ser grande)
    },

    // Dados APÓS a alteração
    dadosNovos: {
        type: mongoose.Schema.Types.Mixed,
        select: false
    },

    // Descrição da ação
    descricao: {
        type: String,
        required: true
    },

    // Metadados técnicos
    ip: {
        type: String,
        required: true
    },

    userAgent: String,

    // Resultado da ação
    resultado: {
        type: String,
        enum: ['sucesso', 'falha', 'parcial'],
        default: 'sucesso'
    },

    // Mensagem de erro (se houver)
    erro: String,

    // Nível de severidade
    severidade: {
        type: String,
        enum: ['baixa', 'media', 'alta', 'critica'],
        default: 'media'
    },

    // Tags para busca
    tags: [String],

    // Duração da operação (ms)
    duracao: Number

}, {
    timestamps: true
});

// Índices compostos
auditoriaAdminSchema.index({ admin: 1, createdAt: -1 });
auditoriaAdminSchema.index({ modulo: 1, acao: 1, createdAt: -1 });
auditoriaAdminSchema.index({ registroId: 1, createdAt: -1 });
auditoriaAdminSchema.index({ createdAt: -1 });

// TTL Index - Manter auditoria por 2 anos
auditoriaAdminSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 anos

// Static para registrar ação
auditoriaAdminSchema.statics.registrar = async function(dados) {
    const {
        admin,
        acao,
        modulo,
        registroId,
        registroTipo,
        dadosAnteriores,
        dadosNovos,
        descricao,
        ip,
        userAgent,
        resultado = 'sucesso',
        erro,
        severidade = 'media',
        tags = [],
        duracao
    } = dados;

    try {
        await this.create({
            admin,
            acao,
            modulo,
            registroId,
            registroTipo,
            dadosAnteriores,
            dadosNovos,
            descricao,
            ip,
            userAgent,
            resultado,
            erro,
            severidade,
            tags,
            duracao
        });
    } catch (err) {
        console.error('❌ Erro ao registrar auditoria:', err);
        // Não falhar a operação principal por erro na auditoria
    }
};

// Static para obter ações de um admin
auditoriaAdminSchema.statics.getAcoesAdmin = async function(adminId, opcoes = {}) {
    const {
        limite = 50,
        pagina = 1,
        modulo,
        acao,
        dataInicio,
        dataFim
    } = opcoes;

    const filtro = { admin: adminId };

    if (modulo) filtro.modulo = modulo;
    if (acao) filtro.acao = acao;

    if (dataInicio || dataFim) {
        filtro.createdAt = {};
        if (dataInicio) filtro.createdAt.$gte = new Date(dataInicio);
        if (dataFim) filtro.createdAt.$lte = new Date(dataFim);
    }

    const skip = (pagina - 1) * limite;

    const [logs, total] = await Promise.all([
        this.find(filtro)
            .sort({ createdAt: -1 })
            .limit(limite)
            .skip(skip)
            .populate('admin', 'nome email')
            .lean(),
        this.countDocuments(filtro)
    ]);

    return {
        logs,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite)
    };
};

// Static para obter histórico de um registro
auditoriaAdminSchema.statics.getHistoricoRegistro = async function(registroId) {
    return this.find({ registroId })
        .sort({ createdAt: -1 })
        .populate('admin', 'nome email')
        .select('+dadosAnteriores +dadosNovos')
        .lean();
};

// Static para estatísticas
auditoriaAdminSchema.statics.getEstatisticas = async function(periodo = 30) {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    const [
        totalAcoes,
        acoesPorAdmin,
        acoesPorModulo,
        acoesPorTipo,
        acoesCriticas
    ] = await Promise.all([
        this.countDocuments({ createdAt: { $gte: dataInicio } }),

        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: { _id: '$admin', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),

        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: { _id: '$modulo', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),

        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: { _id: '$acao', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),

        this.countDocuments({
            createdAt: { $gte: dataInicio },
            severidade: { $in: ['alta', 'critica'] }
        })
    ]);

    // Popular nomes dos admins
    const adminIds = acoesPorAdmin.map(a => a._id);
    const User = mongoose.model('User');
    const admins = await User.find({ _id: { $in: adminIds } }).select('nome email');

    const acoesPorAdminComNomes = acoesPorAdmin.map(a => {
        const admin = admins.find(u => u._id.equals(a._id));
        return {
            admin: admin ? { nome: admin.nome, email: admin.email } : null,
            count: a.count
        };
    });

    return {
        totalAcoes,
        acoesPorAdmin: acoesPorAdminComNomes,
        acoesPorModulo,
        acoesPorTipo,
        acoesCriticas
    };
};

// Static para detectar atividades suspeitas
auditoriaAdminSchema.statics.detectarAtividadesSuspeitas = async function(adminId, periodo = 1) {
    const dataInicio = new Date();
    dataInicio.setHours(dataInicio.getHours() - periodo);

    const acoes = await this.find({
        admin: adminId,
        createdAt: { $gte: dataInicio }
    });

    const alertas = [];

    // Muitas ações em pouco tempo
    if (acoes.length > 100) {
        alertas.push({
            tipo: 'volume_alto',
            mensagem: `${acoes.length} ações em ${periodo} hora(s)`,
            severidade: 'alta'
        });
    }

    // Muitas ações de deleção
    const delecoes = acoes.filter(a => a.acao === 'deletar');
    if (delecoes.length > 10) {
        alertas.push({
            tipo: 'delecoes_excessivas',
            mensagem: `${delecoes.length} deleções em ${periodo} hora(s)`,
            severidade: 'critica'
        });
    }

    // Muitas alterações de permissões
    const permissoes = acoes.filter(a => a.acao === 'alterar_permissoes');
    if (permissoes.length > 5) {
        alertas.push({
            tipo: 'alteracoes_permissoes',
            mensagem: `${permissoes.length} alterações de permissões em ${periodo} hora(s)`,
            severidade: 'alta'
        });
    }

    // Ações fora do horário comercial (22h - 6h)
    const horaAtual = new Date().getHours();
    if (horaAtual >= 22 || horaAtual <= 6) {
        if (acoes.length > 10) {
            alertas.push({
                tipo: 'atividade_fora_horario',
                mensagem: `${acoes.length} ações fora do horário comercial`,
                severidade: 'media'
            });
        }
    }

    return alertas;
};

const AuditoriaAdmin = mongoose.model('AuditoriaAdmin', auditoriaAdminSchema);

module.exports = AuditoriaAdmin;