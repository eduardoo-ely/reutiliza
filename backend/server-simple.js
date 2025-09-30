require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(cors());
app.use(express.json());

// --- Conexão com o MongoDB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reutiliza';

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

// Rota para verificar status do banco de dados
app.get('/api/db/status', async (req, res) => {
    try {
        const status = mongoose.connection.readyState;
        let statusText = '';
        
        switch (status) {
            case 0: statusText = 'Desconectado'; break;
            case 1: statusText = 'Conectado'; break;
            case 2: statusText = 'Conectando'; break;
            case 3: statusText = 'Desconectando'; break;
            default: statusText = 'Desconhecido';
        }
        
        // Verificar collections existentes
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        return res.status(200).json({
            status: 'success',
            connection: {
                status: status,
                statusText: statusText
            },
            collections: collections.map(c => c.name),
            message: 'Informações da conexão com o banco de dados'
        });
    } catch (error) {
        console.error('Erro ao verificar conexão com o banco:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao verificar conexão com o banco de dados',
            error: error.message
        });
    }
});

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
    console.log(`>>> Verifique o status do banco em http://localhost:${PORT}/api/db/status`);
});