require('dotenv').config();
const mongoose = require('mongoose');

// ==========================================
// CONEXÃO COM MONGODB
// ==========================================
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'ReutilizaDB';

if (!MONGO_URI) {
    console.error('❌ ERRO: MONGO_URI não encontrado no .env');
    process.exit(1);
}

// ==========================================
// IMPORTAR MODELS
// ==========================================
const MaterialReciclado = require('/src/models/MaterialReciclado');
const TransacaoPontos = require('/src/models/TransacaoPontos');
const Estoque = require('/src/models/Estoque');
const PontoColeta = require('/src/models/PontoColeta');
const User = require('/src/models/UserModel');
const Notificacao = require('/src/models/Notificacao');

// ==========================================
// FUNÇÃO PRINCIPAL DO ETL
// ==========================================
async function executarETL() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 INICIANDO ETL - REUTILIZA');
    console.log('='.repeat(60) + '\n');

    try {
        // Conectar ao MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB Atlas');
        console.log(`📊 Database: ${mongoose.connection.db.databaseName}\n`);

        // ==========================================
        // EXTRAÇÃO DE DADOS
        // ==========================================
        console.log('📥 FASE 1: EXTRAÇÃO DE DADOS');
        console.log('-'.repeat(60));

        const [usuarios, pontos, materiais, estoques, transacoes, notificacoes] = await Promise.all([
            User.find().lean(),
            PontoColeta.find().lean(),
            MaterialReciclado.find().lean(),
            Estoque.find().populate('pontoColeta', 'nome').lean(),
            TransacaoPontos.find().lean(),
            Notificacao.find().lean()
        ]);

        console.log(`   👥 Usuários: ${usuarios.length}`);
        console.log(`   📍 Pontos de Coleta: ${pontos.length}`);
        console.log(`   ♻️  Materiais Reciclados: ${materiais.length}`);
        console.log(`   📦 Estoques: ${estoques.length}`);
        console.log(`   💰 Transações: ${transacoes.length}`);
        console.log(`   🔔 Notificações: ${notificacoes.length}\n`);

        // ==========================================
        // TRANSFORMAÇÃO DE DADOS
        // ==========================================
        console.log('🔄 FASE 2: TRANSFORMAÇÃO DE DADOS');
        console.log('-'.repeat(60));

        // 2.1 - Estatísticas de Materiais
        const estatisticasMateriais = calcularEstatisticasMateriais(materiais);
        console.log('   ✅ Estatísticas de materiais calculadas');

        // 2.2 - Alertas de Estoque
        const alertasEstoque = identificarAlertasEstoque(estoques);
        console.log(`   ⚠️  Alertas de estoque identificados: ${alertasEstoque.length}`);

        // 2.3 - Relatório de Pontos por Usuário
        const relatorioPontos = calcularRelatorioPontos(usuarios, transacoes);
        console.log('   📊 Relatório de pontos por usuário calculado');

        // 2.4 - Dashboard Administrativo
        const dashboardAdmin = gerarDashboardAdmin(
            usuarios,
            pontos,
            materiais,
            estoques,
            transacoes
        );
        console.log('   📈 Dashboard administrativo gerado\n');

        // ==========================================
        // CARGA DE DADOS (CRIAR NOTIFICAÇÕES)
        // ==========================================
        console.log('💾 FASE 3: CARGA DE DADOS');
        console.log('-'.repeat(60));

        // 3.1 - Criar notificações de alerta de estoque
        const notificacoesNovas = await criarNotificacoesEstoque(alertasEstoque);
        console.log(`   🔔 Notificações de alerta criadas: ${notificacoesNovas.length}`);

        // 3.2 - Atualizar status de estoques críticos
        const estoquesAtualizados = await atualizarStatusEstoques(alertasEstoque);
        console.log(`   📦 Estoques com status atualizado: ${estoquesAtualizados}`);

        // ==========================================
        // RELATÓRIO FINAL
        // ==========================================
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL DO ETL');
        console.log('='.repeat(60));

        console.log('\n📈 ESTATÍSTICAS DE MATERIAIS:');
        Object.entries(estatisticasMateriais.porTipo).forEach(([tipo, dados]) => {
            console.log(`   ${tipo}:`);
            console.log(`      Total: ${dados.quantidade}kg`);
            console.log(`      Pontos: ${dados.pontos}`);
            console.log(`      Registros: ${dados.count}`);
        });

        console.log('\n⚠️  ALERTAS DE ESTOQUE:');
        if (alertasEstoque.length === 0) {
            console.log('   ✅ Nenhum alerta de estoque crítico');
        } else {
            alertasEstoque.slice(0, 5).forEach(alerta => {
                const ponto = alerta.pontoColeta?.nome || 'Desconhecido';
                console.log(`   🚨 ${ponto} - ${alerta.tipoMaterial}: ${alerta.quantidadeAtual}/${alerta.capacidadeMaxima}${alerta.unidade}`);
            });
        }

        console.log('\n💰 TOP 5 USUÁRIOS POR PONTOS:');
        relatorioPontos.slice(0, 5).forEach((usuario, index) => {
            console.log(`   ${index + 1}. ${usuario.nome}: ${usuario.pontosAtuais} pontos`);
        });

        console.log('\n📊 DASHBOARD ADMINISTRATIVO:');
        console.log(`   Total de Usuários: ${dashboardAdmin.totalUsuarios}`);
        console.log(`   Materiais Validados: ${dashboardAdmin.materiaisValidados}`);
        console.log(`   Materiais Pendentes: ${dashboardAdmin.materiaisPendentes}`);
        console.log(`   Taxa de Validação: ${dashboardAdmin.taxaValidacao}%`);
        console.log(`   Total Reciclado: ${dashboardAdmin.totalRecicladoKg}kg`);
        console.log(`   Pontos em Circulação: ${dashboardAdmin.pontosEmCirculacao}`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ ETL CONCLUÍDO COM SUCESSO!');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ ERRO NO ETL:', error);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexão com MongoDB fechada.');
    }
}

// ==========================================
// FUNÇÕES DE TRANSFORMAÇÃO
// ==========================================

function calcularEstatisticasMateriais(materiais) {
    const estatisticas = {
        total: materiais.length,
        validados: materiais.filter(m => m.status === 'validado').length,
        pendentes: materiais.filter(m => m.status === 'pendente').length,
        rejeitados: materiais.filter(m => m.status === 'rejeitado').length,
        porTipo: {}
    };

    materiais.forEach(material => {
        if (material.status === 'validado') {
            const tipo = material.tipo || 'Outros';
            if (!estatisticas.porTipo[tipo]) {
                estatisticas.porTipo[tipo] = {
                    quantidade: 0,
                    pontos: 0,
                    count: 0
                };
            }
            estatisticas.porTipo[tipo].quantidade += material.quantidade || 0;
            estatisticas.porTipo[tipo].pontos += material.pontos || 0;
            estatisticas.porTipo[tipo].count += 1;
        }
    });

    return estatisticas;
}

function identificarAlertasEstoque(estoques) {
    const alertas = [];

    estoques.forEach(estoque => {
        const percentual = (estoque.quantidadeAtual / estoque.capacidadeMaxima) * 100;
        const nivelAlertaPercent = (estoque.nivelAlerta / estoque.capacidadeMaxima) * 100;

        if (percentual >= nivelAlertaPercent || estoque.status === 'cheio' || estoque.status === 'alerta') {
            alertas.push({
                _id: estoque._id,
                pontoColeta: estoque.pontoColeta,
                tipoMaterial: estoque.tipoMaterial,
                quantidadeAtual: estoque.quantidadeAtual,
                capacidadeMaxima: estoque.capacidadeMaxima,
                nivelAlerta: estoque.nivelAlerta,
                unidade: estoque.unidade,
                status: estoque.status,
                percentual: percentual.toFixed(1)
            });
        }
    });

    return alertas.sort((a, b) => b.percentual - a.percentual);
}

function calcularRelatorioPontos(usuarios, transacoes) {
    const relatorio = usuarios.map(usuario => {
        const transacoesUsuario = transacoes.filter(t =>
            t.usuario && t.usuario.toString() === usuario._id.toString()
        );

        const totalGanho = transacoesUsuario
            .filter(t => t.tipo === 'ganho' || t.tipo === 'bonus')
            .reduce((sum, t) => sum + (t.pontos || 0), 0);

        const totalGasto = transacoesUsuario
            .filter(t => t.tipo === 'gasto')
            .reduce((sum, t) => sum + (t.pontos || 0), 0);

        return {
            _id: usuario._id,
            nome: usuario.nome,
            email: usuario.email,
            pontosAtuais: usuario.pontos || 0,
            totalGanho,
            totalGasto,
            totalTransacoes: transacoesUsuario.length
        };
    });

    return relatorio.sort((a, b) => b.pontosAtuais - a.pontosAtuais);
}

function gerarDashboardAdmin(usuarios, pontos, materiais, estoques, transacoes) {
    const materiaisValidados = materiais.filter(m => m.status === 'validado').length;
    const materiaisPendentes = materiais.filter(m => m.status === 'pendente').length;

    const totalRecicladoKg = materiais
        .filter(m => m.status === 'validado' && m.unidade === 'kg')
        .reduce((sum, m) => sum + (m.quantidade || 0), 0);

    const pontosEmCirculacao = usuarios.reduce((sum, u) => sum + (u.pontos || 0), 0);

    const taxaValidacao = materiais.length > 0
        ? ((materiaisValidados / materiais.length) * 100).toFixed(1)
        : 0;

    return {
        totalUsuarios: usuarios.length,
        totalPontosColeta: pontos.length,
        totalMateriais: materiais.length,
        materiaisValidados,
        materiaisPendentes,
        taxaValidacao,
        totalRecicladoKg: totalRecicladoKg.toFixed(2),
        pontosEmCirculacao,
        alertasEstoque: estoques.filter(e => e.status === 'alerta' || e.status === 'cheio').length
    };
}

// ==========================================
// FUNÇÕES DE CARGA
// ==========================================

async function criarNotificacoesEstoque(alertas) {
    const notificacoesNovas = [];

    // Buscar admins para notificar
    const admins = await User.find({ role: 'admin' }).lean();

    if (admins.length === 0) {
        console.log('   ⚠️  Nenhum admin encontrado para notificar');
        return notificacoesNovas;
    }

    for (const alerta of alertas) {
        for (const admin of admins) {
            // Verificar se já existe notificação recente (últimas 24h)
            const dataLimite = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const notificacaoExistente = await Notificacao.findOne({
                usuario: admin._id,
                tipo: 'sistema',
                'metadata.estoqueId': alerta._id.toString(),
                createdAt: { $gte: dataLimite }
            });

            if (!notificacaoExistente) {
                const pontoNome = alerta.pontoColeta?.nome || 'Desconhecido';
                const notificacao = await Notificacao.create({
                    usuario: admin._id,
                    tipo: 'sistema',
                    titulo: `⚠️ Alerta de Estoque - ${pontoNome}`,
                    mensagem: `O estoque de ${alerta.tipoMaterial} está em ${alerta.percentual}% da capacidade (${alerta.quantidadeAtual}/${alerta.capacidadeMaxima}${alerta.unidade})`,
                    prioridade: alerta.status === 'cheio' ? 'urgente' : 'alta',
                    metadata: {
                        estoqueId: alerta._id.toString(),
                        pontoColeta: pontoNome,
                        tipoMaterial: alerta.tipoMaterial,
                        percentual: alerta.percentual
                    }
                });
                notificacoesNovas.push(notificacao);
            }
        }
    }

    return notificacoesNovas;
}

async function atualizarStatusEstoques(alertas) {
    let contador = 0;

    for (const alerta of alertas) {
        if (!mongoose.Types.ObjectId.isValid(alerta._id)) {
            continue;
        }

        const estoque = await Estoque.findById(alerta._id);
        if (estoque) {
            // O status já é calculado automaticamente no pre-save do model
            await estoque.save();
            contador++;
        }
    }

    return contador;
}

// ==========================================
// EXECUTAR ETL
// ==========================================
executarETL();