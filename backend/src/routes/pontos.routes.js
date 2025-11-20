const express = require('express');
const router = express.Router();
const User = require('../models/UserModel');
const MaterialReciclado = require('../models/MaterialReciclado');

// GET - Buscar pontos e histórico de um usuário
router.get('/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const usuario = await User.findById(usuarioId).select('nome email pontos');

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Buscar histórico de materiais validados (ganhos)
        const materiaisValidados = await MaterialReciclado.find({
            usuario: usuarioId,
            status: 'validado'
        })
            .select('tipo quantidade pontos dataRegistro dataValidacao')
            .sort({ dataValidacao: -1 })
            .limit(50); // Últimas 50 transações

        // Montar histórico de transações de ganhos
        const historicoGanhos = materiaisValidados.map(m => ({
            data: m.dataValidacao || m.dataRegistro,
            pontos: m.pontos,
            tipo: 'ganho',
            descricao: `Reciclagem de ${m.quantidade}kg de ${m.tipo}`,
            materialId: m._id
        }));

        // TODO: Adicionar histórico de gastos (recompensas resgatadas)
        // Por enquanto, apenas ganhos
        const historicoTransacoes = [...historicoGanhos].sort((a, b) =>
            new Date(b.data) - new Date(a.data)
        );

        res.json({
            success: true,
            data: {
                _id: usuario._id,
                usuarioId: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                pontos: usuario.pontos || 0,
                pontosUtilizados: 0, // TODO: Implementar quando tiver recompensas
                historicoTransacoes
            }
        });
    } catch (err) {
        console.error('Erro ao buscar pontos:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pontos do usuário',
            error: err.message
        });
    }
});

// POST - Adicionar/Remover pontos manualmente (admin)
router.post('/transacao', async (req, res) => {
    try {
        const { usuarioId, pontos, tipo, descricao } = req.body;

        if (!usuarioId || !pontos || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: usuarioId, pontos, tipo (ganho/gasto)'
            });
        }

        if (!['ganho', 'gasto'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo inválido. Use "ganho" ou "gasto"'
            });
        }

        const usuario = await User.findById(usuarioId);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Adicionar ou remover pontos
        const pontosNumericos = parseInt(pontos);
        if (tipo === 'ganho') {
            usuario.pontos = (usuario.pontos || 0) + pontosNumericos;
        } else if (tipo === 'gasto') {
            if ((usuario.pontos || 0) < pontosNumericos) {
                return res.status(400).json({
                    success: false,
                    message: 'Pontos insuficientes'
                });
            }
            usuario.pontos = (usuario.pontos || 0) - pontosNumericos;
        }

        await usuario.save();

        res.json({
            success: true,
            message: `Pontos ${tipo === 'ganho' ? 'adicionados' : 'removidos'} com sucesso!`,
            data: {
                usuarioId: usuario._id,
                pontosAtuais: usuario.pontos,
                transacao: {
                    data: new Date(),
                    pontos: pontosNumericos,
                    tipo,
                    descricao: descricao || `Ajuste manual de pontos (${tipo})`
                }
            }
        });
    } catch (err) {
        console.error('Erro ao processar transação:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar transação',
            error: err.message
        });
    }
});

// GET - Ranking de usuários por pontos
router.get('/ranking/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const ranking = await User.find()
            .select('nome email pontos')
            .sort({ pontos: -1 })
            .limit(limit);

        const rankingComPosicao = ranking.map((user, index) => ({
            posicao: index + 1,
            usuario: {
                id: user._id,
                nome: user.nome,
                email: user.email
            },
            pontos: user.pontos || 0
        }));

        res.json({
            success: true,
            count: rankingComPosicao.length,
            data: rankingComPosicao
        });
    } catch (err) {
        console.error('Erro ao buscar ranking:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar ranking',
            error: err.message
        });
    }
});

// GET - Estatísticas gerais de pontos
router.get('/stats/geral', async (req, res) => {
    try {
        const totalPontos = await User.aggregate([
            { $group: { _id: null, total: { $sum: '$pontos' } } }
        ]);

        const totalUsuarios = await User.countDocuments();
        const usuariosComPontos = await User.countDocuments({ pontos: { $gt: 0 } });

        const mediaPontos = totalUsuarios > 0
            ? Math.round((totalPontos[0]?.total || 0) / totalUsuarios)
            : 0;

        res.json({
            success: true,
            data: {
                totalPontos: totalPontos[0]?.total || 0,
                totalUsuarios,
                usuariosComPontos,
                mediaPontosPorUsuario: mediaPontos
            }
        });
    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            error: err.message
        });
    }
});

module.exports = router;