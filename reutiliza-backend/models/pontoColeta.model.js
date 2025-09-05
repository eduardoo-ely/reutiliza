const mongoose = require('mongoose');

const PontoColetaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    endereco: { type: String },
    bairro: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    horario_funcionamento: { type: String }
});

module.exports = mongoose.model('PontoColeta', PontoColetaSchema, 'pontos_coleta');