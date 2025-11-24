const Estoque = require('../models/Estoque');
const MovimentacaoEstoque = require('../models/MovimentacaoEstoque');
const PontoColeta = require('../models/PontoColeta');

// Obter estoque por ponto de coleta
const getEstoquePorPonto = async (req, res) => {
    try {
        const { pontoColetaId } = req.params;

        const estoques = await Estoque.getPorPonto(pontoColetaId);

        res.json({
            success: true,
            data: estoques
        });
    } catch (error) {
        console.error('Erro ao buscar estoque:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estoque do ponto de coleta',
            error: error.message
        });
    }
};

// Obter todos os estoques
const getTodosEstoques = async (req, res) => {
    try {
        const { status, tipoMaterial } = req.query;

        const filtro = {};
        if (status) filtro.status = status;
        if (tipoMaterial) filtro.tipoMaterial = tipoMaterial;

        const estoques = await Estoque.find(filtro)
            .populate('pontoColeta', 'nome endereco telefone')
            .sort({ status: -1, quantidadeAtual: -1 });

        res.json({
            success: true,
            count: estoques.length,
            data: estoques
        });
    } catch (error) {
        console.error('Erro ao buscar estoques:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estoques',
            error: error.message
        });
    }
};

// Obter alertas de estoque
const getAlertas = async (req, res) => {
    try {
        const alertas = await Estoque.getAlertas();

        res.json({
            success: true,
            count: alertas.length,
            data: alertas
        });
    } catch (error) {
        console.error('Erro ao buscar alertas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar alertas de estoque',
            error: error.message
        });
    }
};

// Criar ou atualizar estoque
const criarOuAtualizarEstoque = async (req, res) => {
    try {
        const {
            pontoColeta,
            tipoMaterial,
            quantidadeAtual,
            unidade,
            capacidadeMaxima,
            nivelAlerta
        } = req.body;

        if (!pontoColeta || !tipoMaterial || !unidade) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: pontoColeta, tipoMaterial, unidade'
            });
        }

        // Verificar se já existe
        let estoque = await Estoque.findOne({ pontoColeta, tipoMaterial });

        if (estoque) {
            // Atualizar existente
            estoque.quantidadeAtual = quantidadeAtual !== undefined ? quantidadeAtual : estoque.quantidadeAtual;
            estoque.unidade = unidade;
            estoque.capacidadeMaxima = capacidadeMaxima || estoque.capacidadeMaxima;
            estoque.nivelAlerta = nivelAlerta || estoque.nivelAlerta;
            await estoque.save();
        } else {
            // Criar novo
            estoque = await Estoque.create({
                pontoColeta,
                tipoMaterial,
                quantidadeAtual: quantidadeAtual || 0,
                unidade,
                capacidadeMaxima: capacidadeMaxima || 1000,
                nivelAlerta: nivelAlerta || 800
            });
        }

        await estoque.populate('pontoColeta', 'nome endereco');

        res.status(estoque.isNew ? 201 : 200).json({
            success: true,
            message: estoque.isNew ? 'Estoque criado com sucesso' : 'Estoque atualizado com sucesso',
            data: estoque
        });
    } catch (error) {
        console.error('Erro ao criar/atualizar estoque:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar estoque',
            error: error.message
        });
    }
};

// Adicionar ao estoque
const adicionarAoEstoque = async (req, res) => {
    try {
        const { estoqueId } = req.params;
        const { quantidade, responsavel, materialRecicladoId, observacoes } = req.body;

        if (!quantidade || quantidade <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade deve ser maior que zero'
            });
        }

        const estoque = await Estoque.findById(estoqueId);

        if (!estoque) {
            return res.status(404).json({
                success: false,
                message: 'Estoque não encontrado'
            });
        }

        await estoque.adicionar(quantidade);

        // Atualizar a última movimentação com informações adicionais
        if (responsavel || materialRecicladoId || observacoes) {
            const ultimaMovimentacao = await MovimentacaoEstoque.findOne({
                estoque: estoqueId,
                tipo: 'entrada'
            }).sort({ createdAt: -1 });

            if (ultimaMovimentacao) {
                if (responsavel) ultimaMovimentacao.responsavel = responsavel;
                if (materialRecicladoId) ultimaMovimentacao.materialReciclado = materialRecicladoId;
                if (observacoes) ultimaMovimentacao.observacoes = observacoes;
                await ultimaMovimentacao.save();
            }
        }

        res.json({
            success: true,
            message: 'Quantidade adicionada ao estoque com sucesso',
            data: estoque
        });
    } catch (error) {
        console.error('Erro ao adicionar ao estoque:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao adicionar ao estoque',
            error: error.message
        });
    }
};

// Remover do estoque
const removerDoEstoque = async (req, res) => {
    try {
        const { estoqueId } = req.params;
        const { quantidade, motivo, responsavel, observacoes } = req.body;

        if (!quantidade || quantidade <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade deve ser maior que zero'
            });
        }

        const estoque = await Estoque.findById(estoqueId);

        if (!estoque) {
            return res.status(404).json({
                success: false,
                message: 'Estoque não encontrado'
            });
        }

        await estoque.remover(quantidade, motivo || 'coleta');

        // Atualizar a última movimentação com informações adicionais
        if (responsavel || observacoes) {
            const ultimaMovimentacao = await MovimentacaoEstoque.findOne({
                estoque: estoqueId,
                tipo: 'saida'
            }).sort({ createdAt: -1 });

            if (ultimaMovimentacao) {
                if (responsavel) ultimaMovimentacao.responsavel = responsavel;
                if (observacoes) ultimaMovimentacao.observacoes = observacoes;
                await ultimaMovimentacao.save();
            }
        }

        res.json({
            success: true,
            message: 'Quantidade removida do estoque com sucesso',
            data: estoque
        });
    } catch (error) {
        console.error('Erro ao remover do estoque:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao remover do estoque',
            error: error.message
        });
    }
};

// Obter movimentações
const getMovimentacoes = async (req, res) => {
    try {
        const filtros = {
            pontoColetaId: req.query.pontoColetaId,
            tipoMaterial: req.query.tipoMaterial,
            tipo: req.query.tipo,
            dataInicio: req.query.dataInicio,
            dataFim: req.query.dataFim,
            limite: parseInt(req.query.limite) || 100,
            pagina: parseInt(req.query.pagina) || 1
        };

        const resultado = await MovimentacaoEstoque.getRelatorio(filtros);

        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Erro ao buscar movimentações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar movimentações de estoque',
            error: error.message
        });
    }
};

// Obter estatísticas de estoque
const getEstatisticas = async (req, res) => {
    try {
        const { pontoColetaId } = req.params;
        const { periodo = 30 } = req.query;

        const estatisticas = await MovimentacaoEstoque.getEstatisticas(
            pontoColetaId,
            parseInt(periodo)
        );

        res.json({
            success: true,
            data: estatisticas
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas de estoque',
            error: error.message
        });
    }
};

module.exports = {
    getEstoquePorPonto,
    getTodosEstoques,
    getAlertas,
    criarOuAtualizarEstoque,
    adicionarAoEstoque,
    removerDoEstoque,
    getMovimentacoes,
    getEstatisticas
};