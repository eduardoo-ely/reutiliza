const mongoose = require("mongoose");

const PontoColetaSchema = new mongoose.Schema(
    {
        nome: {
            type: String,
            required: true,
            trim: true,
        },
        endereco: {
            type: String,
            trim: true,
        },
        bairro: {
            type: String,
            trim: true,
        },
        latitude: {
            type: Number,
            min: -90,
            max: 90,
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180,
        },
        horario_funcionamento: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true, // cria createdAt e updatedAt automaticamente
    }
);

module.exports = mongoose.model("PontoColeta", PontoColetaSchema, "pontos_coleta");
