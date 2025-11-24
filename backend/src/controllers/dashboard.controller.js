const MaterialReciclado = require('../models/MaterialReciclado');
const TransacaoPontos = require('../models/TransacaoPontos');
const User = require('../models/UserModel');
const Estoque = require('../models/Estoque');
const Notificacao = require('../models/Notificacao');

// Dashboard do usuário
const getDashboardUsuario = async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const { periodo = 30 } = req.query;

        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        // Buscar dados do usuário
        const usuario = await User.findById(usuarioId).select('-senha');

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Estatísticas de materiais
        const materiaisStats = await MaterialReciclado.aggregate([
            {
                $match: {
                    usuario: usuario._id,
                    status: 'validado',
                    dataValidacao: { $gte: dataInicio }
                }
            },
            {
                $group: {
                    _id: '$tipo',
                    totalQuantidade: { $sum: '$quantidade' },
                    totalPontos: { $sum: '$pontos' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalPontos: -1 } }
        ]);

        // Estatísticas de pontos
        const pontosStats = await TransacaoPontos.getEstatisticas(usuarioId, parseInt(periodo));

        // Histórico recente
        const historicoRecente = await TransacaoPontos.find({
            usuario: usuarioId,
            status: 'concluida'
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Notificações não lidas
        const notificacoesNaoLidas = await Notificacao.countDocuments({
            usuario: usuarioId,
            lida: false
        });

        // Materiais pendentes de validação
        const materiaisPendentes = await MaterialReciclado.countDocuments({
            usuario: usuarioId,
            status: 'pendente'
        });

        // Ranking do usuário
        const usuarios = await User.find().sort({ pontos: -1 }).select('_id pontos');
        const posicaoRanking = usuarios.findIndex(u => u._id.equals(usuario._id)) + 1;

        // Progresso para próximas recompensas
        const Recompensa = require('../models/Recompensa');
        const proximasRecompensas = await Recompensa.find({
            disponivel: true,
            pontosNecessarios: { $gt: usuario.pontos }
        })
            .sort({ pontosNecessarios: 1 })
            .limit(3)
            .lean();

        const progressoRecompensas = proximasRecompensas.map(r => ({
            nome: r.nome,
            pontosNecessarios: r.pontosNecessarios,
            pontosAtuais: usuario.pontos,
            porcentagem: Math.min(100, (usuario.pontos / r.pontosNecessarios) * 100),
            pontosFaltando: r.pontosNecessarios - usuario.pontos
        }));

        // Resposta
        res.json({
            success: true,
            data: {
                usuario: {
                    id: usuario._id,
                    nome: usuario.nome,
                    email: usuario.email,
                    pontos: usuario.pontos,
                    pontosUtilizados: usuario.pontosUtilizados || 0,
                    pontosDisponiveis: usuario.pontos - (usuario.pontosUtilizados || 0),
                    role: usuario.role
                },
                periodo: {
                    dias: parseInt(periodo),
                    dataInicio,
                    dataFim: new Date()
                },
                estatisticas: {
                    materiais: materiaisStats,
                    pontos: pontosStats,
                    notificacoesNaoLidas,
                    materiaisPendentes
                },
                ranking: {
                    posicao: posicaoRanking,
                    total: usuarios.length
                },
                historicoRecente,
                progressoRecompensas
            }
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar dashboard do usuário',
            error: error.message
        });
    }
};

// Dashboard administrativo
const getDashboardAdmin = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;

        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        // Estatísticas gerais
        const [
            totalUsuarios,
            totalMateriais,
            materiaisValidados,
            materiaisPendentes,
            totalPontoColetas,
            alertasEstoque
        ] = await Promise.all([
            User.countDocuments({ role: 'usuario' }),
            MaterialReciclado.countDocuments(),
            MaterialReciclado.countDocuments({ status: 'validado' }),
            MaterialReciclado.countDocuments({ status: 'pendente' }),
            require('../models/PontoColeta').countDocuments({ ativo: true }),
            Estoque.countDocuments({ status: { $in: ['alerta', 'cheio'] } })
        ]);

        // Materiais por tipo
        const materiaisPorTipo = await MaterialReciclado.aggregate([
            {
                $match: {
                    status: 'validado',
                    dataValidacao: { $gte: dataInicio }
                }
            },
            {
                $group: {
                    _id: '$tipo',
                    totalQuantidade: { $sum: '$quantidade' },
                    totalPontos: { $sum: '$pontos' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalQuantidade: -1 } }
        ]);

        // Materiais por ponto de coleta
        const materiaisPorPonto = await MaterialReciclado.aggregate([
            {
                $match: {
                    status: 'validado',
                    dataValidacao: { $gte: dataInicio }
                }
            },
            {
                $group: {
                    _id: '$pontoColeta',
                    totalQuantidade: { $sum: '$quantidade' },
                    totalMateriais: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'pontocoletas',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'ponto'
                }
            },
            { $unwind: '$ponto' },
            { $sort: { totalQuantidade: -1 } },
            { $limit: 10 }
        ]);

        // Tendência de reciclagem (últimos 7 dias)
        const tendencia = await MaterialReciclado.aggregate([
            {
                $match: {
                    status: 'validado',
                    dataValidacao: {
                        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$dataValidacao' }
                    },
                    totalQuantidade: { $sum: '$quantidade' },
                    totalMateriais: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top usuários
        const topUsuarios = await User.find({ role: 'usuario' })
            .sort({ pontos: -1 })
            .limit(10)
            .select('nome email pontos');

        // Recompensas mais resgatadas
        const Recompensa = require('../models/Recompensa');
        const recompensas = await Recompensa.find().lean();

        res.json({
            success: true,
            data: {
                periodo: {
                    dias: parseInt(periodo),
                    dataInicio,
                    dataFim: new Date()
                },
                resumo: {
                    totalUsuarios,
                    totalMateriais,
                    materiaisValidados,
                    materiaisPendentes,
                    totalPontoColetas,
                    alertasEstoque,
                    taxaValidacao: totalMateriais > 0
                        ? ((materiaisValidados / totalMateriais) * 100).toFixed(1)
                        : 0
                },
                materiaisPorTipo,
                materiaisPorPonto: materiaisPorPonto.map(m => ({
                    pontoNome: m.ponto.nome,
                    pontoEndereco: m.ponto.endereco,
                    totalQuantidade: m.totalQuantidade,
                    totalMateriais: m.totalMateriais
                })),
                tendencia,
                topUsuarios,
                recompensasDisponiveis: recompensas.filter(r => r.disponivel).length
            }
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar dashboard administrativo',
            error: error.message
        });
    }
};

// Estatísticas de impacto ambiental
const getImpactoAmbiental = async (req, res) => {
    try {
        const { usuarioId, periodo = 365 } = req.query;

        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        const filtro = {
            status: 'validado',
            dataValidacao: { $gte: dataInicio }
        };

        if (usuarioId) {
            filtro.usuario = usuarioId;
        }

        const materiais = await MaterialReciclado.find(filtro).lean();

        // Cálculos de impacto (valores aproximados)
        const impacto = {
            papel: {
                kg: 0,
                arvoresSalvas: 0, // 1 árvore a cada 50kg
                aguaEconomizada: 0 // 100L por kg
            },
            plastico: {
                kg: 0,
                petroleoEconomizado: 0, // 2L por kg
                emissoesCO2Evitadas: 0 // 3kg CO2 por kg plástico
            },
            vidro: {
                kg: 0,
                energiaEconomizada: 0 // 25% de energia por kg
            },
            metal: {
                kg: 0,
                minerioEconomizado: 0, // 95% menos minerio
                energiaEconomizada: 0 // 74% menos energia
            },
            total: {
                kg: 0,
                pontos: 0
            }
        };

        materiais.forEach(m => {
            if (m.unidade === 'kg') {
                impacto.total.kg += m.quantidade;
                impacto.total.pontos += m.pontos;

                const tipo = m.tipo.toLowerCase();
                switch(tipo) {
                    case 'papel':
                        impacto.papel.kg += m.quantidade;
                        impacto.papel.arvoresSalvas = (impacto.papel.kg / 50);
                        impacto.papel.aguaEconomizada = impacto.papel.kg * 100;
                        break;
                    case 'plástico':
                        impacto.plastico.kg += m.quantidade;
                        impacto.plastico.petroleoEconomizado = impacto.plastico.kg * 2;
                        impacto.plastico.emissoesCO2Evitadas = impacto.plastico.kg * 3;
                        break;
                    case 'vidro':
                        impacto.vidro.kg += m.quantidade;
                        impacto.vidro.energiaEconomizada = impacto.vidro.kg * 0.25;
                        break;
                    case 'metal':
                        impacto.metal.kg += m.quantidade;
                        impacto.metal.minerioEconomizado = impacto.metal.kg * 0.95;
                        impacto.metal.energiaEconomizada = impacto.metal.kg * 0.74;
                        break;
                }
            }
        });

        // Arredondar valores
        Object.keys(impacto).forEach(tipo => {
            if (typeof impacto[tipo] === 'object') {
                Object.keys(impacto[tipo]).forEach(metrica => {
                    impacto[tipo][metrica] = Math.round(impacto[tipo][metrica] * 100) / 100;
                });
            }
        });

        res.json({
            success: true,
            data: {
                periodo: {
                    dias: parseInt(periodo),
                    dataInicio,
                    dataFim: new Date()
                },
                impacto,
                mensagemMotivacional: gerarMensagemMotivacional(impacto)
            }
        });
    } catch (error) {
        console.error('Erro ao calcular impacto ambiental:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao calcular impacto ambiental',
            error: error.message
        });
    }
};

// Função auxiliar para gerar mensagem motivacional
function gerarMensagemMotivacional(impacto) {
    const arvores = impacto.papel.arvoresSalvas;
    const co2 = impacto.plastico.emissoesCO2Evitadas;
    const totalKg = impacto.total.kg;

    if (totalKg === 0) {
        return "Comece sua jornada de reciclagem hoje! Cada pequeno passo faz diferença. 🌱";
    }

    const mensagens = [
        `Parabéns! Você já reciclou ${totalKg}kg de materiais! 🎉`,
        arvores >= 1 ? `Você ajudou a salvar ${arvores.toFixed(1)} árvores! 🌳` : null,
        co2 >= 10 ? `Você evitou ${co2.toFixed(1)}kg de emissões de CO2! ♻️` : null,
        "Continue assim e faça a diferença para o planeta! 🌍"
    ].filter(Boolean);

    return mensagens.join(' ');
}

module.exports = {
    getDashboardUsuario,
    getDashboardAdmin,
    getImpactoAmbiental
};