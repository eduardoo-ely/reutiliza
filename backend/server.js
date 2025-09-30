require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Importa rotas
const userRoutes = require('./src/routes/user.routes');
const pontoRoutes = require('./src/routes/coleta.routes');
const ecoPointRoutes = require('./src/routes/ecoPoint.routes');
const recompensaRoutes = require('./src/routes/recompensa.routes');
const dbRoutes = require('./src/routes/db.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(cors());
app.use(express.json());

// --- Conexão com o MongoDB ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("ERRO FATAL: A variável MONGO_URI não foi encontrada. Verifique o ficheiro .env.");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('>>> SUCESSO: Backend conectado ao MongoDB!'))
    .catch(err => {
        console.error('>>> ERRO de conexão com MongoDB:', err);
        process.exit(1);
    });

// --- ROTAS DA API ---
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Servidor Reutiliza Backend está no ar!' });
});

app.use('/api/users', userRoutes);
app.use('/api/pontos', pontoRoutes);
app.use('/api/ecopoints', ecoPointRoutes);
app.use('/api/recompensas', recompensaRoutes);
app.use('/api/db', dbRoutes);

// Middleware global de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`>>> SERVIDOR RODANDO em http://localhost:${PORT}`);
});
