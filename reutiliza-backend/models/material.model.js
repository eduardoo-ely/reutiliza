const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String }
});

module.exports = mongoose.model('Material', MaterialSchema, 'materiais');