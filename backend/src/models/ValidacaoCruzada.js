const mongoose = require('mongoose');

const validacaoCruzadaSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialReciclado',
    required: true
  },
  validador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pendente', 'validado', 'rejeitado'],
    default: 'pendente'
  },
  comentario: {
    type: String
  },
  dataValidacao: {
    type: Date,
    default: Date.now
  }
});

const ValidacaoCruzada = mongoose.model('ValidacaoCruzada', validacaoCruzadaSchema);

module.exports = ValidacaoCruzada;