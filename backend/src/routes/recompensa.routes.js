const express = require('express');
const router = express.Router();
const Recompensa = require('../models/Recompensa');
const User = require('../models/UserModel');
const TransacaoPontos = require('../models/TransacaoPontos');
const Notificacao = require('../models/Notificacao');

// GET - Listar todas as recompensas (com filtros opcionais)
router.get('/', async (req, res) => {
    try {
        const { disponivel, categoria } = req.query;

        console.log('📦 Buscando recompensas...');

        let filtro = { ativo: true };

        if (disponivel === 'true') {
            filtro.disponivel = true;
        }

        if (categoria) {
            filtro.categoria = categoria;
        }

        const recompensas = await Recompensa.find(filtro).sort({ pontosNecessarios: 1 });

        console.log(`✅ ${recompensas.length} recompensas encontradas`);

        // Filtrar recompensas válidas (não expiradas e com estoque)
        const agora = new Date();
        const recompensasValidas = recompensas.filter(r => {
            // Verificar validade
            if (r.validade && agora > r.validade) {
                console.log(`⏰ Recompensa "${r.nome}" expirada`);
                return false;
            }

            // Verificar estoque
            if (r.quantidadeDisponivel !== -1 &&
                r.quantidadeResgatada >= r.quantidadeDisponivel) {
                console.log(`📦 Recompensa "${r.nome}" sem estoque`);
                return false;
            }

            return true;
        });

        console.log(`✅ ${recompensasValidas.length} recompensas disponíveis`);

        res.json({
            success: true,
            count: recompensasValidas.length,
            data: recompensasValidas
        });
    } catch (error) {
        console.error('❌ Erro ao buscar recompensas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar recompensas.',
            error: error.message
        });
    }
});

// GET - Buscar recompensa por ID
router.get('/:id', async (req, res) => {
    try {
        const recompensa = await Recompensa.findById(req.params.id);

        if (!recompensa) {
            return res.status(404).json({
                success: false,
                message: 'Recompensa não encontrada'
            });
        }

        res.json({
            success: true,
            data: recompensa
        });
    } catch (error) {
        console.error('❌ Erro ao buscar recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar recompensa',
            error: error.message
        });
    }
});

// POST - Resgatar uma recompensa
router.post('/resgatar', async (req, res) => {
    const { usuarioId, recompensaId } = req.body;

    try {
        console.log('🎁 Tentando resgatar recompensa...');
        console.log('   Usuario:', usuarioId);
        console.log('   Recompensa:', recompensaId);

        // Validações básicas
        if (!usuarioId || !recompensaId) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: usuarioId, recompensaId'
            });
        }

        // Buscar usuário e recompensa
        const user = await User.findById(usuarioId);
        const recompensa = await Recompensa.findById(recompensaId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado.'
            });
        }

        if (!recompensa) {
            return res.status(404).json({
                success: false,
                message: 'Recompensa não encontrada.'
            });
        }

        console.log('✅ Usuário:', user.nome);
        console.log('✅ Recompensa:', recompensa.nome);

        // Verificar disponibilidade
        if (!recompensa.disponivel || !recompensa.ativo) {
            return res.status(400).json({
                success: false,
                message: 'Recompensa não está disponível.'
            });
        }

        // Verificar validade
        if (recompensa.validade && new Date() > recompensa.validade) {
            return res.status(400).json({
                success: false,
                message: 'Recompensa expirada.'
            });
        }

        // Verificar estoque
        if (recompensa.quantidadeDisponivel !== -1 &&
            recompensa.quantidadeResgatada >= recompensa.quantidadeDisponivel) {
            return res.status(400).json({
                success: false,
                message: 'Recompensa esgotada.'
            });
        }

        // Calcular pontos necessários
        const pontosNecessarios = recompensa.pontosNecessarios || recompensa.custoEmPontos || 0;
        const pontosDisponiveis = (user.pontos || 0) - (user.pontosUtilizados || 0);

        console.log('💰 Pontos necessários:', pontosNecessarios);
        console.log('💰 Pontos disponíveis:', pontosDisponiveis);

        if (pontosDisponiveis < pontosNecessarios) {
            return res.status(400).json({
                success: false,
                message: `Pontos insuficientes. Você tem ${pontosDisponiveis} pontos e precisa de ${pontosNecessarios}.`
            });
        }

        // Processar resgate
        user.pontosUtilizados = (user.pontosUtilizados || 0) + pontosNecessarios;
        await user.save();

        console.log('✅ Pontos atualizados:', user.pontosUtilizados);

        // Atualizar recompensa
        if (recompensa.quantidadeDisponivel !== -1) {
            recompensa.quantidadeResgatada = (recompensa.quantidadeResgatada || 0) + 1;

            if (recompensa.quantidadeResgatada >= recompensa.quantidadeDisponivel) {
                recompensa.disponivel = false;
            }

            await recompensa.save();
            console.log('✅ Recompensa atualizada:', recompensa.quantidadeResgatada);
        }

        // Criar transação de pontos
        await TransacaoPontos.create({
            usuario: user._id,
            tipo: 'gasto',
            pontos: pontosNecessarios,
            saldoAnterior: user.pontos,
            saldoAtual: user.pontos,
            descricao: `Resgate de recompensa: ${recompensa.nome}`,
            origem: {
                tipo: 'recompensa',
                id: recompensa._id
            },
            status: 'concluida',
            metadata: {
                recompensaNome: recompensa.nome,
                codigo: recompensa.codigo
            }
        });

        console.log('✅ Transação criada');

        // Criar notificação
        await Notificacao.create({
            usuario: user._id,
            tipo: 'recompensa_resgatada',
            titulo: '🎉 Recompensa Resgatada!',
            mensagem: `Você resgatou: ${recompensa.nome}${recompensa.codigo ? ` - Código: ${recompensa.codigo}` : ''}`,
            prioridade: 'alta',
            referencia: {
                tipo: 'recompensa',
                id: recompensa._id
            },
            metadata: {
                recompensaNome: recompensa.nome,
                pontosGastos: pontosNecessarios,
                codigo: recompensa.codigo
            }
        });

        console.log('✅ Notificação criada');

        // Resposta de sucesso
        res.json({
            success: true,
            message: 'Recompensa resgatada com sucesso!',
            data: {
                recompensa: {
                    nome: recompensa.nome,
                    codigo: recompensa.codigo,
                    tipo: recompensa.tipo,
                    descricao: recompensa.descricao
                },
                pontosGastos: pontosNecessarios,
                pontosRestantes: (user.pontos || 0) - user.pontosUtilizados
            }
        });

        console.log('✅ Resgate concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao resgatar recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao resgatar recompensa.',
            error: error.message
        });
    }
});

// POST - Criar nova recompensa (admin)
router.post('/', async (req, res) => {
    try {
        const recompensa = await Recompensa.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Recompensa criada com sucesso',
            data: recompensa
        });
    } catch (error) {
        console.error('❌ Erro ao criar recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar recompensa',
            error: error.message
        });
    }
});

// PUT - Atualizar recompensa (admin)
router.put('/:id', async (req, res) => {
    try {
        const recompensa = await Recompensa.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!recompensa) {
            return res.status(404).json({
                success: false,
                message: 'Recompensa não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Recompensa atualizada com sucesso',
            data: recompensa
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar recompensa',
            error: error.message
        });
    }
});

// DELETE - Remover recompensa (admin)
router.delete('/:id', async (req, res) => {
    try {
        const recompensa = await Recompensa.findByIdAndDelete(req.params.id);

        if (!recompensa) {
            return res.status(404).json({
                success: false,
                message: 'Recompensa não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Recompensa removida com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao remover recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao remover recompensa',
            error: error.message
        });
    }
});

// GET - Estatísticas de recompensas
router.get('/stats/geral', async (req, res) => {
    try {
        const stats = await Recompensa.getEstatisticas();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            error: error.message
        });
    }
});

module.exports = router;