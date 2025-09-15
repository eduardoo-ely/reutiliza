const mongoose = require('mongoose');

const RecompensaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    custoEmPontos: { type: Number, required: true },
    tipo: { type: String, enum: ['avatar_frame', 'badge'], required: true }, // Tipo de recompensa
    valor: { type: String, required: true } // ex: 'gold-frame.png' ou 'Reciclador Mestre'
});

module.exports = mongoose.model('Recompensa', RecompensaSchema, 'recompensas');