const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoque.controller');

// Rotas de estoque

router.get('/', estoqueController.getTodosEstoques);
router.get('/alertas', estoqueController.getAlertas);
router.get('/ponto/:pontoColetaId', estoqueController.getEstoquePorPonto);
router.get('/ponto/:pontoColetaId/estatisticas', estoqueController.getEstatisticas);
router.post('/', estoqueController.criarOuAtualizarEstoque);
router.put('/:estoqueId/adicionar', estoqueController.adicionarAoEstoque);
router.put('/:estoqueId/remover', estoqueController.removerDoEstoque);
router.get('/movimentacoes', estoqueController.getMovimentacoes);

module.exports = router;