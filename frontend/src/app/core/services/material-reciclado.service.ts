import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// INTERFACES
export interface MaterialReciclado {
  _id?: string;
  usuario?: any;
  usuarioId?: string;
  pontoColeta?: any;
  pontoColetaId?: string;
  tipo?: string;
  material?: string;
  quantidade: number;
  unidade: 'kg' | 'litros' | 'unidades';
  pontos?: number;
  status: 'pendente' | 'validado' | 'rejeitado';
  dataRegistro?: Date;
  dataValidacao?: Date;
  observacoes?: string;
}

export interface ValidacaoCruzada {
  _id?: string;
  material: any;
  materialRecicladoId?: string;
  validador: any;
  usuarioEntregaId?: string;
  usuarioRecebeId?: string;
  status: 'pendente' | 'validado' | 'rejeitado';
  comentario?: string;
  observacoes?: string;
  confirmado?: boolean;
  dataValidacao?: Date;
  dataConfirmacao?: Date;
}

export interface PontosUsuario {
  _id?: string;
  usuarioId: string;
  nome?: string;
  email?: string;
  pontos: number;
  pontosUtilizados: number;
  historicoTransacoes: TransacaoPontos[];
}

export interface TransacaoPontos {
  data: Date;
  pontos: number;
  tipo: 'ganho' | 'gasto';
  descricao: string;
  materialId?: string;
  recompensaId?: string;
}

export interface Recompensa {
  _id?: string;
  nome: string;
  titulo?: string;
  descricao: string;
  pontosNecessarios: number;
  custoEmPontos?: number;
  tipo: 'voucher' | 'brinde' | 'desconto';
  codigo?: string;
  disponivel: boolean;
  ativo?: boolean;
  imagem?: string;
  validade?: Date;
  categoria?: string;
  quantidadeDisponivel?: number;
  quantidadeResgatada?: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MaterialRecicladoService {
  private apiMateriais = `${environment.apiUrl}/materiais`;
  private apiValidacoes = `${environment.apiUrl}/validacoes`;
  private apiPontuacao = `${environment.apiUrl}/pontuacao`;
  private apiRecompensas = `${environment.apiUrl}/recompensas`;

  constructor(private http: HttpClient) {}

  // ==========================================
  // MATERIAIS RECICLADOS
  // ==========================================

  getMateriais(usuarioId?: string, status?: string): Observable<MaterialReciclado[]> {
    let params = new HttpParams();
    if (usuarioId) params = params.set('usuarioId', usuarioId);
    if (status) params = params.set('status', status);

    return this.http.get<ApiResponse<MaterialReciclado[]>>(this.apiMateriais, { params }).pipe(
        map(response => response.data || []),
        catchError(this.handleError)
    );
  }

  getMaterialById(id: string): Observable<MaterialReciclado> {
    return this.http.get<ApiResponse<MaterialReciclado>>(`${this.apiMateriais}/${id}`).pipe(
        map(response => {
          if (!response.data) throw new Error('Material não encontrado');
          return response.data;
        }),
        catchError(this.handleError)
    );
  }

  registrarMaterial(payload: {
    usuarioId: string;
    pontoColetaId: string;
    material: string;
    quantidade: number;
    unidade: string;
    observacoes?: string;
  }): Observable<MaterialReciclado> {
    return this.http.post<ApiResponse<MaterialReciclado>>(this.apiMateriais, payload).pipe(
        map(response => {
          if (!response.data) throw new Error('Erro ao registrar material');
          return response.data;
        }),
        catchError(this.handleError)
    );
  }

  atualizarMaterial(id: string, material: Partial<MaterialReciclado>): Observable<MaterialReciclado> {
    return this.http.put<ApiResponse<MaterialReciclado>>(`${this.apiMateriais}/${id}`, material).pipe(
        map(response => {
          if (!response.data) throw new Error('Erro ao atualizar material');
          return response.data;
        }),
        catchError(this.handleError)
    );
  }

  validarMaterial(id: string, validado: boolean, observacoes?: string): Observable<MaterialReciclado> {
    return this.http.put<ApiResponse<MaterialReciclado>>(`${this.apiMateriais}/${id}/validar`, {
      status: validado ? 'validado' : 'rejeitado',
      observacoes
    }).pipe(
        map(response => {
          if (!response.data) throw new Error('Erro ao validar material');
          return response.data;
        }),
        catchError(this.handleError)
    );
  }

  excluirMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiMateriais}/${id}`).pipe(
        catchError(this.handleError)
    );
  }

  // ==========================================
  // VALIDAÇÃO CRUZADA
  // ==========================================

  getValidacoesPendentes(usuarioId: string): Observable<ValidacaoCruzada[]> {
    const params = new HttpParams()
        .set('usuarioId', usuarioId)
        .set('pendente', 'true');

    return this.http.get<ApiResponse<ValidacaoCruzada[]>>(this.apiValidacoes, { params }).pipe(
        map(response => response.data || []),
        catchError(this.handleError)
    );
  }

  confirmarValidacao(id: string, confirmado: boolean, observacoes?: string): Observable<ValidacaoCruzada> {
    return this.http.put<ApiResponse<ValidacaoCruzada>>(`${this.apiValidacoes}/${id}`, {
      confirmado,
      observacoes
    }).pipe(
        map(response => {
          if (!response.data) throw new Error('Erro ao confirmar validação');
          return response.data;
        }),
        catchError(this.handleError)
    );
  }

  // ==========================================
  // SISTEMA DE PONTOS
  // ==========================================

  getPontosUsuario(usuarioId: string): Observable<PontosUsuario> {
    return this.http.get<ApiResponse<PontosUsuario>>(`${this.apiPontuacao}/${usuarioId}`).pipe(
        map(response => {
          if (!response.data) throw new Error('Erro ao buscar pontos');
          return response.data;
        }),
        catchError(this.handleError)
    );
  }

  adicionarPontos(usuarioId: string, pontos: number, descricao: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiPontuacao}/transacao`, {
      usuarioId,
      pontos,
      tipo: 'ganho',
      descricao
    }).pipe(
        map(response => response.data),
        catchError(this.handleError)
    );
  }

  removerPontos(usuarioId: string, pontos: number, descricao: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiPontuacao}/transacao`, {
      usuarioId,
      pontos,
      tipo: 'gasto',
      descricao
    }).pipe(
        map(response => response.data),
        catchError(this.handleError)
    );
  }

  // ==========================================
  // RECOMPENSAS
  // ==========================================

  getRecompensasDisponiveis(): Observable<Recompensa[]> {
    console.log('🎁 Buscando recompensas disponíveis...');

    return this.http.get<ApiResponse<Recompensa[]>>(`${this.apiRecompensas}?disponivel=true`).pipe(
        tap(response => {
          console.log('✅ Resposta do servidor:', response);
        }),
        map(response => {
          const recompensas = response.data || [];
          console.log(`✅ ${recompensas.length} recompensas encontradas`);
          return recompensas;
        }),
        catchError(error => {
          console.error('❌ Erro ao buscar recompensas:', error);
          return this.handleError(error);
        })
    );
  }

  getTodasRecompensas(): Observable<Recompensa[]> {
    return this.http.get<ApiResponse<Recompensa[]>>(this.apiRecompensas).pipe(
        map(response => response.data || []),
        catchError(this.handleError)
    );
  }

  getRecompensaPorId(id: string): Observable<Recompensa> {
    return this.http.get<ApiResponse<Recompensa>>(`${this.apiRecompensas}/${id}`).pipe(
        map(response => {
          if (!response.data) throw new Error('Recompensa não encontrada');
          return response.data;
        }),
        catchError(this.handleError)
    );
  }

  resgatarRecompensa(recompensaId: string, usuarioId: string): Observable<any> {
    console.log('🎁 Resgatando recompensa...');
    console.log('   Recompensa ID:', recompensaId);
    console.log('   Usuario ID:', usuarioId);

    return this.http.post<ApiResponse<any>>(`${this.apiRecompensas}/resgatar`, {
      recompensaId,
      usuarioId
    }).pipe(
        tap(response => {
          console.log('✅ Resposta do resgate:', response);
        }),
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Erro ao resgatar recompensa');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('❌ Erro ao resgatar:', error);
          return this.handleError(error);
        })
    );
  }

  // ==========================================
  // TRATAMENTO DE ERROS
  // ==========================================

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Erro desconhecido';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Erro ${error.status}: ${error.statusText}`;
    }

    console.error('❌ Erro na requisição:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}