const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");

// --- ROTA DE REGISTRO ---
router.post("/register", async (req, res) => {
    try {
        const { email, senha, nome } = req.body;

        if (!email || !senha || !nome) {
            return res.status(400).json({
                success: false,
                message: "Preencha todos os campos."
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "Este e-mail já está registrado.",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaComHash = await bcrypt.hash(senha, salt);

        const newUser = new User({
            nome,
            email,
            senha: senhaComHash,
            role: 'usuario' // Define explicitamente como usuario
        });
        await newUser.save();

        res.status(201).json({
            success: true,
            message: "Conta criada com sucesso!",
            user: {
                id: newUser._id,
                nome: newUser.nome,
                email: newUser.email,
                role: newUser.role
            },
        });
    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao registrar usuário."
        });
    }
});

// --- ROTA DE LOGIN ---
router.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                success: false,
                message: "Preencha todos os campos."
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Usuário ou senha incorretos.",
            });
        }

        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res.status(401).json({
                success: false,
                message: "Usuário ou senha incorretos.",
            });
        }

        // Retorna dados completos do usuário
        const userToReturn = {
            id: user._id,
            email: user.email,
            nome: user.nome,
            pontos: user.pontos || 0,
            pontosUtilizados: user.pontosUtilizados || 0,
            role: user.role
        };

        res.json({
            success: true,
            message: "Login efetuado com sucesso!",
            user: userToReturn,
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({
            success: false,
            message: "Erro no servidor."
        });
    }
});

module.exports = router;