const express = require('express');
const router = express.Router();
const { isAdmin, logAction, rateLimit, detectSuspiciousActivity } = require('../middlewares/adminAuth.middleware');
const { checkPermission } = require('../middlewares/permissions.middleware');

// Controllers
const pontoAdmin = require('../controllers/pontoAdmin.controller');
const denunciaAdmin = require('../controllers/denunciaAdmin.controller');
const usuarioAdmin = require('../controllers/usuarioAdmin.controller');
const recompensaAdmin = require('../controllers/recompensaAdmin.controller');
const metricasAdmin = require('../controllers/metricasAdmin.controller');

// Aplicar middlewares globais para rotas admin
router.use(isAdmin);
router.use(rateLimit(100, 60000)); // 100 req/min
router.use(detectSuspiciousActivity);

// ========================================
// PONTOS DE COLETA
// ========================================
router.get('/pontos',
    checkPermission('pontos', 'ler'),
    logAction('pontos', 'visualizar'),
    pontoAdmin.listarTodos
);

router.get('/pontos/:id',
    checkPermission('pontos', 'ler'),
    pontoAdmin.buscarPorId
);

router.post('/pontos',
    checkPermission('pontos', 'criar'),
    logAction('pontos', 'criar'),
    pontoAdmin.criar
);

router.put('/pontos/:id',
    checkPermission('pontos', 'editar'),
    logAction('pontos', 'editar'),
    pontoAdmin.editar
);

router.delete('/pontos/:id',
    checkPermission('pontos', 'deletar'),
    logAction('pontos', 'deletar'),
    pontoAdmin.deletar
);

router.put('/pontos/:id/ativar',
    checkPermission('pontos', 'editar'),
    logAction('pontos', 'ativar'),
    pontoAdmin.ativar
);

router.put('/pontos/:id/desativar',
    checkPermission('pontos', 'editar'),
    logAction('pontos', 'desativar'),
    pontoAdmin.desativar
);

router.get('/pontos/:id/historico',
    checkPermission('pontos', 'ler'),
    pontoAdmin.historico
);

// ========================================
// DENÚNCIAS
// ========================================
router.get('/denuncias',
    checkPermission('denuncias', 'ler'),
    logAction('denuncias', 'visualizar'),
    denunciaAdmin.listarTodas
);

router.get('/denuncias/pendentes',
    checkPermission('denuncias', 'ler'),
    denunciaAdmin.listarPendentes
);

router.get('/denuncias/urgentes',
    checkPermission('denuncias', 'ler'),
    denunciaAdmin.listarUrgentes
);

router.get('/denuncias/:id',
    checkPermission('denuncias', 'ler'),
    denunciaAdmin.buscarPorId
);

router.put('/denuncias/:id/analisar',
    checkPermission('denuncias', 'validar'),
    logAction('denuncias', 'validar'),
    denunciaAdmin.iniciarAnalise
);

router.put('/denuncias/:id/decidir',
    checkPermission('denuncias', 'validar'),
    logAction('denuncias', 'validar'),
    denunciaAdmin.tomarDecisao
);

router.post('/denuncias/:id/comentario',
    checkPermission('denuncias', 'editar'),
    denunciaAdmin.adicionarComentario
);

router.post('/denuncias/:id/acao',
    checkPermission('denuncias', 'editar'),
    logAction('denuncias', 'editar'),
    denunciaAdmin.registrarAcao
);

router.get('/denuncias/estatisticas',
    checkPermission('denuncias', 'ler'),
    denunciaAdmin.estatisticas
);

// ========================================
// USUÁRIOS
// ========================================
router.get('/usuarios',
    checkPermission('usuarios', 'ler'),
    logAction('usuarios', 'visualizar'),
    usuarioAdmin.listarTodos
);

router.get('/usuarios/:id',
    checkPermission('usuarios', 'ler'),
    usuarioAdmin.buscarPorId
);

router.put('/usuarios/:id/permissoes',
    checkPermission('usuarios', 'editar'),
    logAction('usuarios', 'alterar_permissoes'),
    usuarioAdmin.alterarPermissoes
);

router.put('/usuarios/:id/role',
    checkPermission('usuarios', 'editar'),
    logAction('usuarios', 'alterar_permissoes'),
    usuarioAdmin.alterarRole
);

router.put('/usuarios/:id/suspender',
    checkPermission('usuarios', 'editar'),
    logAction('usuarios', 'suspender'),
    usuarioAdmin.suspender
);

router.put('/usuarios/:id/reativar',
    checkPermission('usuarios', 'editar'),
    logAction('usuarios', 'reativar'),
    usuarioAdmin.reativar
);

router.get('/usuarios/:id/atividades',
    checkPermission('usuarios', 'ler'),
    usuarioAdmin.atividadesRecentes
);

router.get('/usuarios/:id/auditoria',
    checkPermission('auditoria', 'ler'),
    usuarioAdmin.logAuditoria
);

// ========================================
// RECOMPENSAS
// ========================================
router.get('/recompensas/resgates',
    checkPermission('recompensas', 'ler'),
    logAction('recompensas', 'visualizar'),
    recompensaAdmin.listarResgates
);

router.get('/recompensas/resgates/pendentes',
    checkPermission('recompensas', 'ler'),
    recompensaAdmin.listarResgatesPendentes
);

router.get('/recompensas/resgates/:id',
    checkPermission('recompensas', 'ler'),
    recompensaAdmin.buscarResgatePorId
);

router.put('/recompensas/resgates/:id/validar',
    checkPermission('recompensas', 'validar'),
    logAction('recompensas', 'validar'),
    recompensaAdmin.validarResgate
);

router.put('/recompensas/resgates/:id/cancelar',
    checkPermission('recompensas', 'editar'),
    logAction('recompensas', 'editar'),
    recompensaAdmin.cancelarResgate
);

router.get('/recompensas/estatisticas',
    checkPermission('recompensas', 'ler'),
    recompensaAdmin.estatisticasResgates
);

router.post('/recompensas',
    checkPermission('recompensas', 'criar'),
    logAction('recompensas', 'criar'),
    recompensaAdmin.criarRecompensa
);

router.put('/recompensas/:id',
    checkPermission('recompensas', 'editar'),
    logAction('recompensas', 'editar'),
    recompensaAdmin.editarRecompensa
);

router.put('/recompensas/:id/estoque',
    checkPermission('recompensas', 'editar'),
    logAction('recompensas', 'editar'),
    recompensaAdmin.atualizarEstoque
);

// ========================================
// MÉTRICAS
// ========================================
router.get('/metricas/geral',
    checkPermission('metricas', 'ler'),
    metricasAdmin.metricasGerais
);

router.get('/metricas/usuarios',
    checkPermission('metricas', 'ler'),
    metricasAdmin.metricasUsuarios
);

router.get('/metricas/materiais',
    checkPermission('metricas', 'ler'),
    metricasAdmin.metricasMateriais
);

router.get('/metricas/pontos-coleta',
    checkPermission('metricas', 'ler'),
    metricasAdmin.metricasPontosColeta
);

router.get('/metricas/recompensas',
    checkPermission('metricas', 'ler'),
    metricasAdmin.metricasRecompensas
);

router.get('/metricas/tendencias',
    checkPermission('metricas', 'ler'),
    metricasAdmin.tendencias
);

router.get('/metricas/comparativo',
    checkPermission('metricas', 'ler'),
    metricasAdmin.comparativoPeriodos
);

router.get('/metricas/exportar',
    checkPermission('metricas', 'exportar'),
    logAction('metricas', 'exportar'),
    metricasAdmin.exportarRelatorio
);

module.exports = router;