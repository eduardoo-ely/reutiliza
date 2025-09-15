const express = require("express");
const router = express.Router();
const PontoColeta = require("../models/pontoColeta.model");

// GET /api/pontos
router.get("/", async (req, res) => {
    try {
        const pontos = await PontoColeta.aggregate([
            {
                $lookup: {
                    from: "pontos_residuo_associacao",
                    localField: "_id",
                    foreignField: "ponto_id",
                    as: "associacoes",
                },
            },
            {
                $lookup: {
                    from: "materiais",
                    let: { assocIds: "$associacoes.residuo_id" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$assocIds"] } } },
                        { $project: { nome: 1, _id: 0 } },
                    ],
                    as: "materiais",
                },
            },
            {
                $project: {
                    _id: 1,
                    nome: 1,
                    endereco: 1,
                    horario_funcionamento: 1,
                    latitude: 1,
                    longitude: 1,
                    materiais: "$materiais.nome",
                },
            },
        ]);

        res.json(pontos);
    } catch (err) {
        console.error("Erro no GET /api/pontos:", err);
        res.status(500).json({ message: "Erro ao buscar pontos de coleta." });
    }
});

module.exports = router;
