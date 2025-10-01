const express = require('express');
const router = express.Router();
const Ponto = require('../models/PontoColeta');

// GET todos os pontos
router.get('/', async (req, res) => {
    try {
        const pontos = await Ponto.find();
        const formatados = pontos.map(p => ({
            _id: p._id,
            nome: p.nome,
            endereco: p.endereco,
            latitude: p.latitude,
            longitude: p.longitude,
            materiais: p.materiais,
            horarioFuncionamento: p.horarioFuncionamento,
            telefone: p.telefone,
            email: p.email,
            ativo: p.ativo
        }));
        res.json(formatados);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar pontos de coleta' });
    }
});

// POST criar ponto
router.post('/', async (req, res) => {
    try {
        const ponto = new Ponto(req.body);
        await ponto.save();
        res.status(201).json(ponto);
    } catch (err) {
        res.status(400).json({ error: 'Erro ao criar ponto' });
    }
});

// PUT atualizar ponto
router.put('/:id', async (req, res) => {
    try {
        const ponto = await Ponto.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(ponto);
    } catch (err) {
        res.status(400).json({ error: 'Erro ao atualizar ponto' });
    }
});

// DELETE remover ponto
router.delete('/:id', async (req, res) => {
    try {
        await Ponto.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ponto removido' });
    } catch (err) {
        res.status(400).json({ error: 'Erro ao remover ponto' });
    }
});

module.exports = router;
