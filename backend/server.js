require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Importa rotas
const userRoutes = require('./src/routes/user.routes');
const pontoRoutes = require('./src/routes/coleta.routes');
const materialRoutes = require('./src/routes/material.routes');
const validacaoRoutes = require('./src/routes/validacao.routes');
const pontosRoutes = require('./src/routes/pontos.routes');
const recompensaRoutes = require('./src/routes/recompensa.routes');
const dbRoutes = require('./src/routes/db.routes');
const notificacaoRoutes = require('./src/routes/notificacao.routes');
const estoqueRoutes = require('./src/routes/estoque.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Middlewares globais
app.use(cors({
    origin: '*', // Em produção, especifique os domínios permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requisições (desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// --- Conexão com o MongoDB ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("❌ ERRO FATAL: A variável MONGO_URI não foi encontrada no .env");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Backend conectado ao MongoDB Atlas!');
        console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    })
    .catch(err => {
        console.error('❌ Erro de conexão com MongoDB:', err.message);
        process.exit(1);
    });

// --- ROTAS DA API ---
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Servidor Reutiliza Backend está no ar! 🚀',
        version: '2.0.0 - Sprint 3',
        timestamp: new Date().toISOString(),
        endpoints: {
            users: '/api/users',
            pontos: '/api/pontos',
            materiais: '/api/materiais',
            validacoes: '/api/validacoes',
            pontuacao: '/api/pontuacao',
            recompensas: '/api/recompensas',
            notificacoes: '/api/notificacoes',
            estoque: '/api/estoque',
            dashboard: '/api/dashboard',
            database: '/api/db'
        },
        novidades_sprint3: [
            '🔔 Sistema de Notificações',
            '📦 Controle de Estoque por Ponto de Coleta',
            '📊 Movimentações de Estoque',
            '💰 Histórico Completo de Transações de Pontos',
            '✅ Validação Cruzada Aprimorada',
            '🎁 Sistema de Recompensas Expandido'
        ]
    });
});

// Rotas da API
app.use('/api/users', userRoutes);
app.use('/api/pontos', pontoRoutes);
app.use('/api/materiais', materialRoutes);
app.use('/api/validacoes', validacaoRoutes);
app.use('/api/pontuacao', pontosRoutes);
app.use('/api/recompensas', recompensaRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/db', dbRoutes);

// Rota 404
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Rota ${req.method} ${req.path} não encontrada`
    });
});

// Middleware global de erros
app.use((err, req, res, next) => {
    console.error('❌ Erro capturado:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Erro interno do servidor';

    res.status(statusCode).json({
        status: 'error',
        message: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            error: err
        })
    });
});

// --- Iniciar o Servidor ---
app.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 Servidor Reutiliza rodando - Sprint 3!`);
    console.log(`📍 URL: http://${HOST}:${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Versão: 2.0.0`);
    console.log('='.repeat(60));
    console.log('\n🆕 Novos endpoints disponíveis:');
    console.log('   🔔 /api/notificacoes - Sistema de notificações');
    console.log('   📦 /api/estoque - Controle de estoque');
    console.log('   📊 /api/estoque/movimentacoes - Movimentações');
    console.log('='.repeat(60) + '\n');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});