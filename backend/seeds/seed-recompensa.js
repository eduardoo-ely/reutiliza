require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'ReutilizaDB';

async function popularRecompensas() {
    if (!MONGO_URI) {
        console.error('\n❌ ERRO: MONGO_URI não encontrada no .env');
        return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎁 POPULANDO RECOMPENSAS NO BANCO DE DADOS');
    console.log('='.repeat(60) + '\n');

    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        console.log(`✅ Conectado a "${DB_NAME}"\n`);

        // Limpar recompensas existentes
        console.log('🧹 Limpando recompensas antigas...');
        await db.collection('recompensas').deleteMany({});
        console.log('✅ Recompensas antigas removidas\n');

        // Criar novas recompensas
        console.log('🎁 Criando novas recompensas...');

        const agora = new Date();
        const recompensas = [
            {
                nome: 'Desconto 10% Supermercado',
                titulo: '10% OFF em Compras',
                descricao: 'Cupom de 10% de desconto em compras acima de R$100 em supermercados parceiros. Válido para uma única compra.',
                pontosNecessarios: 100,
                custoEmPontos: 100,
                tipo: 'voucher',
                codigo: 'SUPER10',
                disponivel: true,
                ativo: true,
                categoria: 'alimentacao',
                quantidadeDisponivel: -1, // Ilimitado
                quantidadeResgatada: 0,
                validade: new Date(agora.getTime() + 90 * 24 * 60 * 60 * 1000),
                imagem: '/assets/recompensas/supermercado.jpg',
                parceiro: {
                    nome: 'Supermercados Eco',
                    contato: '(49) 3321-0000'
                },
                termos: 'Válido apenas em compras acima de R$100. Não cumulativo com outras promoções.',
                createdAt: agora
            },
            {
                nome: 'Ingresso Cinema',
                titulo: 'Cinema Grátis',
                descricao: 'Um ingresso gratuito para qualquer sessão de cinema nos parceiros. Válido de segunda a quinta-feira.',
                pontosNecessarios: 200,
                custoEmPontos: 200,
                tipo: 'voucher',
                codigo: 'CINEMA200',
                disponivel: true,
                ativo: true,
                categoria: 'entretenimento',
                quantidadeDisponivel: 50,
                quantidadeResgatada: 0,
                validade: new Date(agora.getTime() + 60 * 24 * 60 * 60 * 1000),
                imagem: '/assets/recompensas/cinema.jpg',
                parceiro: {
                    nome: 'Cinemas Chapecó',
                    contato: '(49) 3322-0000'
                },
                termos: 'Válido de segunda a quinta. Sujeito à disponibilidade.',
                createdAt: agora
            },
            {
                nome: 'Kit Ecobag Reutilizável',
                titulo: 'Ecobag Premium',
                descricao: 'Kit com 3 ecobags de diferentes tamanhos para suas compras sustentáveis. Material resistente e durável.',
                pontosNecessarios: 150,
                custoEmPontos: 150,
                tipo: 'brinde',
                disponivel: true,
                ativo: true,
                categoria: 'sustentabilidade',
                quantidadeDisponivel: 100,
                quantidadeResgatada: 0,
                imagem: '/assets/recompensas/ecobag.jpg',
                termos: 'Retirada em ponto de coleta cadastrado.',
                createdAt: agora
            },
            {
                nome: 'Desconto 20% Restaurante',
                titulo: '20% OFF em Restaurantes',
                descricao: 'Desconto de 20% em restaurantes parceiros. Válido para consumo no local.',
                pontosNecessarios: 180,
                custoEmPontos: 180,
                tipo: 'desconto',
                codigo: 'REST20',
                disponivel: true,
                ativo: true,
                categoria: 'alimentacao',
                quantidadeDisponivel: -1,
                quantidadeResgatada: 0,
                validade: new Date(agora.getTime() + 45 * 24 * 60 * 60 * 1000),
                imagem: '/assets/recompensas/restaurante.jpg',
                parceiro: {
                    nome: 'Restaurantes Eco',
                    contato: '(49) 3323-0000'
                },
                termos: 'Válido apenas para consumo no local. Não válido em feriados.',
                createdAt: agora
            },
            {
                nome: 'Garrafa Térmica Sustentável',
                titulo: 'Garrafa Térmica 500ml',
                descricao: 'Garrafa térmica de aço inoxidável de alta qualidade. Mantém bebidas quentes por 12h e frias por 24h.',
                pontosNecessarios: 250,
                custoEmPontos: 250,
                tipo: 'brinde',
                disponivel: true,
                ativo: true,
                categoria: 'sustentabilidade',
                quantidadeDisponivel: 75,
                quantidadeResgatada: 0,
                imagem: '/assets/recompensas/garrafa.jpg',
                termos: 'Retirada em ponto de coleta. Cores sujeitas à disponibilidade.',
                createdAt: agora
            },
            {
                nome: 'Vale Combustível R$50',
                titulo: 'R$50 em Combustível',
                descricao: 'Vale de R$50 para abastecer em postos parceiros. Válido para gasolina, etanol ou diesel.',
                pontosNecessarios: 400,
                custoEmPontos: 400,
                tipo: 'voucher',
                codigo: 'COMB50',
                disponivel: true,
                ativo: true,
                categoria: 'transporte',
                quantidadeDisponivel: 30,
                quantidadeResgatada: 0,
                validade: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000),
                imagem: '/assets/recompensas/combustivel.jpg',
                parceiro: {
                    nome: 'Postos Eco',
                    contato: '(49) 3324-0000'
                },
                termos: 'Válido em postos parceiros. Apresentar código no caixa.',
                createdAt: agora
            },
            {
                nome: 'Curso Online Sustentabilidade',
                titulo: 'Curso EAD Gratuito',
                descricao: 'Curso completo sobre práticas sustentáveis e economia circular. Certificado incluso.',
                pontosNecessarios: 120,
                custoEmPontos: 120,
                tipo: 'voucher',
                codigo: 'CURSO120',
                disponivel: true,
                ativo: true,
                categoria: 'outros',
                quantidadeDisponivel: -1,
                quantidadeResgatada: 0,
                validade: new Date(agora.getTime() + 120 * 24 * 60 * 60 * 1000),
                imagem: '/assets/recompensas/curso.jpg',
                termos: 'Acesso válido por 6 meses após resgate.',
                createdAt: agora
            },
            {
                nome: 'Kit Jardinagem Ecológica',
                titulo: 'Kit Horta em Casa',
                descricao: 'Kit completo para iniciar sua horta caseira com sementes orgânicas, substrato e guia prático.',
                pontosNecessarios: 280,
                custoEmPontos: 280,
                tipo: 'brinde',
                disponivel: true,
                ativo: true,
                categoria: 'sustentabilidade',
                quantidadeDisponivel: 40,
                quantidadeResgatada: 0,
                imagem: '/assets/recompensas/horta.jpg',
                termos: 'Retirada em ponto de coleta cadastrado.',
                createdAt: agora
            }
        ];

        const result = await db.collection('recompensas').insertMany(recompensas);
        console.log(`✅ ${result.insertedCount} recompensas criadas com sucesso!\n`);

        // Exibir resumo
        console.log('='.repeat(60));
        console.log('📊 RESUMO DAS RECOMPENSAS');
        console.log('='.repeat(60));

        recompensas.forEach((r, index) => {
            console.log(`\n${index + 1}. ${r.nome}`);
            console.log(`   💰 Pontos: ${r.pontosNecessarios}`);
            console.log(`   🏷️  Tipo: ${r.tipo}`);
            console.log(`   📦 Estoque: ${r.quantidadeDisponivel === -1 ? 'Ilimitado' : r.quantidadeDisponivel}`);
            if (r.codigo) console.log(`   🔑 Código: ${r.codigo}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ RECOMPENSAS POPULADAS COM SUCESSO!');
        console.log('='.repeat(60) + '\n');

    } catch (err) {
        console.error('\n❌ Erro ao popular recompensas:', err);
        console.error('Stack:', err.stack);
    } finally {
        await client.close();
        console.log('🔌 Conexão fechada.\n');
    }
}

popularRecompensas();