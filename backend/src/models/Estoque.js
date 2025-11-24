const mongoose = require('mongoose');

const estoqueSchema = new mongoose.Schema({
    pontoColeta: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PontoColeta',
        required: true,
        index: true
    },
    tipoMaterial: {
        type: String,
        required: true,
        enum: ['Papel', 'Plástico', 'Vidro', 'Metal', 'Eletrônico', 'Óleo', 'Outros'],
        index: true
    },
    quantidadeAtual: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    unidade: {
        type: String,
        required: true,
        enum: ['kg', 'litros', 'unidades']
    },
    capacidadeMaxima: {
        type: Number,
        required: true,
        default: 1000
    },
    nivelAlerta: {
        type: Number,
        default: 800 // 80% da capacidade
    },
    // Histórico de movimentações
    ultimaEntrada: {
        type: Date
    },
    ultimaSaida: {
        type: Date
    },
    // Status do estoque
    status: {
        type: String,
        enum: ['normal', 'alerta', 'cheio', 'vazio'],
        default: 'normal'
    },
    // Observações
    observacoes: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Índice único composto
estoqueSchema.index({ pontoColeta: 1, tipoMaterial: 1 }, { unique: true });

// Middleware para atualizar status automaticamente
estoqueSchema.pre('save', function(next) {
    const percentual = (this.quantidadeAtual / this.capacidadeMaxima) * 100;

    if (this.quantidadeAtual === 0) {
        this.status = 'vazio';
    } else if (percentual >= 100) {
        this.status = 'cheio';
    } else if (percentual >= (this.nivelAlerta / this.capacidadeMaxima) * 100) {
        this.status = 'alerta';
    } else {
        this.status = 'normal';
    }

    next();
});

// Método para adicionar ao estoque
estoqueSchema.methods.adicionar = async function(quantidade) {
    if (quantidade <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
    }

    const novaQuantidade = this.quantidadeAtual + quantidade;

    if (novaQuantidade > this.capacidadeMaxima) {
        throw new Error(`Capacidade máxima excedida. Disponível: ${this.capacidadeMaxima - this.quantidadeAtual}${this.unidade}`);
    }

    this.quantidadeAtual = novaQuantidade;
    this.ultimaEntrada = new Date();

    await this.save();

    // Registrar movimentação
    const MovimentacaoEstoque = mongoose.model('MovimentacaoEstoque');
    await MovimentacaoEstoque.create({
        estoque: this._id,
        pontoColeta: this.pontoColeta,
        tipoMaterial: this.tipoMaterial,
        tipo: 'entrada',
        quantidade,
        quantidadeAnterior: this.quantidadeAtual - quantidade,
        quantidadeAtual: this.quantidadeAtual
    });

    return this;
};

// Método para remover do estoque
estoqueSchema.methods.remover = async function(quantidade, motivo = 'coleta') {
    if (quantidade <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
    }

    if (quantidade > this.quantidadeAtual) {
        throw new Error(`Quantidade insuficiente. Disponível: ${this.quantidadeAtual}${this.unidade}`);
    }

    const quantidadeAnterior = this.quantidadeAtual;
    this.quantidadeAtual -= quantidade;
    this.ultimaSaida = new Date();

    await this.save();

    // Registrar movimentação
    const MovimentacaoEstoque = mongoose.model('MovimentacaoEstoque');
    await MovimentacaoEstoque.create({
        estoque: this._id,
        pontoColeta: this.pontoColeta,
        tipoMaterial: this.tipoMaterial,
        tipo: 'saida',
        quantidade,
        quantidadeAnterior,
        quantidadeAtual: this.quantidadeAtual,
        motivo
    });

    return this;
};

// Static para obter estoque por ponto
estoqueSchema.statics.getPorPonto = async function(pontoColetaId) {
    return this.find({ pontoColeta: pontoColetaId })
        .populate('pontoColeta', 'nome endereco')
        .sort({ tipoMaterial: 1 });
};

// Static para obter alertas
estoqueSchema.statics.getAlertas = async function() {
    return this.find({ status: { $in: ['alerta', 'cheio'] } })
        .populate('pontoColeta', 'nome endereco telefone')
        .sort({ status: -1, quantidadeAtual: -1 });
};

const Estoque = mongoose.model('Estoque', estoqueSchema);

module.exports = Estoque;