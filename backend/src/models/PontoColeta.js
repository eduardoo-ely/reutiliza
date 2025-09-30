const mongoose = require('mongoose');

const pontoColetaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  endereco: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  materiais: {
    type: [String],
    required: true
  },
  horarioFuncionamento: {
    type: String,
    required: true
  },
  telefone: {
    type: String
  },
  email: {
    type: String
  },
  ativo: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PontoColeta = mongoose.model('PontoColeta', pontoColetaSchema);

module.exports = PontoColeta;