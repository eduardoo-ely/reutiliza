const mongoose = require('mongoose');

const denunciaSchema = new mongoose.Schema({
    // Quem denuncia
    denunciante: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Quem/o que está sendo denunciado
    denunciado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Tipo de denúncia
    tipo: {
        type: String,
        required: true,
        enum: [
            'material_invalido',
            'material_falso',
            'ponto_inexistente',
            'ponto_fechado',
            'fraude_pontos',
            'comportamento_inadequado',
            'spam',
            'outro'
        ],
        index: true
    },

    // Categoria (subcategoria do tipo)
    categoria: {
        type: String,
        enum: ['grave', 'moderada', 'leve']
    },

    // Descrição detalhada
    descricao: {
        type: String,
        required: true,
        maxlength: 1000
    },

    // Evidências (fotos, screenshots, etc)
    evidencias: [{
        tipo: {
            type: String,
            enum: ['foto', 'screenshot', 'documento', 'outro']
        },
        url: String,
        descricao: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Status da denúncia
    status: {
        type: String,
        enum: ['pendente', 'em_analise', 'procedente', 'improcedente', 'arquivada'],
        default: 'pendente',
        index: true
    },

    // Prioridade
    prioridade: {
        type: String,
        enum: ['baixa', 'media', 'alta', 'urgente'],
        default: 'media',
        index: true
    },

    // Relacionamentos
    materialRelacionado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialReciclado'
    },

    pontoColetaRelacionado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PontoColeta'
    },

    // Análise administrativa
    analisadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    dataAnalise: Date,

    dataInicio: {
        type: Date,
        default: Date.now
    },

    // Decisão final
    decisao: {
        type: String,
        enum: ['procedente', 'parcialmente_procedente', 'improcedente', 'arquivada']
    },

    justificativaDecisao: {
        type: String,
        maxlength: 1000
    },

    // Ações tomadas
    acoesTomadas: [{
        acao: String, // 'suspensao_usuario', 'remocao_material', 'advertencia', 'nenhuma'
        detalhes: String,
        executadaPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        dataExecucao: {
            type: Date,
            default: Date.now
        }
    }],

    // Comentários internos (apenas admins)
    comentariosInternos: [{
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        texto: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Resposta ao denunciante
    respostaDenunciante: {
        texto: String,
        enviadaEm: Date,
        enviadaPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Metadata
    ip: String,
    userAgent: String

}, {
    timestamps: true
});

// Índices compostos para queries otimizadas
denunciaSchema.index({ status: 1, prioridade: -1, createdAt: -1 });
denunciaSchema.index({ denunciante: 1, createdAt: -1 });
denunciaSchema.index({ denunciado: 1, status: 1 });

// Método para iniciar análise
denunciaSchema.methods.iniciarAnalise = async function(adminId) {
    this.status = 'em_analise';
    this.analisadoPor = adminId;
    this.dataAnalise = new Date();
    await this.save();

    // Criar notificação para o denunciante
    const Notificacao = mongoose.model('Notificacao');
    await Notificacao.create({
        usuario: this.denunciante,
        tipo: 'sistema',
        titulo: '🔍 Denúncia em Análise',
        mensagem: 'Sua denúncia está sendo analisada por nossa equipe.',
        prioridade: 'normal',
        referencia: {
            tipo: 'denuncia',
            id: this._id
        }
    });

    return this;
};

// Método para tomar decisão
denunciaSchema.methods.tomarDecisao = async function(decisao, justificativa, adminId) {
    this.status = decisao === 'arquivada' ? 'arquivada' :
        decisao === 'procedente' || decisao === 'parcialmente_procedente' ? 'procedente' : 'improcedente';
    this.decisao = decisao;
    this.justificativaDecisao = justificativa;
    this.analisadoPor = adminId;
    await this.save();

    // Notificar denunciante
    const Notificacao = mongoose.model('Notificacao');

    let mensagem = '';
    let icone = '';

    switch(decisao) {
        case 'procedente':
            mensagem = 'Sua denúncia foi considerada procedente. Medidas foram tomadas.';
            icone = '✅';
            break;
        case 'parcialmente_procedente':
            mensagem = 'Sua denúncia foi parcialmente procedente. Algumas medidas foram tomadas.';
            icone = '⚖️';
            break;
        case 'improcedente':
            mensagem = 'Sua denúncia foi considerada improcedente após análise.';
            icone = '❌';
            break;
        case 'arquivada':
            mensagem = 'Sua denúncia foi arquivada.';
            icone = '📁';
            break;
    }

    await Notificacao.create({
        usuario: this.denunciante,
        tipo: 'sistema',
        titulo: `${icone} Denúncia Analisada`,
        mensagem,
        prioridade: 'alta',
        referencia: {
            tipo: 'denuncia',
            id: this._id
        }
    });

    return this;
};

// Método para adicionar comentário interno
denunciaSchema.methods.adicionarComentarioInterno = async function(adminId, texto) {
    this.comentariosInternos.push({
        admin: adminId,
        texto,
        createdAt: new Date()
    });
    await this.save();
    return this;
};

// Método para registrar ação tomada
denunciaSchema.methods.registrarAcao = async function(acao, detalhes, adminId) {
    this.acoesTomadas.push({
        acao,
        detalhes,
        executadaPor: adminId,
        dataExecucao: new Date()
    });
    await this.save();
    return this;
};

// Static para obter estatísticas
denunciaSchema.statics.getEstatisticas = async function(periodo = 30) {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    const [total, porStatus, porTipo, porPrioridade] = await Promise.all([
        this.countDocuments({ createdAt: { $gte: dataInicio } }),
        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: { _id: '$tipo', count: { $sum: 1 } } }
        ]),
        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: { _id: '$prioridade', count: { $sum: 1 } } }
        ])
    ]);

    // Tempo médio de resolução
    const resolvidas = await this.find({
        createdAt: { $gte: dataInicio },
        status: { $in: ['procedente', 'improcedente'] }
    });

    let tempoMedioResolucao = 0;
    if (resolvidas.length > 0) {
        const tempos = resolvidas.map(d => {
            if (d.dataAnalise) {
                return (d.dataAnalise - d.createdAt) / (1000 * 60 * 60); // horas
            }
            return 0;
        });
        tempoMedioResolucao = tempos.reduce((a, b) => a + b, 0) / resolvidas.length;
    }

    return {
        total,
        porStatus,
        porTipo,
        porPrioridade,
        tempoMedioResolucaoHoras: tempoMedioResolucao.toFixed(1)
    };
};

// Static para denúncias pendentes de alta prioridade
denunciaSchema.statics.getPendentesUrgentes = async function() {
    return this.find({
        status: 'pendente',
        prioridade: { $in: ['alta', 'urgente'] }
    })
        .populate('denunciante', 'nome email')
        .populate('denunciado', 'nome email')
        .populate('materialRelacionado', 'tipo quantidade')
        .populate('pontoColetaRelacionado', 'nome endereco')
        .sort({ prioridade: -1, createdAt: 1 });
};

const Denuncia = mongoose.model('Denuncia', denunciaSchema);

module.exports = Denuncia;