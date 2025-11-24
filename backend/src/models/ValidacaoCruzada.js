const mongoose = require('mongoose');

const validacaoCruzadaSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialReciclado',
    required: true,
    index: true
  },
  validador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pendente', 'validado', 'rejeitado'],
    default: 'pendente',
    index: true
  },
  comentario: {
    type: String,
    maxlength: 500
  },
  observacoes: {
    type: String,
    maxlength: 500
  },
  confirmado: {
    type: Boolean
  },
  dataValidacao: {
    type: Date,
    default: Date.now
  },
  dataConfirmacao: {
    type: Date
  },
  // Pontos ganhos pelo validador
  pontosValidador: {
    type: Number,
    default: 10 // Bônus por validar
  },
  // Prioridade
  prioridade: {
    type: String,
    enum: ['baixa', 'normal', 'alta'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Índices compostos
validacaoCruzadaSchema.index({ material: 1, validador: 1 }, { unique: true });
validacaoCruzadaSchema.index({ validador: 1, status: 1, createdAt: -1 });

// Middleware para processar confirmação
validacaoCruzadaSchema.pre('save', async function(next) {
  // Se foi confirmado e ainda não tem data de confirmação
  if (this.isModified('confirmado') && this.confirmado !== undefined && !this.dataConfirmacao) {
    this.dataConfirmacao = new Date();
    this.status = this.confirmado ? 'validado' : 'rejeitado';
  }
  next();
});

// Método para confirmar validação
validacaoCruzadaSchema.methods.confirmar = async function(confirmado, observacoes) {
  this.confirmado = confirmado;
  this.status = confirmado ? 'validado' : 'rejeitado';
  this.dataConfirmacao = new Date();
  if (observacoes) {
    this.observacoes = observacoes;
  }

  await this.save();

  // Se confirmado, atualizar material e dar pontos ao validador
  if (confirmado) {
    const MaterialReciclado = mongoose.model('MaterialReciclado');
    const User = mongoose.model('User');
    const TransacaoPontos = mongoose.model('TransacaoPontos');
    const Notificacao = mongoose.model('Notificacao');

    // Atualizar material para aguardar validação admin
    const material = await MaterialReciclado.findById(this.material);
    if (material && material.status === 'pendente') {
      material.status = 'aguardando_admin';
      await material.save();
    }

    // Adicionar pontos ao validador
    const validador = await User.findById(this.validador);
    if (validador) {
      validador.pontos = (validador.pontos || 0) + this.pontosValidador;
      await validador.save();

      // Registrar transação
      await TransacaoPontos.create({
        usuario: this.validador,
        tipo: 'bonus',
        pontos: this.pontosValidador,
        saldoAnterior: validador.pontos - this.pontosValidador,
        saldoAtual: validador.pontos,
        descricao: `Bônus por validação cruzada`,
        origem: {
          tipo: 'validacao',
          id: this._id
        },
        status: 'concluida'
      });

      // Criar notificação
      await Notificacao.create({
        usuario: this.validador,
        tipo: 'pontos_ganhos',
        titulo: '🎉 Pontos Ganhos!',
        mensagem: `Você ganhou ${this.pontosValidador} pontos por validar uma entrega!`,
        referencia: {
          tipo: 'validacao',
          id: this._id
        },
        prioridade: 'normal',
        metadata: {
          pontos: this.pontosValidador
        }
      });
    }
  }

  return this;
};

// Static para obter validações pendentes de um usuário
validacaoCruzadaSchema.statics.getPendentes = async function(validadorId) {
  return this.find({
    validador: validadorId,
    status: 'pendente'
  })
      .populate({
        path: 'material',
        populate: [
          { path: 'usuario', select: 'nome email' },
          { path: 'pontoColeta', select: 'nome endereco' }
        ]
      })
      .sort({ prioridade: -1, createdAt: 1 });
};

// Static para criar validação cruzada
validacaoCruzadaSchema.statics.criarValidacao = async function(materialId, validadorId) {
  const Notificacao = mongoose.model('Notificacao');

  // Criar validação
  const validacao = await this.create({
    material: materialId,
    validador: validadorId,
    status: 'pendente',
    prioridade: 'normal'
  });

  // Notificar validador
  await Notificacao.create({
    usuario: validadorId,
    tipo: 'validacao_pendente',
    titulo: '✅ Nova Validação Solicitada',
    mensagem: 'Um material está aguardando sua validação cruzada.',
    referencia: {
      tipo: 'validacao',
      id: validacao._id
    },
    prioridade: 'alta'
  });

  return validacao;
};

// Static para estatísticas
validacaoCruzadaSchema.statics.getEstatisticas = async function(validadorId) {
  const query = validadorId ? { validador: validadorId } : {};

  const [total, validadas, rejeitadas, pendentes] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, status: 'validado' }),
    this.countDocuments({ ...query, status: 'rejeitado' }),
    this.countDocuments({ ...query, status: 'pendente' })
  ]);

  return {
    total,
    validadas,
    rejeitadas,
    pendentes,
    taxaAprovacao: total > 0 ? ((validadas / total) * 100).toFixed(1) : 0
  };
};

const ValidacaoCruzada = mongoose.model('ValidacaoCruzada', validacaoCruzadaSchema);

module.exports = ValidacaoCruzada;