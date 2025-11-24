const express = require('express');
const router = express.Router();
const notificacaoController = require('../controllers/notificacao.controller');

// Rotas de notificações

router.get('/:usuarioId', notificacaoController.getNotificacoesUsuario);
router.put('/:id/ler', notificacaoController.marcarComoLida);
router.put('/:usuarioId/ler-todas', notificacaoController.marcarTodasComoLidas);
router.delete('/:id', notificacaoController.deletarNotificacao);
router.delete('/limpar/antigas', notificacaoController.limparAntigas);
router.post('/', notificacaoController.criarNotificacao);

module.exports = router;