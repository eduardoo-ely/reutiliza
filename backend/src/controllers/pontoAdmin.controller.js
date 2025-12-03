const PontoColeta = require('../models/PontoColeta');
const AuditoriaAdmin = require('../models/AuditoriaAdmin');
const Notificacao = require('../models/Notificacao');
const User = require('../models/UserModel');

exports.listarTodos = async (req, res) => {
    try {
        const {
            ativo,
            tipo,
            cidade,
            limite = 50,
            pagina = 1,
            busca
        } = req.query;

        const filtro = {};

        if (ativo !== undefined) {
            filtro.ativo = ativo === 'true';
        }

        if (tipo) {
            filtro.tipo = tipo;
        }

        if (cidade) {
            filtro['endereco.cidade'] = new RegExp(cidade, 'i');
        }

        if (busca) {
            filtro.$or = [
                { nome: new RegExp(busca, 'i') },
                { 'endereco.rua': new RegExp(busca, 'i') },
                { 'endereco.bairro': new RegExp(busca, 'i') }
            ];
        }

        const skip = (parseInt(pagina) - 1) * parseInt(limite);

        const [pontos, total] = await Promise.all([
            PontoColeta.find(filtro)
                .populate('responsavel', 'nome email')
                .sort({ nome: 1 })
                .limit(parseInt(limite))
                .skip(skip)
                .lean(),
            PontoColeta.countDocuments(filtro)
        ]);

        res.json({
            success: true,
            data: {
                pontos,
                total,
                pagina: parseInt(pagina),
                totalPaginas: Math.ceil(total / parseInt(limite))
            }
        });
    } catch (error) {
        console.error('❌ Erro ao listar pontos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar pontos de coleta',
            error: error.message
        });
    }
};

/**
 * Buscar ponto por ID
 */
exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const ponto = await PontoColeta.findById(id)
            .populate('responsavel', 'nome email')
            .lean();

        if (!ponto) {
            return res.status(404).json({
                success: false,
                message: 'Ponto de coleta não encontrado'
            });
        }

        res.json({
            success: true,
            data: ponto
        });
    } catch (error) {
        console.error('❌ Erro ao buscar ponto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar ponto de coleta',
            error: error.message
        });
    }
};

/**
 * Criar novo ponto de coleta
 */
exports.criar = async (req, res) => {
    try {
        const adminId = req.admin._id || req.admin.id;

        const pontoData = {
            ...req.body,
            responsavel: adminId,
            ativo: true,
            ultimaVerificacao: new Date()
        };

        const ponto = await PontoColeta.create(pontoData);

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'criar',
            modulo: 'pontos',
            registroId: ponto._id,
            registroTipo: 'PontoColeta',
            dadosNovos: pontoData,
            descricao: `Criado ponto de coleta: ${ponto.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'media'
        });

        // Notificar usuários próximos (opcional - implementar depois)
        // await notificarUsuariosProximos(ponto);

        res.status(201).json({
            success: true,
            message: 'Ponto de coleta criado com sucesso',
            data: ponto
        });
    } catch (error) {
        console.error('❌ Erro ao criar ponto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar ponto de coleta',
            error: error.message
        });
    }
};

/**
 * Editar ponto de coleta
 */
exports.editar = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id || req.admin.id;

        // Buscar dados antigos para auditoria
        const pontoAntigo = await PontoColeta.findById(id).lean();

        if (!pontoAntigo) {
            return res.status(404).json({
                success: false,
                message: 'Ponto de coleta não encontrado'
            });
        }

        // Atualizar ponto
        const pontoAtualizado = await PontoColeta.findByIdAndUpdate(
            id,
            {
                ...req.body,
                ultimaVerificacao: new Date()
            },
            { new: true }
        );

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'editar',
            modulo: 'pontos',
            registroId: id,
            registroTipo: 'PontoColeta',
            dadosAnteriores: pontoAntigo,
            dadosNovos: req.body,
            descricao: `Editado ponto de coleta: ${pontoAtualizado.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'media'
        });

        // Se mudou localização significativamente, notificar usuários
        if (mudouLocalizacao(pontoAntigo.localizacao, pontoAtualizado.localizacao)) {
            await notificarAlteracaoLocalizacao(pontoAtualizado);
        }

        res.json({
            success: true,
            message: 'Ponto de coleta atualizado com sucesso',
            data: pontoAtualizado
        });
    } catch (error) {
        console.error('❌ Erro ao editar ponto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao editar ponto de coleta',
            error: error.message
        });
    }
};

/**
 * Deletar ponto de coleta
 */
exports.deletar = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id || req.admin.id;

        const ponto = await PontoColeta.findById(id);

        if (!ponto) {
            return res.status(404).json({
                success: false,
                message: 'Ponto de coleta não encontrado'
            });
        }

        // Soft delete - apenas marca como inativo
        ponto.ativo = false;
        ponto.motivoDesativacao = 'Deletado pelo administrador';
        await ponto.save();

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'deletar',
            modulo: 'pontos',
            registroId: id,
            registroTipo: 'PontoColeta',
            dadosAnteriores: ponto.toObject(),
            descricao: `Deletado ponto de coleta: ${ponto.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'alta'
        });

        res.json({
            success: true,
            message: 'Ponto de coleta deletado com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao deletar ponto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar ponto de coleta',
            error: error.message
        });
    }
};

/**
 * Ativar ponto de coleta
 */
exports.ativar = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id || req.admin.id;

        const ponto = await PontoColeta.findByIdAndUpdate(
            id,
            {
                ativo: true,
                motivoDesativacao: null,
                ultimaVerificacao: new Date()
            },
            { new: true }
        );

        if (!ponto) {
            return res.status(404).json({
                success: false,
                message: 'Ponto de coleta não encontrado'
            });
        }

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'ativar',
            modulo: 'pontos',
            registroId: id,
            registroTipo: 'PontoColeta',
            descricao: `Ativado ponto de coleta: ${ponto.nome}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'media'
        });

        res.json({
            success: true,
            message: 'Ponto de coleta ativado com sucesso',
            data: ponto
        });
    } catch (error) {
        console.error('❌ Erro ao ativar ponto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao ativar ponto de coleta',
            error: error.message
        });
    }
};

/**
 * Desativar ponto de coleta
 */
exports.desativar = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const adminId = req.admin._id || req.admin.id;

        if (!motivo) {
            return res.status(400).json({
                success: false,
                message: 'Motivo da desativação é obrigatório'
            });
        }

        const ponto = await PontoColeta.findByIdAndUpdate(
            id,
            {
                ativo: false,
                motivoDesativacao: motivo,
                ultimaVerificacao: new Date()
            },
            { new: true }
        );

        if (!ponto) {
            return res.status(404).json({
                success: false,
                message: 'Ponto de coleta não encontrado'
            });
        }

        // Registrar na auditoria
        await AuditoriaAdmin.registrar({
            admin: adminId,
            acao: 'desativar',
            modulo: 'pontos',
            registroId: id,
            registroTipo: 'PontoColeta',
            dadosNovos: { motivo },
            descricao: `Desativado ponto de coleta: ${ponto.nome} - Motivo: ${motivo}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            severidade: 'alta'
        });

        // Notificar usuários que usam este ponto
        await notificarDesativacao(ponto);

        res.json({
            success: true,
            message: 'Ponto de coleta desativado com sucesso',
            data: ponto
        });
    } catch (error) {
        console.error('❌ Erro ao desativar ponto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao desativar ponto de coleta',
            error: error.message
        });
    }
};

/**
 * Obter histórico de alterações do ponto
 */
exports.historico = async (req, res) => {
    try {
        const { id } = req.params;

        const historico = await AuditoriaAdmin.getHistoricoRegistro(id);

        res.json({
            success: true,
            data: historico
        });
    } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar histórico do ponto',
            error: error.message
        });
    }
};

/**
 * Obter estatísticas de pontos de coleta
 */
exports.estatisticas = async (req, res) => {
    try {
        const [
            totalPontos,
            pontosAtivos,
            pontosInativos,
            pontosPorTipo,
            pontosPorCidade
        ] = await Promise.all([
            PontoColeta.countDocuments(),
            PontoColeta.countDocuments({ ativo: true }),
            PontoColeta.countDocuments({ ativo: false }),

            PontoColeta.aggregate([
                { $group: { _id: '$tipo', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            PontoColeta.aggregate([
                { $group: { _id: '$endereco.cidade', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        res.json({
            success: true,
            data: {
                total: totalPontos,
                ativos: pontosAtivos,
                inativos: pontosInativos,
                porTipo: pontosPorTipo,
                porCidade: pontosPorCidade
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            error: error.message
        });
    }
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Verificar se a localização mudou significativamente
 */
function mudouLocalizacao(locAntiga, locNova) {
    if (!locAntiga || !locNova) return false;

    const [latAntiga, lngAntiga] = locAntiga.coordinates;
    const [latNova, lngNova] = locNova.coordinates;

    // Calcular distância (simplificado)
    const distancia = Math.sqrt(
        Math.pow(latNova - latAntiga, 2) +
        Math.pow(lngNova - lngAntiga, 2)
    );

    // Se mudou mais de 0.01 graus (~1km), considerar significativo
    return distancia > 0.01;
}

/**
 * Notificar usuários sobre alteração de localização
 */
async function notificarAlteracaoLocalizacao(ponto) {
    try {
        // Buscar usuários que já usaram este ponto
        const MaterialReciclado = require('../models/MaterialReciclado');

        const materiaisNoPonto = await MaterialReciclado.find({
            pontoColeta: ponto._id
        }).distinct('usuario');

        // Criar notificação para cada usuário
        const notificacoes = materiaisNoPonto.map(userId => ({
            usuario: userId,
            tipo: 'sistema',
            titulo: '📍 Ponto de Coleta Movido',
            mensagem: `O ponto de coleta "${ponto.nome}" mudou de localização. Verifique o novo endereço no mapa.`,
            prioridade: 'alta',
            referencia: {
                tipo: 'ponto_coleta',
                id: ponto._id
            }
        }));

        await Notificacao.insertMany(notificacoes);
    } catch (error) {
        console.error('❌ Erro ao notificar alteração:', error);
    }
}

/**
 * Notificar usuários sobre desativação do ponto
 */
async function notificarDesativacao(ponto) {
    try {
        const MaterialReciclado = require('../models/MaterialReciclado');

        // Usuários que usaram este ponto nos últimos 30 dias
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);

        const usuariosAtivos = await MaterialReciclado.find({
            pontoColeta: ponto._id,
            createdAt: { $gte: dataLimite }
        }).distinct('usuario');

        const notificacoes = usuariosAtivos.map(userId => ({
            usuario: userId,
            tipo: 'sistema',
            titulo: '⚠️ Ponto de Coleta Desativado',
            mensagem: `O ponto de coleta "${ponto.nome}" foi desativado. Motivo: ${ponto.motivoDesativacao}. Procure outros pontos próximos.`,
            prioridade: 'alta',
            referencia: {
                tipo: 'ponto_coleta',
                id: ponto._id
            }
        }));

        await Notificacao.insertMany(notificacoes);
    } catch (error) {
        console.error('❌ Erro ao notificar desativação:', error);
    }
}