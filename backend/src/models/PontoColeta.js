const mongoose = require('mongoose');

const pontoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  endereco: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  materiais: [String],
  horarioFuncionamento: { type: String },
  telefone: { type: String },
  email: { type: String },
  ativo: { type: Boolean, default: true }
});


module.exports = mongoose.model('PontoColeta', pontoSchema, 'pontos_coleta');
