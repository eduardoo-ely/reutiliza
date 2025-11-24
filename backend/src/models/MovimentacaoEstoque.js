const mongoose = require('mongoose');

const movimentacaoEstoqueSchema = new mongoose.Schema({
    estoque: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Estoque',
        required: true,
        index: true
    },
    pontoColeta: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PontoColeta',
        required: true,
        index: true
    },
    tipoMaterial: {
        type: String,
        required: true,
        enum: ['Papel', 'Plástico', 'Vidro', 'Metal', 'Eletrônico', 'Óleo', 'Outros']
    },
    tipo: {
        type: String,
        required: true,
        enum: ['entrada', 'saida', 'ajuste', 'transferencia'],
        index: true
    },
    quantidade: {
        type: Number,
        required: true
    },
    quantidadeAnterior: {
        type: Number,
        required: true
    },
    quantidadeAtual: {
        type: Number,
        required: true
    },
    // Referência ao material que originou a movimentação (se aplicável)
    materialReciclado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialReciclado'
    },
    // Motivo da movimentação
    motivo: {
        type: String,
        enum: ['coleta', 'destinacao', 'perda', 'ajuste_inventario', 'transferencia', 'outro'],
        default: 'coleta'
    },
    // Usuário responsável pela movimentação
    responsavel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Destino (para transferências)
    pontoColetaDestino: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PontoColeta'
    },
    observacoes: {
        type: String,
        maxlength: 500
    },
    // Data da movimentação
    dataMovimentacao: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Índices compostos
movimentacaoEstoqueSchema.index({ pontoColeta: 1, tipoMaterial: 1, dataMovimentacao: -1 });
movimentacaoEstoqueSchema.index({ tipo: 1, dataMovimentacao: -1 });

// Static para relatório de movimentações
movimentacaoEstoqueSchema.statics.getRelatorio = async function(filtros = {}) {
    const {
        pontoColetaId,
        tipoMaterial,
        tipo,
        dataInicio,
        dataFim,
        limite = 100,
        pagina = 1
    } = filtros;

    const query = {};

    if (pontoColetaId) query.pontoColeta = pontoColetaId;
    if (tipoMaterial) query.tipoMaterial = tipoMaterial;
    if (tipo) query.tipo = tipo;

    if (dataInicio || dataFim) {
        query.dataMovimentacao = {};
        if (dataInicio) query.dataMovimentacao.$gte = new Date(dataInicio);
        if (dataFim) query.dataMovimentacao.$lte = new Date(dataFim);
    }

    const skip = (pagina - 1) * limite;

    const [movimentacoes, total] = await Promise.all([
        this.find(query)
            .populate('pontoColeta', 'nome')
            .populate('responsavel', 'nome')
            .populate('materialReciclado', 'numeroRastreio')
            .sort({ dataMovimentacao: -1 })
            .limit(limite)
            .skip(skip)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        movimentacoes,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite)
    };
};

// Static para estatísticas de movimentação
movimentacaoEstoqueSchema.statics.getEstatisticas = async function(pontoColetaId, periodo = 30) {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    const resultado = await this.aggregate([
        {
            $match: {
                pontoColeta: mongoose.Types.ObjectId(pontoColetaId),
                dataMovimentacao: { $gte: dataInicio }
            }
        },
        {
            $group: {
                _id: {
                    tipo: '$tipo',
                    tipoMaterial: '$tipoMaterial'
                },
                totalQuantidade: { $sum: '$quantidade' },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { totalQuantidade: -1 }
        }
    ]);

    return resultado;
};

const MovimentacaoEstoque = mongoose.model('MovimentacaoEstoque', movimentacaoEstoqueSchema);

module.exports = MovimentacaoEstoque;