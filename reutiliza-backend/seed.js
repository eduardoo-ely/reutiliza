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

        // --- 1. Limpar e recriar utilizadores ---
        console.log('\nLimpando e recriando a coleção de utilizadores...');
        await db.collection('usuarios').deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const senhaHash1 = await bcrypt.hash("senha123", salt); // Senha para edu@email.com
        const senhaHash2 = await bcrypt.hash("teste123", salt); // Senha para teste@email.com

        await db.collection('usuarios').insertMany([
            { nome: "Eduardo Ely", email: "edu@email.com", senha: senhaHash1 },
            { nome: "Usuário Teste", email: "teste@email.com", senha: senhaHash2 }
        ]);
        console.log('Utilizadores de exemplo inseridos com senhas encriptadas.');

        console.log('\n-------------------------------------------------------------');
        console.log('>>> SUCESSO: A base de dados está pronta para o login!');
        console.log('-------------------------------------------------------------');

    } catch (err) {
        console.error('\nOcorreu um erro durante o processo:', err);
    } finally {
        await client.close();
        console.log('\nConexão com o MongoDB fechada.');
    }
}