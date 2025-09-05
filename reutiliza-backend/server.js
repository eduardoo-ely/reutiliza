// Carrega as variáveis de ambiente do ficheiro .env
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

// --- Importar os Modelos ---
const User = require('./models/user.model');
const PontoColeta = require('./models/pontoColeta.model');
// Adicione outros modelos se necessário

// --- Configuração Inicial ---
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

// --- ROTAS DA API ---


// --- Rota Principal (Boas-vindas) ---
app.get('/', (req, res) => {
    res.status(200).send('<h1>Servidor Reutiliza Backend está no ar!</h1>');
});

// Rotas de Utilizadores (/api/users)

app.post('/api/users/register', async (req, res) => {
    try {
        const { email, senha, nome } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Este e-mail já está registado.' });
        }
        const salt = await bcrypt.genSalt(10);
        const senhaComHash = await bcrypt.hash(senha, salt);
        const newUser = new User({ nome, email, senha: senhaComHash });
        await newUser.save();
        res.status(201).json({ success: true, message: 'Conta criada com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao registar utilizador.' });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Encontra o utilizador apenas pelo email
        const user = await User.findOne({ email });

        // Se o utilizador não for encontrado, envia a mensagem "Conta não existe"
        if (!user) {
            return res.status(401).json({ success: false, message: 'Nenhum utilizador encontrado com este e-mail.' });
        }

        // Se o utilizador existe, compara a senha enviada com o hash guardado no banco
        const senhaValida = await bcrypt.compare(senha, user.senha);

        // Se as senhas não correspondem, envia a mensagem "Senha incorreta"
        if (!senhaValida) {
            return res.status(401).json({ success: false, message: 'Senha incorreta.' });
        }

        // Se tudo estiver correto, envia a resposta de sucesso
        const userToReturn = { id: user._id, email: user.email, nome: user.nome };
        res.json({ success: true, message: 'Login efetuado com sucesso!', user: userToReturn });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

// --- Rota de Pontos de Coleta (/api/pontos) ---
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

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`>>> SERVIDOR RODANDO em http://localhost:${PORT}`);
});

