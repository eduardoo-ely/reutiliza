const User = require('../models/UserModel');
const MaterialReciclado = require('../models/MaterialReciclado');
const PontoColeta = require('../models/PontoColeta');
const Recompensa = require('../models/Recompensa');
const ResgateRecompensa = require('../models/ResgateRecompensa');
const Denuncia = require('../models/Denuncia');
const TransacaoPontos = require('../models/TransacaoPontos');


exports.metricasGerais = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        const [
            totalUsuarios,
            usuariosAtivos,
            totalMateriais,
            materiaisValidados,
            totalPontos,
            pontosAtivos,
            totalResgates,
            pontosCirculacao,
            denunciasPendentes,
            materialPendente
        ] = await Promise.all([
            User.countDocuments({ role: 'usuario' }),
            User.countDocuments({
                role: 'usuario',
                ativo: true,
                lastLogin: { $gte: dataInicio }
            }),
            MaterialReciclado.countDocuments({
                createdAt: { $gte: dataInicio }
            }),
            MaterialReciclado.countDocuments({
                status: 'validado',
                createdAt: { $gte: dataInicio }
            }),
            PontoColeta.countDocuments(),
            PontoColeta.countDocuments({ ativo: true }),
            ResgateRecompensa.countDocuments({
                createdAt: { $gte: dataInicio }
            }),
            User.aggregate([
                { $match: { role: 'usuario' } },
                { $group: { _id: null, total: { $sum: '$pontos' } } }
            ]),
            Denuncia.countDocuments({ status: 'pendente' }),
            MaterialReciclado.countDocuments({ status: 'pendente' })
        ]);

        // Calcular crescimento
        const dataInicioPeriodoAnterior = new Date(dataInicio);
        dataInicioPeriodoAnterior.setDate(dataInicioPeriodoAnterior.getDate() - parseInt(periodo));

        const [usuariosAnteriores, materiaisAnteriores] = await Promise.all([
            User.countDocuments({
                role: 'usuario',
                createdAt: {
                    $gte: dataInicioPeriodoAnterior,
                    $lt: dataInicio
                }
            }),
            MaterialReciclado.countDocuments({
                createdAt: {
                    $gte: dataInicioPeriodoAnterior,
                    $lt: dataInicio
                }
            })
        ]);

        const novosUsuarios = totalUsuarios - usuariosAnteriores;
        const crescimentoUsuarios = usuariosAnteriores > 0
            ? ((novosUsuarios / usuariosAnteriores) * 100).toFixed(1)
            : 0;

        const crescimentoMateriais = materiaisAnteriores > 0
            ? (((totalMateriais - materiaisAnteriores) / materiaisAnteriores) * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            periodo: parseInt(periodo),
            data: {
                usuarios: {
                    total: totalUsuarios,
                    ativos: usuariosAtivos,
                    novos: novosUsuarios,
                    crescimento: parseFloat(crescimentoUsuarios),
                    taxaAtivacao: totalUsuarios > 0
                        ? ((usuariosAtivos / totalUsuarios) * 100).toFixed(1)
                        : 0
                },
                materiais: {
                    total: totalMateriais,
                    validados: materiaisValidados,
                    pendentes: materialPendente,
                    crescimento: parseFloat(crescimentoMateriais),
                    taxaValidacao: totalMateriais > 0
                        ? ((materiaisValidados / totalMateriais) * 100).toFixed(1)
                        : 0
                },
                pontos: {
                    total: totalPontos,
                    ativos: pontosAtivos,
                    inativos: totalPontos - pontosAtivos,
                    mediaUsuariosPorPonto: pontosAtivos > 0
                        ? (totalUsuarios / pontosAtivos).toFixed(1)
                        : 0
                },
                recompensas: {
                    totalResgates,
                    pontosEmCirculacao: pontosCirculacao[0]?.total || 0
                },
                alertas: {
                    denunciasPendentes,
                    materiaisPendentes: materialPendente
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar métricas gerais:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar métricas gerais',
            error: error.message
        });
    }
};

/**
 * Métricas de usuários
 */
exports.metricasUsuarios = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        const [
            usuariosPorDia,
            topUsuarios,
            distribuicaoPontos,
            usuariosPorCidade,
            taxaRetencao
        ] = await Promise.all([
            // Novos usuários por dia
            User.aggregate([
                { $match: {
                        role: 'usuario',
                        createdAt: { $gte: dataInicio }
                    }},
                { $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }},
                { $sort: { _id: 1 } }
            ]),

            // Top 10 usuários por pontos
            User.find({ role: 'usuario', ativo: true })
                .sort({ pontos: -1 })
                .limit(10)
                .select('nome email pontos pontosUtilizados')
                .lean(),

            // Distribuição de pontos
            User.aggregate([
                { $match: { role: 'usuario' } },
                { $bucket: {
                        groupBy: '$pontos',
                        boundaries: [0, 100, 500, 1000, 5000, 10000, Infinity],
                        default: 'Outros',
                        output: {
                            count: { $sum: 1 },
                            usuarios: { $push: '$nome' }
                        }
                    }}
            ]),

            // Usuários por cidade (top 10)
            User.aggregate([
                { $match: { role: 'usuario', 'endereco.cidade': { $exists: true } } },
                { $group: {
                        _id: '$endereco.cidade',
                        count: { $sum: 1 }
                    }},
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            // Taxa de retenção (usuários que logaram nos últimos 7 dias)
            (async () => {
                const data7Dias = new Date();
                data7Dias.setDate(data7Dias.getDate() - 7);

                const [totalAtivos, ativosRecentes] = await Promise.all([
                    User.countDocuments({ role: 'usuario', ativo: true }),
                    User.countDocuments({
                        role: 'usuario',
                        ativo: true,
                        lastLogin: { $gte: data7Dias }
                    })
                ]);

                return totalAtivos > 0
                    ? ((ativosRecentes / totalAtivos) * 100).toFixed(1)
                    : 0;
            })()
        ]);

        res.json({
            success: true,
            data: {
                usuariosPorDia,
                topUsuarios,
                distribuicaoPontos,
                usuariosPorCidade,
                taxaRetencao: parseFloat(taxaRetencao)
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar métricas de usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar métricas de usuários',
            error: error.message
        });
    }
};

/**
 * Métricas de materiais reciclados
 */
exports.metricasMateriais = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        const [
            materiaisPorTipo,
            materiaisPorDia,
            materiaisPorStatus,
            impactoAmbiental,
            mediaTempoValidacao
        ] = await Promise.all([
            // Materiais por tipo
            MaterialReciclado.aggregate([
                { $match: { createdAt: { $gte: dataInicio } } },
                { $group: {
                        _id: '$tipo',
                        count: { $sum: 1 },
                        quantidadeTotal: { $sum: '$quantidade' },
                        pontosTotal: { $sum: '$pontos' }
                    }},
                { $sort: { count: -1 } }
            ]),

            // Materiais registrados por dia
            MaterialReciclado.aggregate([
                { $match: { createdAt: { $gte: dataInicio } } },
                { $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                        quantidade: { $sum: '$quantidade' }
                    }},
                { $sort: { _id: 1 } }
            ]),

            // Materiais por status
            MaterialReciclado.aggregate([
                { $match: { createdAt: { $gte: dataInicio } } },
                { $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }}
            ]),

            // Impacto ambiental estimado
            MaterialReciclado.aggregate([
                { $match: {
                        createdAt: { $gte: dataInicio },
                        status: 'validado'
                    }},
                { $group: {
                        _id: '$tipo',
                        quantidadeTotal: { $sum: '$quantidade' }
                    }}
            ]),

            // Tempo médio de validação
            (async () => {
                const materiais = await MaterialReciclado.find({
                    createdAt: { $gte: dataInicio },
                    status: 'validado',
                    dataValidacao: { $exists: true }
                }).select('createdAt dataValidacao').lean();

                if (materiais.length === 0) return 0;

                const tempos = materiais.map(m =>
                    (new Date(m.dataValidacao) - new Date(m.createdAt)) / (1000 * 60 * 60)
                );

                const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
                return media.toFixed(1);
            })()
        ]);

        // Calcular impacto ambiental (exemplo simplificado)
        const impactos = {
            plastico: { co2: 2.5, agua: 3.0 }, // kg CO2 e litros de água economizados por kg
            papel: { co2: 1.5, agua: 10.0 },
            vidro: { co2: 0.8, agua: 1.0 },
            metal: { co2: 3.0, agua: 5.0 },
            eletronico: { co2: 5.0, agua: 15.0 }
        };

        const impactoTotal = impactoAmbiental.reduce((acc, item) => {
            const tipo = item._id.toLowerCase();
            const impacto = impactos[tipo] || { co2: 1.0, agua: 1.0 };

            return {
                co2Economizado: acc.co2Economizado + (item.quantidadeTotal * impacto.co2),
                aguaEconomizada: acc.aguaEconomizada + (item.quantidadeTotal * impacto.agua)
            };
        }, { co2Economizado: 0, aguaEconomizada: 0 });

        res.json({
            success: true,
            data: {
                materiaisPorTipo,
                materiaisPorDia,
                materiaisPorStatus,
                impactoAmbiental: {
                    co2Economizado: impactoTotal.co2Economizado.toFixed(2) + ' kg',
                    aguaEconomizada: impactoTotal.aguaEconomizada.toFixed(2) + ' litros',
                    detalhes: impactoAmbiental
                },
                mediaTempoValidacao: parseFloat(mediaTempoValidacao) + ' horas'
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar métricas de materiais:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar métricas de materiais',
            error: error.message
        });
    }
};

/**
 * Métricas de pontos de coleta
 */
exports.metricasPontosColeta = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        const [
            pontosMaisUtilizados,
            pontosPorTipo,
            pontosPorCidade,
            utilizacaoPorPonto
        ] = await Promise.all([
            // Pontos mais utilizados
            MaterialReciclado.aggregate([
                { $match: { createdAt: { $gte: dataInicio } } },
                { $group: {
                        _id: '$pontoColeta',
                        totalMateriais: { $sum: 1 },
                        totalQuantidade: { $sum: '$quantidade' }
                    }},
                { $sort: { totalMateriais: -1 } },
                { $limit: 10 },
                { $lookup: {
                        from: 'pontocoletas',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'ponto'
                    }},
                { $unwind: '$ponto' }
            ]),

            // Pontos por tipo
            PontoColeta.aggregate([
                { $match: { ativo: true } },
                { $group: {
                        _id: '$tipo',
                        count: { $sum: 1 }
                    }}
            ]),

            // Pontos por cidade
            PontoColeta.aggregate([
                { $match: { ativo: true } },
                { $group: {
                        _id: '$endereco.cidade',
                        count: { $sum: 1 }
                    }},
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            // Taxa de utilização por ponto
            (async () => {
                const pontos = await PontoColeta.countDocuments({ ativo: true });
                const materiais = await MaterialReciclado.countDocuments({
                    createdAt: { $gte: dataInicio }
                });

                return pontos > 0 ? (materiais / pontos).toFixed(1) : 0;
            })()
        ]);

        res.json({
            success: true,
            data: {
                pontosMaisUtilizados,
                pontosPorTipo,
                pontosPorCidade,
                mediaMateraisPorPonto: parseFloat(utilizacaoPorPonto)
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar métricas de pontos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar métricas de pontos de coleta',
            error: error.message
        });
    }
};

/**
 * Métricas de recompensas
 */
exports.metricasRecompensas = async (req, res) => {
    try {
        const { periodo = 30 } = req.query;
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        const stats = await ResgateRecompensa.getEstatisticas(parseInt(periodo));

        // Recompensas mais populares
        const recompensasPopulares = await ResgateRecompensa.aggregate([
            { $match: { createdAt: { $gte: dataInicio } } },
            { $group: {
                    _id: '$recompensa',
                    totalResgates: { $sum: 1 },
                    pontosUtilizados: { $sum: '$pontosUtilizados' }
                }},
            { $sort: { totalResgates: -1 } },
            { $limit: 10 },
            { $lookup: {
                    from: 'recompensas',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'recompensa'
                }},
            { $unwind: '$recompensa' }
        ]);

        res.json({
            success: true,
            data: {
                ...stats,
                recompensasPopulares
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar métricas de recompensas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar métricas de recompensas',
            error: error.message
        });
    }
};

/**
 * Tendências e projeções
 */
exports.tendencias = async (req, res) => {
    try {
        const { meses = 3 } = req.query;

        // Buscar dados dos últimos meses
        const dataInicio = new Date();
        dataInicio.setMonth(dataInicio.getMonth() - parseInt(meses));

        const [crescimentoUsuarios, crescimentoMateriais] = await Promise.all([
            User.aggregate([
                { $match: {
                        role: 'usuario',
                        createdAt: { $gte: dataInicio }
                    }},
                { $group: {
                        _id: {
                            ano: { $year: '$createdAt' },
                            mes: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }},
                { $sort: { '_id.ano': 1, '_id.mes': 1 } }
            ]),

            MaterialReciclado.aggregate([
                { $match: { createdAt: { $gte: dataInicio } } },
                { $group: {
                        _id: {
                            ano: { $year: '$createdAt' },
                            mes: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 },
                        quantidade: { $sum: '$quantidade' }
                    }},
                { $sort: { '_id.ano': 1, '_id.mes': 1 } }
            ])
        ]);

        // Calcular tendência (simplificado - média de crescimento)
        const calcularTendencia = (dados) => {
            if (dados.length < 2) return { tendencia: 'estavel', crescimento: 0 };

            const primeiro = dados[0].count;
            const ultimo = dados[dados.length - 1].count;
            const crescimento = ((ultimo - primeiro) / primeiro) * 100;

            let tendencia = 'estavel';
            if (crescimento > 10) tendencia = 'crescente';
            else if (crescimento < -10) tendencia = 'decrescente';

            return { tendencia, crescimento: crescimento.toFixed(1) };
        };

        res.json({
            success: true,
            data: {
                usuarios: {
                    dados: crescimentoUsuarios,
                    ...calcularTendencia(crescimentoUsuarios)
                },
                materiais: {
                    dados: crescimentoMateriais,
                    ...calcularTendencia(crescimentoMateriais)
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar tendências:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar tendências',
            error: error.message
        });
    }
};

/**
 * Comparativo entre períodos
 */
exports.comparativoPeriodos = async (req, res) => {
    try {
        const { periodo1, periodo2 } = req.query;

        if (!periodo1 || !periodo2) {
            return res.status(400).json({
                success: false,
                message: 'Períodos são obrigatórios (formato: YYYY-MM-DD)'
            });
        }

        const [data1Inicio, data1Fim] = periodo1.split(',');
        const [data2Inicio, data2Fim] = periodo2.split(',');

        const buscarDadosPeriodo = async (inicio, fim) => {
            const [usuarios, materiais, resgates] = await Promise.all([
                User.countDocuments({
                    role: 'usuario',
                    createdAt: { $gte: new Date(inicio), $lte: new Date(fim) }
                }),
                MaterialReciclado.countDocuments({
                    createdAt: { $gte: new Date(inicio), $lte: new Date(fim) }
                }),
                ResgateRecompensa.countDocuments({
                    createdAt: { $gte: new Date(inicio), $lte: new Date(fim) }
                })
            ]);

            return { usuarios, materiais, resgates };
        };

        const [periodo1Dados, periodo2Dados] = await Promise.all([
            buscarDadosPeriodo(data1Inicio, data1Fim),
            buscarDadosPeriodo(data2Inicio, data2Fim)
        ]);

        // Calcular diferenças percentuais
        const calcularDiferenca = (valor1, valor2) => {
            if (valor2 === 0) return 0;
            return (((valor1 - valor2) / valor2) * 100).toFixed(1);
        };

        res.json({
            success: true,
            data: {
                periodo1: periodo1Dados,
                periodo2: periodo2Dados,
                diferencas: {
                    usuarios: calcularDiferenca(periodo1Dados.usuarios, periodo2Dados.usuarios),
                    materiais: calcularDiferenca(periodo1Dados.materiais, periodo2Dados.materiais),
                    resgates: calcularDiferenca(periodo1Dados.resgates, periodo2Dados.resgates)
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao comparar períodos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao comparar períodos',
            error: error.message
        });
    }
};

/**
 * Exportar relatório
 */
exports.exportarRelatorio = async (req, res) => {
    try {
        const { tipo = 'geral', formato = 'json', periodo = 30 } = req.query;

        let dados;

        switch (tipo) {
            case 'geral':
                dados = await exports.metricasGerais(req, { json: (d) => d });
                break;
            case 'usuarios':
                dados = await exports.metricasUsuarios(req, { json: (d) => d });
                break;
            case 'materiais':
                dados = await exports.metricasMateriais(req, { json: (d) => d });
                break;
            default:
                dados = { success: false, message: 'Tipo de relatório inválido' };
        }

        if (formato === 'csv') {
            // Converter para CSV (implementar depois)
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tipo}_${Date.now()}.csv`);
            return res.send('CSV export não implementado ainda');
        }

        res.json(dados);
    } catch (error) {
        console.error('❌ Erro ao exportar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao exportar relatório',
            error: error.message
        });
    }
};