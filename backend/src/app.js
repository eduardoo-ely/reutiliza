const express = require('express');
const cors = require('cors');

const userRoutes = require('./routes/user.routes');
const pontoRoutes = require('./routes/coleta.routes');
const ecoPointRoutes = require('./routes/ecoPoint.routes');
const recompensaRoutes = require('./routes/recompensa.routes');

const app = express();
app.use(cors());
app.use(express.json());

// Rotas principais
app.use('/api/users', userRoutes);
app.use('/api/pontos', pontoRoutes);
app.use('/api/ecopoints', ecoPointRoutes);
app.use('/api/recompensas', recompensaRoutes);

// Healthcheck
app.get('/health', (req, res) => res.json({ ok: true }));

module.exports = app;
