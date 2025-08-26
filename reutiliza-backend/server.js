require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// --- CONFIGURAÇÃO INICIAL ---
const app = express();
const PORT = 3000;
app.use(cors());
app.use(bodyParser.json());

// --- CONEXÃO COM O MONGODB ---
// MUDANÇA AQUI: A string de conexão agora é lida de forma segura
// a partir do arquivo .env e não fica exposta no código.
const MONGO_URI = process.env.MONGO_URI;

// Uma verificação para garantir que o arquivo .env foi lido corretamente
if (!MONGO_URI) {
    console.error("ERRO FATAL: A variável MONGO_URI não foi encontrada. Verifique se o arquivo .env existe e está correto.");
    process.exit(1); // Encerra a aplicação se a conexão não estiver definida
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('>>> SUCESSO: Backend conectado ao MongoDB na nuvem!'))
    .catch(err => console.error('>>> ERRO de conexão com MongoDB:', err));

// --- MODELS (sem alterações) ---
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'usuarios');
const PontoColeta = mongoose.model('PontoColeta', new mongoose.Schema({}, { strict: false }), 'pontos_coleta');
const Material = mongoose.model('Material', new mongoose.Schema({}, { strict: false }), 'materiais');
const Associacao = mongoose.model('Associacao', new mongoose.Schema({}, { strict: false }), 'pontos_residuo_associacao');


// --- ROTAS DA API (sem alterações) ---
app.get('/', (req, res) => {
    res.status(200).send('<h1>Servidor Reutiliza Backend está no ar!</h1><p>Acesse a aplicação Angular em http://localhost:4200</p>');
});

app.post('/api/users/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const user = await User.findOne({ email, senha });
        if (user) {
            res.json({ success: true, message: 'Login bem-sucedido!', user });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

app.get('/api/pontos', async (req, res) => {
    try {
        const pontos = await PontoColeta.aggregate([
            { $lookup: { from: 'pontos_residuo_associacao', localField: '_id', foreignField: 'ponto_id', as: 'assoc' } },
            { $lookup: { from: 'materiais', localField: 'assoc.residuo_id', foreignField: '_id', as: 'materiaisInfo' } },
            { $project: { _id: 1, nome: 1, endereco: 1, horario_funcionamento: 1, latitude: 1, longitude: 1, materiais: "$materiaisInfo.nome" } }
        ]);
        res.json(pontos);
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar pontos de coleta." });
    }
});

// --- INICIAR O SERVIDOR ---
app.listen(PORT, () => {
    console.log(`>>> SERVIDOR RODANDO em http://localhost:${PORT}`);
});