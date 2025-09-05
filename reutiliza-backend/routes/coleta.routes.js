const express = require('express');
const router = express.Router();
const Coleta = require('../models/coleta.model');

router.post('/', async (req, res) => {
    try {
        const novaColeta = new Coleta({
            usuario_id: req.body.usuario_id,
            ponto_id: req.body.ponto_id,
            material_id: req.body.material_id,
            quantidade_kg: req.body.quantidade_kg
        });

        const coletaSalva = await novaColeta.save();
        res.status(201).json(coletaSalva);

    } catch (error) {
        res.status(400).json({ message: 'Erro ao registar a coleta.', error: error.message });
    }
});

router.get('/usuario/:usuarioId', async (req, res) => {
    try {
        const historico = await Coleta.find({ usuario_id: req.params.usuarioId })
            .populate('ponto_id', 'nome')
            .populate('material_id', 'nome');

        res.json(historico);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar o histórico do utilizador.', error: error.message });
    }
});

module.exports = router;