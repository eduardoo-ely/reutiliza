const mongoose = require('mongoose');

const recompensaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  titulo: {
    type: String,
    trim: true
  },
  descricao: {
    type: String,
    required: true,
    maxlength: 500
  },
  pontosNecessarios: {
    type: Number,
    required: true,
    min: 1
  },
  custoEmPontos: {
    type: Number,
    required: true,
    min: 1
  },
  tipo: {
    type: String,
    required: true,
    enum: ['voucher', 'brinde', 'desconto'],
    default: 'voucher'
  },
  codigo: {
    type: String,
    trim: true,
    sparse: true
  },
  disponivel: {
    type: Boolean,
    default: true,
    index: true
  },
  imagem: {
    type: String
  },
  validade: {
    type: Date
  },
  // Novos campos para controle
  quantidadeDisponivel: {
    type: Number,
    default: -1 // -1 = ilimitado
  },
  quantidadeResgatada: {
    type: Number,
    default: 0
  },
  // Metadados
  categoria: {
    type: String,
    enum: ['alimentacao', 'entretenimento', 'sustentabilidade', 'transporte', 'outros'],
    default: 'outros'
  },
  parceiro: {
    nome: String,
    logo: String,
    contato: String
  },
  termos: {
    type: String,
    maxlength: 1000
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
recompensaSchema.index({ disponivel: 1, ativo: 1, pontosNecessarios: 1 });
recompensaSchema.index({ categoria: 1 });

// Virtual para verificar se está disponível
recompensaSchema.virtual('estaDisponivel').get(function() {
  if (!this.disponivel || !this.ativo) return false;
  if (this.validade && new Date() > this.validade) return false;
  if (this.quantidadeDisponivel !== -1 && this.quantidadeResgatada >= this.quantidadeDisponivel) return false;
  return true;
});

// Método para resgatar
recompensaSchema.methods.resgatar = async function() {
  if (!this.estaDisponivel) {
    throw new Error('Recompensa não disponível');
  }

  if (this.quantidadeDisponivel !== -1) {
    this.quantidadeResgatada += 1;

    if (this.quantidadeResgatada >= this.quantidadeDisponivel) {
      this.disponivel = false;
    }

    await this.save();
  }

  return this;
};

// Static para obter recompensas disponíveis
recompensaSchema.statics.getDisponiveis = async function(filtros = {}) {
  const query = {
    disponivel: true,
    ativo: true
  };

  // Filtrar por categoria
  if (filtros.categoria) {
    query.categoria = filtros.categoria;
  }

  // Filtrar por pontos do usuário
  if (filtros.pontosUsuario) {
    query.pontosNecessarios = { $lte: filtros.pontosUsuario };
  }

  const recompensas = await this.find(query)
      .sort({ pontosNecessarios: 1 })
      .lean();

  // Filtrar por validade e quantidade
  const agora = new Date();
  return recompensas.filter(r => {
    if (r.validade && agora > r.validade) return false;
    if (r.quantidadeDisponivel !== -1 && r.quantidadeResgatada >= r.quantidadeDisponivel) return false;
    return true;
  });
};

// Static para estatísticas
recompensaSchema.statics.getEstatisticas = async function() {
  const total = await this.countDocuments();
  const disponiveis = await this.countDocuments({ disponivel: true, ativo: true });
  const resgatadas = await this.aggregate([
    { $group: { _id: null, total: { $sum: '$quantidadeResgatada' } } }
  ]);

  const porCategoria = await this.aggregate([
    { $match: { disponivel: true, ativo: true } },
    { $group: { _id: '$categoria', count: { $sum: 1 } } }
  ]);

  return {
    total,
    disponiveis,
    totalResgatadas: resgatadas[0]?.total || 0,
    porCategoria
  };
};

const Recompensa = mongoose.model('Recompensa', recompensaSchema);

module.exports = Recompensa;