require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'ReutilizaDB';

async function popularBancoDeDados() {
    if (!MONGO_URI) {
        console.error('\n❌ ERRO CRÍTICO: A variável de ambiente MONGO_URI não foi encontrada.');
        return;
    }

    console.log('>>> Iniciando script para popular a base de dados...');
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        console.log(`✅ Conectado a "${DB_NAME}".`);

        // Limpar e recriar coleções
        console.log('\n🧹 Limpando e recriando as coleções...');
        await db.collection('users').deleteMany({});
        await db.collection('pontocoletas').deleteMany({});
        await db.collection('materialreciclados').deleteMany({});
        await db.collection('recompensas').deleteMany({});
        await db.collection('validacaocruzadas').deleteMany({});
        await db.collection('notificacaos').deleteMany({});
        await db.collection('transacaopontos').deleteMany({});
        await db.collection('estoques').deleteMany({});
        await db.collection('movimentacaoestoques').deleteMany({});

        // ========================================
        // CRIAR USUÁRIOS
        // ========================================
        console.log('\n👥 Criando usuários...');
        const salt = await bcrypt.genSalt(10);
        const usuarios = await db.collection('users').insertMany([
            {
                nome: "Eduardo Ely",
                email: "edu@email.com",
                senha: await bcrypt.hash("senha123", salt),
                pontos: 250,
                pontosUtilizados: 50,
                role: "usuario",
                createdAt: new Date()
            },
            {
                nome: "Maria Silva",
                email: "maria@email.com",
                senha: await bcrypt.hash("senha123", salt),
                pontos: 180,
                pontosUtilizados: 0,
                role: "usuario",
                createdAt: new Date()
            },
            {
                nome: "João Santos",
                email: "joao@email.com",
                senha: await bcrypt.hash("senha123", salt),
                pontos: 420,
                pontosUtilizados: 100,
                role: "usuario",
                createdAt: new Date()
            },
            {
                nome: "Administrador",
                email: "admin@reutiliza.com",
                senha: await bcrypt.hash("admin123", salt),
                pontos: 0,
                pontosUtilizados: 0,
                role: "admin",
                createdAt: new Date()
            }
        ]);
        console.log('✅ 4 usuários criados com senhas encriptadas.');

        const usuariosArray = Object.values(usuarios.insertedIds);

        // ========================================
        // CRIAR PONTOS DE COLETA
        // ========================================
        console.log('\n📍 Criando pontos de coleta...');
        const pontosColeta = await db.collection('pontocoletas').insertMany([
            {
                nome: "Ecoponto Central Chapecó",
                endereco: "Av. Getúlio Vargas, 100N - Centro",
                latitude: -27.1004,
                longitude: -52.6152,
                materiais: ["Papel", "Plástico", "Vidro", "Metal"],
                horarioFuncionamento: "Segunda a Sexta, 8h às 18h",
                telefone: "(49) 3321-4000",
                email: "ecopontocentral@chapeco.sc.gov.br",
                ativo: true,
                createdAt: new Date()
            },
            {
                nome: "Recicla Efapi",
                endereco: "Rua Marechal Deodoro, 1500 - Efapi",
                latitude: -27.0923,
                longitude: -52.6237,
                materiais: ["Papel", "Plástico", "Eletrônico", "Óleo"],
                horarioFuncionamento: "Segunda a Sábado, 7h às 19h",
                telefone: "(49) 3322-5000",
                email: "reciclaefapi@email.com",
                ativo: true,
                createdAt: new Date()
            },
            {
                nome: "Ecoponto São Cristóvão",
                endereco: "Rua Benjamin Constant, 200 - São Cristóvão",
                latitude: -27.1156,
                longitude: -52.6089,
                materiais: ["Vidro", "Metal", "Papel", "Plástico"],
                horarioFuncionamento: "Segunda a Sexta, 9h às 17h",
                telefone: "(49) 3323-6000",
                email: "ecopontosaocristo@email.com",
                ativo: true,
                createdAt: new Date()
            }
        ]);
        console.log('✅ 3 pontos de coleta criados.');
        const pontosColetaArray = Object.values(pontosColeta.insertedIds);

    // ========================================
    // CRIAR ESTOQUES PARA CADA PONTO - VERSÃO CORRIGIDA
    // ========================================
        console.log('\n📦 Criando estoques...');

        const estoques = [];
        const tiposMateriais = ['Papel', 'Plástico', 'Vidro', 'Metal', 'Eletrônico', 'Óleo'];

        const pontosColetaDocumentos = await db.collection('pontocoletas')
            .find({ _id: { $in: pontosColetaArray } })
            .toArray();

        for (const pontoId of pontosColetaArray) {
            // Encontrar o documento do ponto atual
            const ponto = pontosColetaDocumentos.find(p => p._id.equals(pontoId));

            if (!ponto) {
                console.warn(`⚠ Ponto de coleta não encontrado para o ID: ${pontoId}`);
                continue;
            }

            const materiaisPonto = ponto.materiais;

            // Criar registro de estoque para cada material aceito pelo ponto
            for (const tipo of tiposMateriais) {
                if (materiaisPonto.includes(tipo)) {
                    estoques.push({
                        pontoColeta: pontoId,
                        tipoMaterial: tipo,
                        quantidadeAtual: Math.floor(Math.random() * 500),
                        unidade: tipo === 'Óleo' ? 'litros' : 'kg',
                        capacidadeMaxima: 1000,
                        nivelAlerta: 800,
                        status: 'normal',
                        ultimaEntrada: new Date(),
                        createdAt: new Date()
                    });
                }
            }
        }

        const estoquesInseridos = await db.collection('estoques').insertMany(estoques);
        console.log(`✅ ${estoques.length} registros de estoque criados.`);
        // ========================================
        // CRIAR MATERIAIS RECICLADOS
        // ========================================
        console.log('\n♻️  Criando materiais reciclados...');
        const agora = new Date();
        const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        const trezeDiasAtras = new Date(agora.getTime() - 13 * 24 * 60 * 60 * 1000);

        const materiais = await db.collection('materialreciclados').insertMany([
            {
                usuario: usuariosArray[0],
                pontoColeta: pontosColetaArray[0],
                tipo: "Papel",
                quantidade: 5,
                unidade: "kg",
                pontos: 50,
                status: "validado",
                dataRegistro: seteDiasAtras,
                validadoPor: usuariosArray[3],
                dataValidacao: new Date(seteDiasAtras.getTime() + 24 * 60 * 60 * 1000),
                numeroRastreio: `MAT-${Date.now()}-A1B2C3`,
                estoqueAtual: 5,
                destinoFinal: 'reciclagem',
                createdAt: seteDiasAtras
            },
            {
                usuario: usuariosArray[0],
                pontoColeta: pontosColetaArray[1],
                tipo: "Plástico",
                quantidade: 3.5,
                unidade: "kg",
                pontos: 52,
                status: "validado",
                dataRegistro: trezeDiasAtras,
                validadoPor: usuariosArray[3],
                dataValidacao: new Date(trezeDiasAtras.getTime() + 48 * 60 * 60 * 1000),
                numeroRastreio: `MAT-${Date.now()}-D4E5F6`,
                estoqueAtual: 3.5,
                destinoFinal: 'reciclagem',
                createdAt: trezeDiasAtras
            },
            {
                usuario: usuariosArray[1],
                pontoColeta: pontosColetaArray[0],
                tipo: "Vidro",
                quantidade: 8,
                unidade: "kg",
                pontos: 96,
                status: "validado",
                dataRegistro: new Date(agora.getTime() - 5 * 24 * 60 * 60 * 1000),
                validadoPor: usuariosArray[3],
                dataValidacao: new Date(agora.getTime() - 4 * 24 * 60 * 60 * 1000),
                numeroRastreio: `MAT-${Date.now()}-G7H8I9`,
                estoqueAtual: 8,
                destinoFinal: 'reciclagem',
                createdAt: new Date(agora.getTime() - 5 * 24 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[2],
                pontoColeta: pontosColetaArray[2],
                tipo: "Metal",
                quantidade: 12,
                unidade: "kg",
                pontos: 240,
                status: "validado",
                dataRegistro: new Date(agora.getTime() - 10 * 24 * 60 * 60 * 1000),
                validadoPor: usuariosArray[3],
                dataValidacao: new Date(agora.getTime() - 9 * 24 * 60 * 60 * 1000),
                numeroRastreio: `MAT-${Date.now()}-J1K2L3`,
                estoqueAtual: 12,
                destinoFinal: 'reciclagem',
                createdAt: new Date(agora.getTime() - 10 * 24 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[1],
                pontoColeta: pontosColetaArray[1],
                tipo: "Eletrônico",
                quantidade: 2,
                unidade: "unidades",
                pontos: 60,
                status: "pendente",
                dataRegistro: agora,
                numeroRastreio: `MAT-${Date.now()}-M4N5O6`,
                observacoes: "Celulares antigos",
                createdAt: agora
            },
            {
                usuario: usuariosArray[2],
                pontoColeta: pontosColetaArray[0],
                tipo: "Papel",
                quantidade: 7,
                unidade: "kg",
                pontos: 70,
                status: "pendente",
                dataRegistro: agora,
                numeroRastreio: `MAT-${Date.now()}-P7Q8R9`,
                observacoes: "Papelão e jornais",
                createdAt: agora
            }
        ]);
        console.log('✅ 6 materiais reciclados criados.');
        const materiaisArray = Object.values(materiais.insertedIds);

        // ========================================
        // CRIAR TRANSAÇÕES DE PONTOS
        // ========================================
        console.log('\n💰 Criando transações de pontos...');
        await db.collection('transacaopontos').insertMany([
            {
                usuario: usuariosArray[0],
                tipo: "ganho",
                pontos: 50,
                saldoAnterior: 0,
                saldoAtual: 50,
                descricao: "Reciclagem de Papel - 5kg",
                origem: { tipo: "material", id: materiaisArray[0] },
                status: "concluida",
                metadata: { materialTipo: "Papel" },
                dataProcessamento: seteDiasAtras,
                createdAt: seteDiasAtras
            },
            {
                usuario: usuariosArray[0],
                tipo: "ganho",
                pontos: 52,
                saldoAnterior: 50,
                saldoAtual: 102,
                descricao: "Reciclagem de Plástico - 3.5kg",
                origem: { tipo: "material", id: materiaisArray[1] },
                status: "concluida",
                metadata: { materialTipo: "Plástico" },
                dataProcessamento: trezeDiasAtras,
                createdAt: trezeDiasAtras
            },
            {
                usuario: usuariosArray[0],
                tipo: "bonus",
                pontos: 50,
                saldoAnterior: 102,
                saldoAtual: 152,
                descricao: "Bônus de boas-vindas",
                origem: { tipo: "bonus_cadastro" },
                status: "concluida",
                dataProcessamento: new Date(agora.getTime() - 20 * 24 * 60 * 60 * 1000),
                createdAt: new Date(agora.getTime() - 20 * 24 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[1],
                tipo: "ganho",
                pontos: 96,
                saldoAnterior: 0,
                saldoAtual: 96,
                descricao: "Reciclagem de Vidro - 8kg",
                origem: { tipo: "material", id: materiaisArray[2] },
                status: "concluida",
                metadata: { materialTipo: "Vidro" },
                dataProcessamento: new Date(agora.getTime() - 4 * 24 * 60 * 60 * 1000),
                createdAt: new Date(agora.getTime() - 4 * 24 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[2],
                tipo: "ganho",
                pontos: 240,
                saldoAnterior: 0,
                saldoAtual: 240,
                descricao: "Reciclagem de Metal - 12kg",
                origem: { tipo: "material", id: materiaisArray[3] },
                status: "concluida",
                metadata: { materialTipo: "Metal" },
                dataProcessamento: new Date(agora.getTime() - 9 * 24 * 60 * 60 * 1000),
                createdAt: new Date(agora.getTime() - 9 * 24 * 60 * 60 * 1000)
            }
        ]);
        console.log('✅ 5 transações de pontos criadas.');

        // ========================================
        // CRIAR RECOMPENSAS
        // ========================================
        console.log('\n🎁 Criando recompensas...');
        await db.collection('recompensas').insertMany([
            {
                nome: "Desconto em Supermercado",
                titulo: "10% OFF em Compras",
                descricao: "Cupom de 10% de desconto em compras acima de R$100 em supermercados parceiros",
                pontosNecessarios: 100,
                custoEmPontos: 100,
                tipo: "voucher",
                codigo: "SUPER10",
                disponivel: true,
                validade: new Date(agora.getTime() + 90 * 24 * 60 * 60 * 1000),
                imagem: "desconto-supermercado.jpg",
                createdAt: agora
            },
            {
                nome: "Ingresso para Cinema",
                titulo: "Cinema Grátis",
                descricao: "Um ingresso gratuito para qualquer sessão de cinema nos parceiros",
                pontosNecessarios: 200,
                custoEmPontos: 200,
                tipo: "voucher",
                codigo: "CINEMA200",
                disponivel: true,
                validade: new Date(agora.getTime() + 60 * 24 * 60 * 60 * 1000),
                imagem: "cinema.jpg",
                createdAt: agora
            },
            {
                nome: "Kit Ecobag Reutilizável",
                titulo: "Ecobag Premium",
                descricao: "Kit com 3 ecobags de diferentes tamanhos para suas compras sustentáveis",
                pontosNecessarios: 150,
                custoEmPontos: 150,
                tipo: "brinde",
                disponivel: true,
                imagem: "ecobag.jpg",
                createdAt: agora
            },
            {
                nome: "Desconto em Restaurante",
                titulo: "20% OFF em Restaurantes",
                descricao: "Desconto de 20% em restaurantes parceiros",
                pontosNecessarios: 180,
                custoEmPontos: 180,
                tipo: "desconto",
                codigo: "REST20",
                disponivel: true,
                validade: new Date(agora.getTime() + 45 * 24 * 60 * 60 * 1000),
                imagem: "restaurante.jpg",
                createdAt: agora
            },
            {
                nome: "Garrafa Térmica Sustentável",
                titulo: "Garrafa Térmica 500ml",
                descricao: "Garrafa térmica de aço inoxidável, mantém bebidas quentes por 12h e frias por 24h",
                pontosNecessarios: 250,
                custoEmPontos: 250,
                tipo: "brinde",
                disponivel: true,
                imagem: "garrafa-termica.jpg",
                createdAt: agora
            },
            {
                nome: "Vale Combustível",
                titulo: "R$50 em Combustível",
                descricao: "Vale de R$50 para abastecer em postos parceiros",
                pontosNecessarios: 400,
                custoEmPontos: 400,
                tipo: "voucher",
                codigo: "COMB50",
                disponivel: true,
                validade: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000),
                imagem: "combustivel.jpg",
                createdAt: agora
            }
        ]);
        console.log('✅ 6 recompensas criadas.');

        // ========================================
        // CRIAR VALIDAÇÕES CRUZADAS
        // ========================================
        console.log('\n✅ Criando validações cruzadas...');
        await db.collection('validacaocruzadas').insertMany([
            {
                material: materiaisArray[4],
                validador: usuariosArray[0],
                status: "pendente",
                dataValidacao: agora,
                createdAt: agora
            },
            {
                material: materiaisArray[5],
                validador: usuariosArray[1],
                status: "pendente",
                dataValidacao: agora,
                createdAt: agora
            }
        ]);
        console.log('✅ 2 validações cruzadas pendentes criadas.');

        // ========================================
        // CRIAR NOTIFICAÇÕES
        // ========================================
        console.log('\n🔔 Criando notificações...');
        await db.collection('notificacaos').insertMany([
            {
                usuario: usuariosArray[0],
                tipo: "validacao_aprovada",
                titulo: "✅ Material Validado!",
                mensagem: "Seu material (Papel - 5kg) foi validado e você ganhou 50 pontos!",
                lida: true,
                dataLeitura: new Date(seteDiasAtras.getTime() + 48 * 60 * 60 * 1000),
                referencia: { tipo: "material", id: materiaisArray[0] },
                prioridade: "normal",
                metadata: { pontos: 50, materialTipo: "Papel" },
                createdAt: new Date(seteDiasAtras.getTime() + 24 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[0],
                tipo: "validacao_aprovada",
                titulo: "✅ Material Validado!",
                mensagem: "Seu material (Plástico - 3.5kg) foi validado e você ganhou 52 pontos!",
                lida: true,
                dataLeitura: trezeDiasAtras,
                referencia: { tipo: "material", id: materiaisArray[1] },
                prioridade: "normal",
                metadata: { pontos: 52, materialTipo: "Plástico" },
                createdAt: new Date(trezeDiasAtras.getTime() + 48 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[1],
                tipo: "validacao_aprovada",
                titulo: "✅ Material Validado!",
                mensagem: "Seu material (Vidro - 8kg) foi validado e você ganhou 96 pontos!",
                lida: false,
                referencia: { tipo: "material", id: materiaisArray[2] },
                prioridade: "normal",
                metadata: { pontos: 96, materialTipo: "Vidro" },
                createdAt: new Date(agora.getTime() - 4 * 24 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[2],
                tipo: "validacao_aprovada",
                titulo: "✅ Material Validado!",
                mensagem: "Seu material (Metal - 12kg) foi validado e você ganhou 240 pontos!",
                lida: false,
                referencia: { tipo: "material", id: materiaisArray[3] },
                prioridade: "normal",
                metadata: { pontos: 240, materialTipo: "Metal" },
                createdAt: new Date(agora.getTime() - 9 * 24 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[0],
                tipo: "validacao_pendente",
                titulo: "⏳ Validação Solicitada",
                mensagem: "Um material está aguardando sua validação cruzada.",
                lida: false,
                referencia: { tipo: "validacao", id: materiaisArray[4] },
                prioridade: "alta",
                createdAt: agora
            },
            {
                usuario: usuariosArray[1],
                tipo: "recompensa_disponivel",
                titulo: "🎁 Nova Recompensa Disponível!",
                mensagem: "Você pode resgatar 'Desconto em Supermercado' com seus pontos!",
                lida: false,
                prioridade: "normal",
                createdAt: new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000)
            }
        ]);
        console.log('✅ 6 notificações criadas.');

        // ========================================
        // RESUMO FINAL
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('🎉 SUCESSO! A base de dados está pronta para uso!');
        console.log('='.repeat(60));
        console.log('\n📊 RESUMO DA POPULAÇÃO:');
        console.log(`   👥 Usuários: 4 (3 usuários + 1 admin)`);
        console.log(`   📍 Pontos de Coleta: 3`);
        console.log(`   📦 Registros de Estoque: ${estoques.length}`);
        console.log(`   ♻️  Materiais Reciclados: 6 (4 validados + 2 pendentes)`);
        console.log(`   💰 Transações de Pontos: 5`);
        console.log(`   🎁 Recompensas: 6`);
        console.log(`   ✅ Validações Cruzadas: 2 pendentes`);
        console.log(`   🔔 Notificações: 6`);
        console.log('='.repeat(60));
        console.log('\n🔑 CREDENCIAIS DE ACESSO:');
        console.log('   📧 edu@email.com | 🔒 senha123 (Usuário com 250 pontos)');
        console.log('   📧 maria@email.com | 🔒 senha123 (Usuário com 180 pontos)');
        console.log('   📧 joao@email.com | 🔒 senha123 (Usuário com 420 pontos)');
        console.log('   📧 admin@reutiliza.com | 🔒 admin123 (Admin)');
        console.log('='.repeat(60));

    } catch (err) {
        console.error('\n❌ Ocorreu um erro durante o processo:', err);
        console.error('Stack trace:', err.stack);
    } finally {
        await client.close();
        console.log('\n🔌 Conexão com o MongoDB fechada.');
    }
}

// Executar o script
popularBancoDeDados();