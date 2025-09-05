const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
});

// O terceiro argumento 'usuarios' garante que o Mongoose use a sua coleção existente
module.exports = mongoose.model('User', UserSchema, 'usuarios');
