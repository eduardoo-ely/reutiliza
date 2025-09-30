const mongoose = require('mongoose');

const recompensaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descricao: {
    type: String,
    required: true
  },
  pontosNecessarios: {
    type: Number,
    required: true,
    min: 1
  },
  disponivel: {
    type: Boolean,
    default: true
  },
  imagem: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Recompensa = mongoose.model('Recompensa', recompensaSchema);

module.exports = Recompensa;