// Carrega as variáveis de ambiente do ficheiro .env
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const userRoutes = require('./routes/user.routes');
const pontoRoutes = require('./routes/coleta.routes');

const app = express();
const PORT = 3000;
app.use(cors());
app.use(bodyParser.json());

// --- Conexão com o MongoDB ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("ERRO FATAL: A variável MONGO_URI não foi encontrada. Verifique o ficheiro .env.");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('>>> SUCESSO: Backend conectado ao MongoDB na nuvem!'))
    .catch(err => console.error('>>> ERRO de conexão com MongoDB:', err));

// ================================================================
// --- ROTAS DA API ---
// ================================================================

app.get('/', (req, res) => {
    res.status(200).send('<h1>Servidor Reutiliza Backend está no ar!</h1>');
});

app.use('/api/users', userRoutes);
app.use('/api/pontos', pontoRoutes);


// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`>>> SERVIDOR RODANDO em http://localhost:${PORT}`);
});

