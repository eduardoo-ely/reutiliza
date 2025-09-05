const mongoose = require('mongoose');

const ColetaSchema = new mongoose.Schema({
    usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ponto_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PontoColeta', required: true },
    material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },

    data_coleta: { type: Date, default: Date.now },
    quantidade_kg: { type: Number, required: false }
});

module.exports = mongoose.model('Coleta', ColetaSchema, 'materiais_coletados');
