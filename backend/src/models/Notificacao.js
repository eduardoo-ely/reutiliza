const mongoose = require('mongoose');

const notificacaoSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        required: true,
        enum: [
            'validacao_aprovada',
            'validacao_rejeitada',
            'validacao_pendente',
            'pontos_ganhos',
            'pontos_gastos',
            'recompensa_disponivel',
            'recompensa_resgatada',
            'sistema'
        ]
    },
    titulo: {
        type: String,
        required: true,
        maxlength: 100
    },
    mensagem: {
        type: String,
        required: true,
        maxlength: 500
    },
    lida: {
        type: Boolean,
        default: false,
        index: true
    },
    dataLeitura: {
        type: Date
    },
    // Referência ao objeto relacionado (material, recompensa, etc)
    referencia: {
        tipo: {
            type: String,
            enum: ['material', 'validacao', 'recompensa', 'transacao', 'outro']
        },
        id: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    // Metadados adicionais
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    // Prioridade da notificação
    prioridade: {
        type: String,
        enum: ['baixa', 'normal', 'alta', 'urgente'],
        default: 'normal'
    },
    // Data de expiração (para notificações temporárias)
    dataExpiracao: {
        type: Date
    }
}, {
    timestamps: true
});

// Índices compostos
notificacaoSchema.index({ usuario: 1, lida: 1, createdAt: -1 });
notificacaoSchema.index({ dataExpiracao: 1 }, { expireAfterSeconds: 0 });

// Método para marcar como lida
notificacaoSchema.methods.marcarComoLida = function() {
    this.lida = true;
    this.dataLeitura = new Date();
    return this.save();
};

// Static para criar notificação de validação
notificacaoSchema.statics.criarNotificacaoValidacao = async function(material, aprovado) {
    const tipo = aprovado ? 'validacao_aprovada' : 'validacao_rejeitada';
    const titulo = aprovado ? '✅ Material Validado!' : '❌ Material Rejeitado';
    const mensagem = aprovado
        ? `Seu material (${material.tipo} - ${material.quantidade}${material.unidade}) foi validado e você ganhou ${material.pontos} pontos!`
        : `Seu material (${material.tipo}) foi rejeitado. Entre em contato para mais informações.`;

    return this.create({
        usuario: material.usuario,
        tipo,
        titulo,
        mensagem,
        referencia: {
            tipo: 'material',
            id: material._id
        },
        prioridade: aprovado ? 'normal' : 'alta',
        metadata: {
            pontos: material.pontos,
            materialTipo: material.tipo
        }
    });
};

// Static para limpar notificações antigas
notificacaoSchema.statics.limparAntigas = async function(diasAntigos = 30) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasAntigos);

    return this.deleteMany({
        lida: true,
        dataLeitura: { $lt: dataLimite }
    });
};

const Notificacao = mongoose.model('Notificacao', notificacaoSchema);

module.exports = Notificacao;