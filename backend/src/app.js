const express = require('express');
const cors = require('cors');

// Rotas
const userRoutes = require('./routes/user.routes');
const pontoRoutes = require('./routes/coleta.routes');
const ecoPointRoutes = require('./routes/ecoPoint.routes');
const recompensaRoutes = require('./routes/recompensa.routes');
const dbRoutes = require('./routes/db.routes');

const app = express();

// --- Middlewares globais ---
app.use(cors());
app.use(express.json());

// --- Rotas principais ---
app.use('/api/users', userRoutes);
app.use('/api/pontos', pontoRoutes);
app.use('/api/ecopoints', ecoPointRoutes);
app.use('/api/recompensas', recompensaRoutes);
app.use('/api/db', dbRoutes);

// Healthcheck
app.get('/health', (req, res) => res.json({ ok: true }));

// Middleware global de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
