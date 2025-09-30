const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

// --- ROTA DE REGISTO (COM HASHING) ---
router.post("/register", async (req, res) => {
    try {
        const { email, senha, nome } = req.body;

        // validação básica
        if (!email || !senha || !nome) {
            return res
                .status(400)
                .json({ success: false, message: "Preencha todos os campos." });
        }

        // verificar se o email já existe
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "Este e-mail já está registado.",
            });
        }

        // hash da senha
        const salt = await bcrypt.genSalt(10);
        const senhaComHash = await bcrypt.hash(senha, salt);

        // criar utilizador
        const newUser = new User({ nome, email, senha: senhaComHash });
        await newUser.save();

        res.status(201).json({
            success: true,
            message: "Conta criada com sucesso!",
            user: { id: newUser._id, nome: newUser.nome, email: newUser.email },
        });
    } catch (error) {
        console.error("Erro no register:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro ao registar utilizador." });
    }
});

// --- ROTA DE LOGIN (COM HASHING E MENSAGENS ESPECÍFICAS) ---
router.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        // validação básica
        if (!email || !senha) {
            return res
                .status(400)
                .json({ success: false, message: "Preencha todos os campos." });
        }

        // procurar utilizador
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Nenhum utilizador encontrado com este e-mail.",
            });
        }

        // validar senha
        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res
                .status(401)
                .json({ success: false, message: "Senha incorreta." });
        }

        // retorno seguro (não envia senha!)
        const userToReturn = {
            id: user._id,
            email: user.email,
            nome: user.nome,
        };

        res.json({
            success: true,
            message: "Login efetuado com sucesso!",
            user: userToReturn,
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, message: "Erro no servidor." });
    }
});

module.exports = router;
