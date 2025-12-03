const mongoose = require('mongoose');

const resgateRecompensaSchema = new mongoose.Schema({
    // Usuário que resgatou
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Recompensa resgatada
    recompensa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recompensa',
        required: true,
        index: true
    },

    // Pontos utilizados
    pontosUtilizados: {
        type: Number,
        required: true
    },

    // Código único do resgate
    codigo: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Status do resgate
    status: {
        type: String,
        enum: ['pendente', 'validado', 'utilizado', 'expirado', 'cancelado'],
        default: 'pendente',
        index: true
    },

    // Validação administrativa
    validadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    dataValidacao: Date,

    // Utilização
    utilizadoEm: String, // Local onde foi utilizado
    dataUtilizacao: Date,

    // Expiração
    dataExpiracao: Date,

    // QR Code (se aplicável)
    qrCode: String,

    // Observações
    observacoes: String,

    // Informações do parceiro
    parceiro: {
        nome: String,
        contato: String,
        validadoPor: String // Pessoa que validou no estabelecimento
    },

    // Histórico de mudanças de status
    historico: [{
        statusAnterior: String,
        statusNovo: String,
        alteradoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        motivo: String,
        data: {
            type: Date,
            default: Date.now
        }
    }],

    // Metadata
    ip: String,
    userAgent: String

}, {
    timestamps: true
});

// Índices compostos
resgateRecompensaSchema.index({ usuario: 1, status: 1, createdAt: -1 });
resgateRecompensaSchema.index({ recompensa: 1, status: 1 });
resgateRecompensaSchema.index({ status: 1, dataExpiracao: 1 });

// Gerar código único
resgateRecompensaSchema.pre('save', function(next) {
    if (this.isNew && !this.codigo) {
        this.codigo = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    next();
});

// Método para validar resgate
resgateRecompensaSchema.methods.validar = async function(adminId, observacoes) {
    const statusAnterior = this.status;

    this.status = 'validado';
    this.validadoPor = adminId;
    this.dataValidacao = new Date();
    if (observacoes) this.observacoes = observacoes;

    this.historico.push({
        statusAnterior,
        statusNovo: 'validado',
        alteradoPor: adminId,
        motivo: 'Validado pelo administrador',
        data: new Date()
    });

    await this.save();

    // Notificar usuário
    const Notificacao = mongoose.model('Notificacao');
    const recompensa = await mongoose.model('Recompensa').findById(this.recompensa);

    await Notificacao.create({
        usuario: this.usuario,
        tipo: 'recompensa_resgatada',
        titulo: '✅ Recompensa Validada!',
        mensagem: `Sua recompensa "${recompensa.nome}" foi validada! Código: ${this.codigo}`,
        prioridade: 'alta',
        referencia: {
            tipo: 'recompensa',
            id: this._id
        },
        metadata: {
            codigo: this.codigo,
            recompensaNome: recompensa.nome
        }
    });

    return this;
};

// Método para marcar como utilizado
resgateRecompensaSchema.methods.marcarUtilizado = async function(local, validadoPor) {
    const statusAnterior = this.status;

    this.status = 'utilizado';
    this.dataUtilizacao = new Date();
    this.utilizadoEm = local;

    if (validadoPor) {
        this.parceiro = {
            ...this.parceiro,
            validadoPor
        };
    }

    this.historico.push({
        statusAnterior,
        statusNovo: 'utilizado',
        motivo: `Utilizado em: ${local}`,
        data: new Date()
    });

    await this.save();
    return this;
};

// Método para cancelar resgate
resgateRecompensaSchema.methods.cancelar = async function(adminId, motivo) {
    const statusAnterior = this.status;

    if (this.status === 'utilizado') {
        throw new Error('Não é possível cancelar um resgate já utilizado');
    }

    this.status = 'cancelado';

    this.historico.push({
        statusAnterior,
        statusNovo: 'cancelado',
        alteradoPor: adminId,
        motivo,
        data: new Date()
    });

    await this.save();

    // Devolver pontos ao usuário
    const User = mongoose.model('User');
    const usuario = await User.findById(this.usuario);
    usuario.pontosUtilizados = Math.max(0, usuario.pontosUtilizados - this.pontosUtilizados);
    await usuario.save();

    // Registrar transação de estorno
    const TransacaoPontos = mongoose.model('TransacaoPontos');
    await TransacaoPontos.create({
        usuario: this.usuario,
        tipo: 'ganho',
        pontos: this.pontosUtilizados,
        saldoAnterior: usuario.pontos - this.pontosUtilizados,
        saldoAtual: usuario.pontos,
        descricao: `Estorno de resgate cancelado: ${this.codigo}`,
        origem: {
            tipo: 'recompensa',
            id: this._id
        },
        processadoPor: adminId,
        status: 'concluida',
        metadata: {
            motivoCancelamento: motivo
        }
    });

    // Notificar usuário
    const Notificacao = mongoose.model('Notificacao');
    await Notificacao.create({
        usuario: this.usuario,
        tipo: 'sistema',
        titulo: '🔄 Resgate Cancelado',
        mensagem: `Seu resgate foi cancelado e ${this.pontosUtilizados} pontos foram devolvidos.`,
        prioridade: 'alta',
        referencia: {
            tipo: 'recompensa',
            id: this._id
        }
    });

    return this;
};

// Static para expirar resgates automaticamente
resgateRecompensaSchema.statics.expirarResgates = async function() {
    const agora = new Date();

    const resgatosExpirados = await this.updateMany(
        {
            status: { $in: ['pendente', 'validado'] },
            dataExpiracao: { $lt: agora }
        },
        {
            status: 'expirado',
            $push: {
                historico: {
                    statusAnterior: 'validado',
                    statusNovo: 'expirado',
                    motivo: 'Prazo de validade expirado',
                    data: agora
                }
            }
        }
    );

    return resgatosExpirados.modifiedCount;
};

// Static para obter resgates pendentes de validação
resgateRecompensaSchema.statics.getPendentesValidacao = async function() {
    return this.find({ status: 'pendente' })
        .populate('usuario', 'nome email pontos')
        .populate('recompensa', 'nome descricao pontosNecessarios tipo')
        .sort({ createdAt: 1 });
};

// Static para estatísticas
resgateRecompensaSchema.statics.getEstatisticas = async function(periodo = 30) {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    const [
        totalResgates,
        resgatesPorStatus,
        resgatesPorRecompensa,
        pontosUtilizadosTotal,
        taxaUtilizacao
    ] = await Promise.all([
        this.countDocuments({ createdAt: { $gte: dataInicio } }),

        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),

        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: {
                    _id: '$recompensa',
                    count: { $sum: 1 },
                    pontosTotal: { $sum: '$pontosUtilizados' }
                } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),

        this.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: { _id: null, total: { $sum: '$pontosUtilizados' } } }
        ]),

        (async () => {
            const validados = await this.countDocuments({
                createdAt: { $gte: dataInicio },
                status: 'validado'
            });
            const utilizados = await this.countDocuments({
                createdAt: { $gte: dataInicio },
                status: 'utilizado'
            });
            return validados > 0 ? ((utilizados / validados) * 100).toFixed(1) : 0;
        })()
    ]);

    // Popular nomes das recompensas
    const recompensaIds = resgatesPorRecompensa.map(r => r._id);
    const Recompensa = mongoose.model('Recompensa');
    const recompensas = await Recompensa.find({ _id: { $in: recompensaIds } }).select('nome');

    const resgatesPorRecompensaComNomes = resgatesPorRecompensa.map(r => {
        const recompensa = recompensas.find(rec => rec._id.equals(r._id));
        return {
            recompensa: recompensa ? recompensa.nome : 'Desconhecida',
            count: r.count,
            pontosTotal: r.pontosTotal
        };
    });

    return {
        totalResgates,
        resgatesPorStatus,
        resgatesPorRecompensa: resgatesPorRecompensaComNomes,
        pontosUtilizadosTotal: pontosUtilizadosTotal[0]?.total || 0,
        taxaUtilizacao: parseFloat(taxaUtilizacao)
    };
};

const ResgateRecompensa = mongoose.model('ResgateRecompensa', resgateRecompensaSchema);

module.exports = ResgateRecompensa;