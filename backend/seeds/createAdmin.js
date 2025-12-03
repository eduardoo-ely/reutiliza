const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'ReutilizaDB';

// Debug
console.log('📂 Diretório atual:', __dirname);
console.log('📄 Arquivo .env:', path.resolve(__dirname, '../.env'));
console.log('🔗 MONGO_URI:', MONGO_URI ? '✅ Encontrada' : '❌ Não encontrada');
console.log('');

async function criarAdmin() {
    if (!MONGO_URI) {
        console.error('\n❌ ERRO CRÍTICO: A variável de ambiente MONGO_URI não foi encontrada.');
        return;
    }

    console.log('>>> Iniciando script para popular a base de dados...');
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        console.log(`✅ Conectado a "${DB_NAME}".`);

        // Dados do super admin
        const adminData = {
            nome: 'Super Admin',
            email: 'admin@reutiliza.com',
            senha: 'Admin@123', // MUDAR EM PRODUÇÃO!
            role: 'super_admin',
            nivelAcesso: 5,
            ativo: true,
            pontos: 0,
            pontosUtilizados: 0,
            endereco: {
                cidade: 'Chapecó',
                estado: 'SC'
            },
            permissoes: [
                { modulo: 'pontos', acoes: ['ler', 'criar', 'editar', 'deletar'] },
                { modulo: 'usuarios', acoes: ['ler', 'criar', 'editar', 'deletar', 'validar'] },
                { modulo: 'materiais', acoes: ['ler', 'criar', 'editar', 'deletar', 'validar'] },
                { modulo: 'denuncias', acoes: ['ler', 'criar', 'editar', 'deletar', 'validar'] },
                { modulo: 'recompensas', acoes: ['ler', 'criar', 'editar', 'deletar', 'validar'] },
                { modulo: 'validacoes', acoes: ['ler', 'criar', 'editar', 'deletar', 'validar'] },
                { modulo: 'estoque', acoes: ['ler', 'criar', 'editar', 'deletar'] },
                { modulo: 'notificacoes', acoes: ['ler', 'criar', 'editar', 'deletar'] },
                { modulo: 'configuracoes', acoes: ['ler', 'criar', 'editar', 'deletar'] },
                { modulo: 'metricas', acoes: ['ler', 'exportar'] },
                { modulo: 'auditoria', acoes: ['ler', 'exportar'] }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Verificar se admin já existe
        const adminExistente = await usersCollection.findOne({ email: adminData.email });

        if (adminExistente) {
            console.log('⚠️  Admin já existe!');
            console.log('📧 Email:', adminExistente.email);
            console.log('🎭 Role:', adminExistente.role);

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('\nDeseja atualizar? (s/n): ', async (resposta) => {
                if (resposta.toLowerCase() === 's') {
                    const senhaHash = await bcrypt.hash(adminData.senha, 10);

                    await usersCollection.updateOne(
                        { email: adminData.email },
                        {
                            $set: {
                                nome: adminData.nome,
                                senha: senhaHash,
                                role: 'super_admin',
                                nivelAcesso: 5,
                                permissoes: adminData.permissoes,
                                ativo: true,
                                updatedAt: new Date()
                            }
                        }
                    );

                    console.log('\n✅ Admin atualizado com sucesso!');
                    mostrarCredenciais(adminData);
                } else {
                    console.log('\n❌ Operação cancelada');
                }

                rl.close();
                await client.close();
                process.exit(0);
            });

            return;
        }

        // Criar hash da senha
        const senhaHash = await bcrypt.hash(adminData.senha, 10);

        // Criar admin
        await usersCollection.insertOne({
            ...adminData,
            senha: senhaHash
        });

        console.log('\n🎉 Super Admin criado com sucesso!\n');
        mostrarCredenciais(adminData);

        // Criar também um moderador de exemplo
        console.log('\n📝 Criando moderador de exemplo...');

        const moderadorSenhaHash = await bcrypt.hash('Mod@123', 10);

        const moderadorExistente = await usersCollection.findOne({ email: 'moderador@reutiliza.com' });

        if (!moderadorExistente) {
            await usersCollection.insertOne({
                nome: 'Moderador Exemplo',
                email: 'moderador@reutiliza.com',
                senha: moderadorSenhaHash,
                role: 'moderador',
                nivelAcesso: 3,
                ativo: true,
                pontos: 0,
                pontosUtilizados: 0,
                endereco: {
                    cidade: 'Chapecó',
                    estado: 'SC'
                },
                permissoes: [
                    { modulo: 'pontos', acoes: ['ler', 'editar'] },
                    { modulo: 'materiais', acoes: ['ler', 'validar'] },
                    { modulo: 'denuncias', acoes: ['ler', 'validar'] },
                    { modulo: 'usuarios', acoes: ['ler'] },
                    { modulo: 'metricas', acoes: ['ler'] }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            });

            console.log('✅ Moderador criado!');
            console.log('📧 Email: moderador@reutiliza.com');
            console.log('🔑 Senha: Mod@123');
        } else {
            console.log('⚠️  Moderador já existe!');
        }

        await client.close();
        console.log('\n🔌 Desconectado do MongoDB');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Erro ao criar admin:', error);
        await client.close();
        process.exit(1);
    }
}

function mostrarCredenciais(admin) {
    console.log('═══════════════════════════════════════════');
    console.log('           CREDENCIAIS DE ACESSO           ');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('👤 Nome:', admin.nome);
    console.log('📧 Email:', admin.email);
    console.log('🔑 Senha:', admin.senha);
    console.log('🎭 Role:', admin.role);
    console.log('🔢 Nível de Acesso:', admin.nivelAcesso);
    console.log('');
    console.log('⚠️  IMPORTANTE: MUDE A SENHA APÓS O PRIMEIRO LOGIN!');
    console.log('═══════════════════════════════════════════');
}

// Executar
criarAdmin();