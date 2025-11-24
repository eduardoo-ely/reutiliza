const mongoose = require('mongoose');

const materialRecicladoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pontoColeta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PontoColeta',
    required: true,
    index: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['Papel', 'Plástico', 'Vidro', 'Metal', 'Eletrônico', 'Óleo', 'Outros']
  },
  quantidade: {
    type: Number,
    required: true,
    min: 0
  },
  unidade: {
    type: String,
    required: true,
    enum: ['kg', 'litros', 'unidades']
  },
  pontos: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pendente', 'validado', 'rejeitado'],
    default: 'pendente',
    index: true
  },
  dataRegistro: {
    type: Date,
    default: Date.now,
    index: true
  },
  validadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataValidacao: {
    type: Date
  },
  observacoes: {
    type: String,
    maxlength: 500
  },
  // Novos campos para controle de estoque
  estoqueAtual: {
    type: Number,
    default: 0
  },
  destinoFinal: {
    type: String,
    enum: ['reciclagem', 'reutilizacao', 'descarte_adequado', 'aguardando'],
    default: 'aguardando'
  },
  // Rastreabilidade
  numeroRastreio: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Índice composto para queries otimizadas
materialRecicladoSchema.index({ usuario: 1, status: 1, dataRegistro: -1 });
materialRecicladoSchema.index({ pontoColeta: 1, tipo: 1 });

// Middleware para gerar número de rastreio
materialRecicladoSchema.pre('save', function(next) {
  if (!this.numeroRastreio && this.isNew) {
    this.numeroRastreio = `MAT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

// Método para calcular pontos baseado no material e quantidade
materialRecicladoSchema.methods.calcularPontos = function() {
  const tabelaPontos = {
    'Papel': 10,
    'Plástico': 15,
    'Vidro': 12,
    'Metal': 20,
    'Eletrônico': 30,
    'Óleo': 25,
    'Outros': 8
  };

  const pontosBase = tabelaPontos[this.tipo] || 10;
  this.pontos = Math.floor(this.quantidade * pontosBase);
  return this.pontos;
};

// Statics para relatórios
materialRecicladoSchema.statics.getEstatisticasPorPonto = async function(pontoColetaId) {
  return this.aggregate([
    { $match: { pontoColeta: mongoose.Types.ObjectId(pontoColetaId), status: 'validado' } },
    {
      $group: {
        _id: '$tipo',
        totalQuantidade: { $sum: '$quantidade' },
        totalPontos: { $sum: '$pontos' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalQuantidade: -1 } }
  ]);
};

const MaterialReciclado = mongoose.model('MaterialReciclado', materialRecicladoSchema);

module.exports = MaterialReciclado;