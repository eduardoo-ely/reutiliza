export interface MaterialReciclado {
  _id?: string;
  usuarioId: string;
  pontoColetaId?: string;
  material: string;
  quantidade: number;
  unidade: 'kg' | 'litros' | 'unidades';
  dataEntrega: Date;
  status: 'pendente' | 'validado' | 'rejeitado';
  validadoPor?: string;
  pontos?: number;
  observacoes?: string;
}

export interface ValidacaoCruzada {
  _id?: string;
  materialRecicladoId: string;
  usuarioEntregaId: string;
  usuarioRecebeId: string;
  confirmado: boolean;
  dataConfirmacao?: Date;
  observacoes?: string;
}

export interface Recompensa {
  _id?: string;
  nome: string;
  descricao: string;
  pontosNecessarios: number;
  tipo: 'voucher' | 'brinde' | 'desconto';
  codigo?: string;
  disponivel: boolean;
  imagem?: string;
  validade?: Date;
}

export interface PontosUsuario {
  _id?: string;
  usuarioId: string;
  pontos: number;
  pontosUtilizados: number;
  historicoTransacoes: TransacaoPontos[];
}

export interface TransacaoPontos {
  data: Date;
  pontos: number;
  tipo: 'ganho' | 'gasto';
  descricao: string;
  materialRecicladoId?: string;
  recompensaId?: string;
}