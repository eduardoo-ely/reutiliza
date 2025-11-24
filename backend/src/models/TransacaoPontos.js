const mongoose = require('mongoose');

const transacaoPontosSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        required: true,
        enum: ['ganho', 'gasto', 'ajuste_manual', 'bonus', 'expiracao'],
        index: true
    },
    pontos: {
        type: Number,
        required: true
    },
    saldoAnterior: {
        type: Number,
        required: true
    },
    saldoAtual: {
        type: Number,
        required: true
    },
    descricao: {
        type: String,
        required: true,
        maxlength: 300
    },
    // Referência ao que gerou a transação
    origem: {
        tipo: {
            type: String,
            enum: ['material', 'recompensa', 'validacao', 'ajuste_admin', 'bonus_cadastro', 'outro']
        },
        id: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    // Administrador responsável (para ajustes manuais)
    processadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Metadados adicionais
    metadata: {
        materialTipo: String,
        recompensaNome: String,
        observacoes: String
    },
    // Status da transação
    status: {
        type: String,
        enum: ['pendente', 'concluida', 'cancelada', 'estornada'],
        default: 'concluida',
        index: true
    },
    // Data de processamento
    dataProcessamento: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices compostos
transacaoPontosSchema.index({ usuario: 1, tipo: 1, createdAt: -1 });
transacaoPontosSchema.index({ 'origem.tipo': 1, 'origem.id': 1 });

// Método para estornar transação
transacaoPontosSchema.methods.estornar = async function(admin) {
    if (this.status === 'estornada') {
        throw new Error('Transação já foi estornada');
    }

    const User = mongoose.model('User');
    const usuario = await User.findById(this.usuario);

    // Criar transação de estorno
    const estorno = new this.constructor({
        usuario: this.usuario,
        tipo: this.tipo === 'ganho' ? 'gasto' : 'ganho',
        pontos: this.pontos,
        saldoAnterior: usuario.pontos,
        saldoAtual: usuario.pontos + (this.tipo === 'ganho' ? -this.pontos : this.pontos),
        descricao: `Estorno: ${this.descricao}`,
        origem: this.origem,
        processadoPor: admin,
        status: 'concluida',
        metadata: {
            transacaoOriginal: this._id,
            ...this.metadata
        }
    });

    this.status = 'estornada';
    await this.save();
    await estorno.save();

    // Atualizar saldo do usuário
    usuario.pontos = estorno.saldoAtual;
    await usuario.save();

    return estorno;
};

// Static para obter histórico de um usuário
transacaoPontosSchema.statics.getHistoricoUsuario = async function(usuarioId, opcoes = {}) {
    const { limite = 50, pagina = 1, tipo } = opcoes;

    const filtro = { usuario: usuarioId, status: 'concluida' };
    if (tipo) filtro.tipo = tipo;

    const skip = (pagina - 1) * limite;

    const [transacoes, total] = await Promise.all([
        this.find(filtro)
            .sort({ createdAt: -1 })
            .limit(limite)
            .skip(skip)
            .lean(),
        this.countDocuments(filtro)
    ]);

    return {
        transacoes,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite)
    };
};

// Static para estatísticas
transacaoPontosSchema.statics.getEstatisticas = async function(usuarioId, periodo = 30) {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    const resultado = await this.aggregate([
        {
            $match: {
                usuario: mongoose.Types.ObjectId(usuarioId),
                status: 'concluida',
                createdAt: { $gte: dataInicio }
            }
        },
        {
            $group: {
                _id: '$tipo',
                total: { $sum: '$pontos' },
                quantidade: { $sum: 1 }
            }
        }
    ]);

    const estatisticas = {
        totalGanho: 0,
        totalGasto: 0,
        quantidadeGanho: 0,
        quantidadeGasto: 0
    };

    resultado.forEach(item => {
        if (item._id === 'ganho' || item._id === 'bonus') {
            estatisticas.totalGanho += item.total;
            estatisticas.quantidadeGanho += item.quantidade;
        } else if (item._id === 'gasto') {
            estatisticas.totalGasto += item.total;
            estatisticas.quantidadeGasto += item.quantidade;
        }
    });

    return estatisticas;
};

const TransacaoPontos = mongoose.model('TransacaoPontos', transacaoPontosSchema);

module.exports = TransacaoPontos;