export interface PontoColeta {
  _id?: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  tiposMateriais: string[];
  horarioFuncionamento?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
}