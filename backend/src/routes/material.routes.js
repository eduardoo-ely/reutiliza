const express = require('express');
const router = express.Router();
const MaterialReciclado = require('../models/MaterialReciclado');
const User = require('../models/UserModel');
const PontoColeta = require('../models/PontoColeta');

// GET - Listar todos os materiais (com filtros opcionais)
router.get('/', async (req, res) => {
    try {
        const { usuarioId, status, pontoColetaId } = req.query;

        let filtro = {};
        if (usuarioId) filtro.usuario = usuarioId;
        if (status) filtro.status = status;
        if (pontoColetaId) filtro.pontoColeta = pontoColetaId;

        const materiais = await MaterialReciclado.find(filtro)
            .populate('usuario', 'nome email')
            .populate('pontoColeta', 'nome endereco latitude longitude')
            .sort({ dataRegistro: -1 });

        res.json({
            success: true,
            count: materiais.length,
            data: materiais
        });
    } catch (err) {
        console.error('Erro ao buscar materiais:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar materiais',
            error: err.message
        });
    }
});

// GET - Buscar material por ID
router.get('/:id', async (req, res) => {
    try {
        const material = await MaterialReciclado.findById(req.params.id)
            .populate('usuario', 'nome email')
            .populate('pontoColeta', 'nome endereco');

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material não encontrado'
            });
        }

        res.json({
            success: true,
            data: material
        });
    } catch (err) {
        console.error('Erro ao buscar material:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar material',
            error: err.message
        });
    }
});

// POST - Registrar novo material
router.post('/', async (req, res) => {
    try {
        const { usuarioId, pontoColetaId, material, quantidade, unidade, observacoes } = req.body;

        // Validações básicas
        if (!usuarioId || !pontoColetaId || !material || !quantidade || !unidade) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: usuarioId, pontoColetaId, material, quantidade, unidade'
            });
        }

        // Verificar se usuário existe
        const usuarioExiste = await User.findById(usuarioId);
        if (!usuarioExiste) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verificar se ponto de coleta existe
        const pontoExiste = await PontoColeta.findById(pontoColetaId);
        if (!pontoExiste) {
            return res.status(404).json({
                success: false,
                message: 'Ponto de coleta não encontrado'
            });
        }

        // Calcular pontos (algoritmo simples: 10 pontos por kg/litro/unidade)
        const pontos = Math.floor(parseFloat(quantidade) * 10);

        const novoMaterial = new MaterialReciclado({
            usuario: usuarioId,
            pontoColeta: pontoColetaId,
            tipo: material,
            quantidade: parseFloat(quantidade),
            unidade,
            pontos,
            status: 'pendente',
            observacoes: observacoes || '',
            dataRegistro: new Date()
        });

        await novoMaterial.save();

        // Retornar com dados populados
        const materialPopulado = await MaterialReciclado.findById(novoMaterial._id)
            .populate('usuario', 'nome email')
            .populate('pontoColeta', 'nome endereco');

        res.status(201).json({
            success: true,
            message: 'Material registrado com sucesso! Aguarde validação.',
            data: materialPopulado
        });
    } catch (err) {
        console.error('Erro ao registrar material:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar material',
            error: err.message
        });
    }
});

// PUT - Atualizar material (usuário ou admin)
router.put('/:id', async (req, res) => {
    try {
        const material = await MaterialReciclado.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('usuario', 'nome email')
            .populate('pontoColeta', 'nome endereco');

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Material atualizado com sucesso!',
            data: material
        });
    } catch (err) {
        console.error('Erro ao atualizar material:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar material',
            error: err.message
        });
    }
});

// PUT - Validar material (admin)
router.put('/:id/validar', async (req, res) => {
    try {
        const { status, observacoes } = req.body;

        if (!['validado', 'rejeitado'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido. Use "validado" ou "rejeitado"'
            });
        }

        const material = await MaterialReciclado.findById(req.params.id);

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material não encontrado'
            });
        }

        material.status = status;
        if (observacoes) {
            material.observacoes = observacoes;
        }
        material.dataValidacao = new Date();

        // Se validado, adicionar pontos ao usuário
        if (status === 'validado') {
            const usuario = await User.findByIdAndUpdate(
                material.usuario,
                { $inc: { pontos: material.pontos } },
                { new: true }
            );

            console.log(`✅ Pontos adicionados: ${material.pontos} pontos para ${usuario.nome}`);
        }

        await material.save();

        const materialPopulado = await MaterialReciclado.findById(material._id)
            .populate('usuario', 'nome email pontos')
            .populate('pontoColeta', 'nome endereco');

        res.json({
            success: true,
            message: `Material ${status} com sucesso!`,
            data: materialPopulado
        });
    } catch (err) {
        console.error('Erro ao validar material:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao validar material',
            error: err.message
        });
    }
});

// DELETE - Excluir material
router.delete('/:id', async (req, res) => {
    try {
        const material = await MaterialReciclado.findByIdAndDelete(req.params.id);

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Material excluído com sucesso!'
        });
    } catch (err) {
        console.error('Erro ao excluir material:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir material',
            error: err.message
        });
    }
});

// GET - Estatísticas gerais
router.get('/stats/geral', async (req, res) => {
    try {
        const totalMateriais = await MaterialReciclado.countDocuments();
        const materiaisValidados = await MaterialReciclado.countDocuments({ status: 'validado' });
        const materiaisPendentes = await MaterialReciclado.countDocuments({ status: 'pendente' });
        const materiaisRejeitados = await MaterialReciclado.countDocuments({ status: 'rejeitado' });

        // Total de kg reciclados (apenas validados)
        const totalReciclado = await MaterialReciclado.aggregate([
            { $match: { status: 'validado', unidade: 'kg' } },
            { $group: { _id: null, total: { $sum: '$quantidade' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalMateriais,
                materiaisValidados,
                materiaisPendentes,
                materiaisRejeitados,
                totalKgReciclado: totalReciclado[0]?.total || 0
            }
        });
    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            error: err.message
        });
    }
});

module.exports = router;