const mongoose = require('mongoose');

const materialRecicladoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pontoColeta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PontoColeta',
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['Papel', 'Plástico', 'Vidro', 'Metal', 'Eletrônico', 'Óleo', 'Outros']
  },
  quantidade: {
    type: Number,
    required: true
  },
  unidade: {
    type: String,
    required: true,
    enum: ['kg', 'litros', 'unidades']
  },
  pontos: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pendente', 'validado', 'rejeitado'],
    default: 'pendente'
  },
  dataRegistro: {
    type: Date,
    default: Date.now
  },
  validadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataValidacao: {
    type: Date
  }
});

const MaterialReciclado = mongoose.model('MaterialReciclado', materialRecicladoSchema);

module.exports = MaterialReciclado;