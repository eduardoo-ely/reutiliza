export interface PontoColeta {
  _id?: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  materiais: string[];
  horarioFuncionamento: string;
  telefone?: string;
  email?: string;
  ativo?: boolean;
}
