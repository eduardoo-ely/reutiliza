const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Usamos os modelos existentes quando disponíveis
let User, PontoColeta, MaterialReciclado, Recompensa, ValidacaoCruzada;

try {
  User = require('../models/UserModel');
} catch (error) {
  console.log('Usando modelo User alternativo');
}

try {
  PontoColeta = require('../models/PontoColeta');
} catch (error) {
  console.log('Modelo PontoColeta não encontrado');
}

try {
  MaterialReciclado = require('../models/MaterialReciclado');
} catch (error) {
  console.log('Modelo MaterialReciclado não encontrado');
}

try {
  Recompensa = require('../models/Recompensa');
} catch (error) {
  console.log('Modelo Recompensa não encontrado');
}

try {
  ValidacaoCruzada = require('../models/ValidacaoCruzada');
} catch (error) {
  console.log('Modelo ValidacaoCruzada não encontrado');
}

// Função para verificar a conexão com o MongoDB
const checkDbConnection = async (req, res) => {
  try {
    const status = mongoose.connection.readyState;
    let statusText = '';
    
    switch (status) {
      case 0: statusText = 'Desconectado'; break;
      case 1: statusText = 'Conectado'; break;
      case 2: statusText = 'Conectando'; break;
      case 3: statusText = 'Desconectando'; break;
      default: statusText = 'Desconhecido';
    }
    
    // Verificar se as collections existem
    const collections = {
      users: await mongoose.connection.db.collection('users').countDocuments(),
      pontosColeta: await mongoose.connection.db.collection('pontocoletas').countDocuments(),
      materiaisReciclados: await mongoose.connection.db.collection('materialreciclados').countDocuments(),
      recompensas: await mongoose.connection.db.collection('recompensas').countDocuments(),
      validacoesCruzadas: await mongoose.connection.db.collection('validacaocruzadas').countDocuments()
    };
    
    return res.status(200).json({
      status: 'success',
      connection: {
        status: status,
        statusText: statusText
      },
      collections: collections,
      message: 'Informações da conexão com o banco de dados'
    });
  } catch (error) {
    console.error('Erro ao verificar conexão com o banco:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao verificar conexão com o banco de dados',
      error: error.message
    });
  }
};

// Função para inicializar o banco de dados (criar collections se não existirem)
const initializeDatabase = async (req, res) => {
  try {
    // Verificar se as collections existem e criar se necessário
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Criar documentos de exemplo para garantir que as collections existam
    if (!collectionNames.includes('users')) {
      await User.create({
        nome: 'Admin Inicial',
        email: 'admin@reutiliza.com',
        senha: await bcrypt.hash('admin123', 10),
        pontos: 0,
        role: 'admin',
        createdAt: new Date()
      });
    }
    
    if (!collectionNames.includes('pontocoletas')) {
      await PontoColeta.create({
        nome: 'Ecoponto Inicial',
        endereco: 'Av. Principal, 100',
        coordenadas: {
          lat: -23.5505,
          lng: -46.6333
        },
        materiais: ['Papel', 'Plástico'],
        horarioFuncionamento: 'Segunda a Sexta, 9h às 17h',
        createdAt: new Date()
      });
    }
    
    if (!collectionNames.includes('recompensas')) {
      await Recompensa.create({
        titulo: 'Recompensa Inicial',
        descricao: 'Desconto em produtos sustentáveis',
        pontosNecessarios: 100,
        disponivel: true,
        createdAt: new Date()
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Banco de dados inicializado com sucesso',
      collections: await mongoose.connection.db.listCollections().toArray()
    });
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao inicializar banco de dados',
      error: error.message
    });
  }
};

module.exports = {
  checkDbConnection,
  initializeDatabase
};