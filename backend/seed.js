require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'ReutilizaDB';

async function popularBancoDeDados() {
    if (!MONGO_URI) {
        console.error('\nERRO CRÍTICO: A variável de ambiente MONGO_URI não foi encontrada.');
        return;
    }

    console.log('>>> Iniciando script para popular a base de dados...');
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        console.log(`Conectado a "${DB_NAME}".`);

        // Limpar e recriar coleções
        console.log('\nLimpando e recriando as coleções...');
        await db.collection('users').deleteMany({});
        await db.collection('pontocoletas').deleteMany({});
        await db.collection('materialreciclados').deleteMany({});
        await db.collection('recompensas').deleteMany({});
        await db.collection('validacaocruzadas').deleteMany({});

        // Criar usuários
        const salt = await bcrypt.genSalt(10);
        const senhaHash1 = await bcrypt.hash("senha123", salt);
        const senhaHash2 = await bcrypt.hash("teste123", salt);
        const senhaHash3 = await bcrypt.hash("admin123", salt);

        const usuarios = await db.collection('users').insertMany([
            { 
                nome: "Eduardo Ely", 
                email: "edu@email.com", 
                senha: senhaHash1,
                pontos: 100,
                role: "usuario",
                createdAt: new Date()
            },
            { 
                nome: "Usuário Teste", 
                email: "teste@email.com", 
                senha: senhaHash2,
                pontos: 50,
                role: "usuario",
                createdAt: new Date()
            },
            { 
                nome: "Administrador", 
                email: "admin@reutiliza.com", 
                senha: senhaHash3,
                pontos: 0,
                role: "admin",
                createdAt: new Date()
            }
        ]);
        console.log('Usuários de exemplo inseridos com senhas encriptadas.');

        // Criar pontos de coleta
        const pontosColeta = await db.collection('pontocoletas').insertMany([
            {
                nome: "Ecoponto Central",
                endereco: "Av. Paulista, 1000",
                coordenadas: {
                    lat: -23.5505,
                    lng: -46.6333
                },
                materiais: ["Papel", "Plástico", "Vidro", "Metal"],
                horarioFuncionamento: "Segunda a Sexta, 8h às 18h",
                telefone: "(11) 3333-4444",
                email: "ecoponto@email.com",
                createdAt: new Date()
            },
            {
                nome: "Recicla Tudo",
                endereco: "Rua Augusta, 500",
                coordenadas: {
                    lat: -23.5489,
                    lng: -46.6388
                },
                materiais: ["Papel", "Plástico", "Eletrônico"],
                horarioFuncionamento: "Segunda a Sábado, 9h às 17h",
                telefone: "(11) 2222-3333",
                email: "reciclagem@email.com",
                createdAt: new Date()
            }
        ]);
        console.log('Pontos de coleta inseridos.');

        // Criar recompensas
        await db.collection('recompensas').insertMany([
            {
                titulo: "Desconto em Supermercado",
                descricao: "Cupom de 10% de desconto em compras acima de R$100",
                pontosNecessarios: 200,
                disponivel: true,
                imagem: "desconto.jpg",
                createdAt: new Date()
            },
            {
                titulo: "Ingresso para Cinema",
                descricao: "Um ingresso gratuito para qualquer sessão",
                pontosNecessarios: 350,
                disponivel: true,
                imagem: "cinema.jpg",
                createdAt: new Date()
            }
        ]);
        console.log('Recompensas inseridas.');

        // Criar registros de materiais reciclados
        const usuariosArray = Object.values(usuarios.insertedIds);
        const pontosColetaArray = Object.values(pontosColeta.insertedIds);

        await db.collection('materialreciclados').insertMany([
            {
                usuario: usuariosArray[0],
                pontoColeta: pontosColetaArray[0],
                tipo: "Papel",
                quantidade: 5,
                unidade: "kg",
                pontos: 50,
                status: "validado",
                dataRegistro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
                validadoPor: usuariosArray[2],
                dataValidacao: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
            },
            {
                usuario: usuariosArray[1],
                pontoColeta: pontosColetaArray[1],
                tipo: "Plástico",
                quantidade: 3,
                unidade: "kg",
                pontos: 30,
                status: "pendente",
                dataRegistro: new Date()
            }
        ]);
        console.log('Registros de materiais reciclados inseridos.');

        console.log('>>> SUCESSO: A base de dados está pronta para uso!');

    } catch (err) {
        console.error('\nOcorreu um erro durante o processo:', err);
    } finally {
        await client.close();
        console.log('\nConexão com o MongoDB fechada.');
    }
}

// Executar o script
popularBancoDeDados();