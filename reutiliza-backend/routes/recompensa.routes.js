const express = require('express');
const router = express.Router();
const Recompensa = require('../models/recompensa.model');
const User = require('../models/user.model');

// Rota para obter todas as recompensas
router.get('/', async (req, res) => {
    try {
        const recompensas = await Recompensa.find();
        res.json(recompensas);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar recompensas.' });
    }
});

// Rota para um utilizador resgatar uma recompensa
router.post('/resgatar', async (req, res) => {
    const { userId, recompensaId } = req.body;
    try {
        const user = await User.findById(userId);
        const recompensa = await Recompensa.findById(recompensaId);

        if (!user || !recompensa) {
            return res.status(404).json({ message: 'Utilizador ou recompensa não encontrado.' });
        }

        if (user.pontos < recompensa.custoEmPontos) {
            return res.status(400).json({ message: 'Pontos insuficientes.' });
        }

        // Subtrai os pontos e adiciona a recompensa
        user.pontos -= recompensa.custoEmPontos;
        user.recompensasAdquiridas.push(recompensaId);
        await user.save();

        res.json({ message: 'Recompensa resgatada com sucesso!', user });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao resgatar recompensa.' });
    }
});

module.exports = router;