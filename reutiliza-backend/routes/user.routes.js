const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user.model');

router.post('/register', async (req, res) => {
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

// ROTA DE LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Encontra o utilizador apenas pelo email
        const user = await User.findOne({ email });

        // Se o utilizador não for encontrado, envia a mensagem "Conta não existe"
        if (!user) {
            // Nota de segurança: Em produção, é mais seguro devolver uma mensagem genérica.
            return res.status(401).json({ success: false, message: 'Nenhum utilizador encontrado com este e-mail.' });
        }

        // 2. Se o utilizador existe, compara a senha enviada com o hash guardado no banco
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

module.exports = router;

