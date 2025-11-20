const express = require('express');
const router = express.Router();
const ValidacaoCruzada = require('../models/ValidacaoCruzada');
const MaterialReciclado = require('../models/MaterialReciclado');

// GET - Listar validações (com filtros)
router.get('/', async (req, res) => {
    try {
        const { usuarioId, pendente, status } = req.query;

        let filtro = {};
        if (usuarioId) filtro.validador = usuarioId;
        if (pendente === 'true') filtro.status = 'pendente';
        if (status) filtro.status = status;

        const validacoes = await ValidacaoCruzada.find(filtro)
            .populate({
                path: 'material',
                populate: [
                    { path: 'usuario', select: 'nome email' },
                    { path: 'pontoColeta', select: 'nome endereco' }
                ]
            })
            .populate('validador', 'nome email')
            .sort({ dataValidacao: -1 });

        res.json({
            success: true,
            count: validacoes.length,
            data: validacoes
        });
    } catch (err) {
        console.error('Erro ao buscar validações:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar validações',
            error: err.message
        });
    }
});

// GET - Buscar validação por ID
router.get('/:id', async (req, res) => {
    try {
        const validacao = await ValidacaoCruzada.findById(req.params.id)
            .populate({
                path: 'material',
                populate: [
                    { path: 'usuario', select: 'nome email' },
                    { path: 'pontoColeta', select: 'nome endereco' }
                ]
            })
            .populate('validador', 'nome email');

        if (!validacao) {
            return res.status(404).json({
                success: false,
                message: 'Validação não encontrada'
            });
        }

        res.json({
            success: true,
            data: validacao
        });
    } catch (err) {
        console.error('Erro ao buscar validação:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar validação',
            error: err.message
        });
    }
});

// POST - Criar nova validação cruzada
router.post('/', async (req, res) => {
    try {
        const { materialId, validadorId } = req.body;

        if (!materialId || !validadorId) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: materialId, validadorId'
            });
        }

        // Verificar se material existe
        const material = await MaterialReciclado.findById(materialId);
        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material não encontrado'
            });
        }

        // Verificar se já existe validação pendente para este material
        const validacaoExistente = await ValidacaoCruzada.findOne({
            material: materialId,
            status: 'pendente'
        });

        if (validacaoExistente) {
            return res.status(400).json({
                success: false,
                message: 'Já existe uma validação pendente para este material'
            });
        }

        const novaValidacao = new ValidacaoCruzada({
            material: materialId,
            validador: validadorId,
            status: 'pendente',
            dataValidacao: new Date()
        });

        await novaValidacao.save();

        const validacaoPopulada = await ValidacaoCruzada.findById(novaValidacao._id)
            .populate({
                path: 'material',
                populate: [
                    { path: 'usuario', select: 'nome email' },
                    { path: 'pontoColeta', select: 'nome endereco' }
                ]
            })
            .populate('validador', 'nome email');

        res.status(201).json({
            success: true,
            message: 'Validação cruzada criada com sucesso!',
            data: validacaoPopulada
        });
    } catch (err) {
        console.error('Erro ao criar validação:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar validação',
            error: err.message
        });
    }
});

// PUT - Confirmar/Rejeitar validação
router.put('/:id', async (req, res) => {
    try {
        const { confirmado, observacoes } = req.body;

        if (typeof confirmado !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Campo "confirmado" é obrigatório e deve ser boolean'
            });
        }

        const validacao = await ValidacaoCruzada.findById(req.params.id);

        if (!validacao) {
            return res.status(404).json({
                success: false,
                message: 'Validação não encontrada'
            });
        }

        if (validacao.status !== 'pendente') {
            return res.status(400).json({
                success: false,
                message: 'Esta validação já foi processada'
            });
        }

        validacao.status = confirmado ? 'validado' : 'rejeitado';
        validacao.comentario = observacoes || '';
        validacao.dataValidacao = new Date();

        await validacao.save();

        // Atualizar status do material se confirmado
        if (confirmado) {
            await MaterialReciclado.findByIdAndUpdate(
                validacao.material,
                {
                    status: 'validado',
                    dataValidacao: new Date()
                }
            );
        }

        const validacaoPopulada = await ValidacaoCruzada.findById(validacao._id)
            .populate({
                path: 'material',
                populate: [
                    { path: 'usuario', select: 'nome email' },
                    { path: 'pontoColeta', select: 'nome endereco' }
                ]
            })
            .populate('validador', 'nome email');

        res.json({
            success: true,
            message: `Validação ${confirmado ? 'confirmada' : 'rejeitada'} com sucesso!`,
            data: validacaoPopulada
        });
    } catch (err) {
        console.error('Erro ao processar validação:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar validação',
            error: err.message
        });
    }
});

// DELETE - Excluir validação
router.delete('/:id', async (req, res) => {
    try {
        const validacao = await ValidacaoCruzada.findByIdAndDelete(req.params.id);

        if (!validacao) {
            return res.status(404).json({
                success: false,
                message: 'Validação não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Validação excluída com sucesso!'
        });
    } catch (err) {
        console.error('Erro ao excluir validação:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir validação',
            error: err.message
        });
    }
});

module.exports = router;