require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;

async function fixDatabase() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 SCRIPT DE CORREÇÃO DO BANCO DE DADOS');
    console.log('='.repeat(60) + '\n');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB');

        const db = mongoose.connection.db;

        // 1. Corrigir role dos usuários
        console.log('\n📝 Corrigindo campo "role" dos usuários...');
        const usersResult = await db.collection('users').updateMany(
            { role: 'user' },
            { $set: { role: 'usuario' } }
        );
        console.log(`   ✅ ${usersResult.modifiedCount} usuários corrigidos`);

        // 2. Adicionar campo pontosUtilizados se não existir
        console.log('\n💰 Adicionando campo pontosUtilizados...');
        const pontosResult = await db.collection('users').updateMany(
            { pontosUtilizados: { $exists: false } },
            { $set: { pontosUtilizados: 0 } }
        );
        console.log(`   ✅ ${pontosResult.modifiedCount} usuários atualizados`);

        // 3. Verificar admin
        console.log('\n👑 Verificando usuário admin...');
        const admin = await db.collection('users').findOne({ email: 'admin@reutiliza.com' });

        if (!admin) {
            console.log('   ⚠️ Admin não encontrado, criando...');
            const salt = await bcrypt.genSalt(10);
            await db.collection('users').insertOne({
                nome: 'Administrador',
                email: 'admin@reutiliza.com',
                senha: await bcrypt.hash('admin123', salt),
                pontos: 0,
                pontosUtilizados: 0,
                role: 'admin',
                createdAt: new Date()
            });
            console.log('   ✅ Admin criado com sucesso');
        } else {
            if (admin.role !== 'admin') {
                await db.collection('users').updateOne(
                    { _id: admin._id },
                    { $set: { role: 'admin' } }
                );
                console.log('   ✅ Role do admin corrigido');
            } else {
                console.log('   ✅ Admin já existe e está correto');
            }
        }

        // 4. Verificar recompensas
        console.log('\n🎁 Verificando recompensas...');
        const recompensasCount = await db.collection('recompensas').countDocuments();
        console.log(`   📊 Total de recompensas: ${recompensasCount}`);

        if (recompensasCount === 0) {
            console.log('   ⚠️ Nenhuma recompensa encontrada, criando exemplos...');
            await db.collection('recompensas').insertMany([
                {
                    nome: 'Desconto 10% Supermercado',
                    titulo: '10% OFF em Compras',
                    descricao: 'Cupom de 10% de desconto em compras acima de R$100',
                    pontosNecessarios: 100,
                    custoEmPontos: 100,
                    tipo: 'voucher',
                    codigo: 'SUPER10',
                    disponivel: true,
                    ativo: true,
                    categoria: 'alimentacao',
                    quantidadeDisponivel: -1,
                    quantidadeResgatada: 0,
                    validade: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    createdAt: new Date()
                },
                {
                    nome: 'Ecobag Reutilizável',
                    titulo: 'Kit 3 Ecobags',
                    descricao: 'Kit com 3 ecobags de diferentes tamanhos',
                    pontosNecessarios: 150,
                    custoEmPontos: 150,
                    tipo: 'brinde',
                    disponivel: true,
                    ativo: true,
                    categoria: 'sustentabilidade',
                    quantidadeDisponivel: 50,
                    quantidadeResgatada: 0,
                    createdAt: new Date()
                }
            ]);
            console.log('   ✅ Recompensas de exemplo criadas');
        }

        // 5. Verificar pontos de coleta
        console.log('\n📍 Verificando pontos de coleta...');
        const pontosCount = await db.collection('pontocoletas').countDocuments();
        console.log(`   📊 Total de pontos: ${pontosCount}`);

        // 6. Estatísticas finais
        console.log('\n' + '='.repeat(60));
        console.log('📊 ESTATÍSTICAS FINAIS');
        console.log('='.repeat(60));

        const stats = {
            usuarios: await db.collection('users').countDocuments(),
            admins: await db.collection('users').countDocuments({ role: 'admin' }),
            pontos: await db.collection('pontocoletas').countDocuments(),
            materiais: await db.collection('materialreciclados').countDocuments(),
            recompensas: await db.collection('recompensas').countDocuments(),
            transacoes: await db.collection('transacaopontos').countDocuments(),
            notificacoes: await db.collection('notificacaos').countDocuments(),
            estoques: await db.collection('estoques').countDocuments()
        };

        Object.entries(stats).forEach(([key, value]) => {
            console.log(`   ${key.padEnd(20)}: ${value}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ CORREÇÕES CONCLUÍDAS COM SUCESSO!');
        console.log('='.repeat(60));
        console.log('\n🔑 Credenciais Admin:');
        console.log('   Email: admin@reutiliza.com');
        console.log('   Senha: admin123');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ ERRO:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexão fechada.\n');
    }
}

fixDatabase();