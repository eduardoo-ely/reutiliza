import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { MaterialReciclado, ValidacaoCruzada, PontosUsuario, Recompensa } from '../../models/material-reciclado.model';
import { environment } from '../../../environments/environment';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MaterialRecicladoService {
  private apiUrl = `${environment.apiUrl}`;
  
  // Cache para dados frequentemente acessados
  private materiaisCache: MaterialReciclado[] = [];
  private recompensasCache: Recompensa[] = [];

  constructor(private http: HttpClient) { }

  // Materiais Reciclados
  getMateriais(usuarioId?: string): Observable<MaterialReciclado[]> {
    // Para desenvolvimento, se a API não estiver disponível
    if (!environment.production && this.materiaisCache.length > 0) {
      if (usuarioId) {
        return of(this.materiaisCache.filter(m => m.usuarioId === usuarioId));
      }
      return of(this.materiaisCache);
    }

    const url = usuarioId 
      ? `${this.apiUrl}/materiais-reciclados?usuarioId=${usuarioId}` 
      : `${this.apiUrl}/materiais-reciclados`;
    
    return this.http.get<MaterialReciclado[]>(url).pipe(
      tap(materiais => this.materiaisCache = materiais),
      catchError(error => {
        console.error('Erro ao buscar materiais:', error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const mockMateriais: MaterialReciclado[] = [
            {
              _id: '1',
              usuarioId: '123456789',
              material: 'Plástico',
              quantidade: 2.5,
              unidade: 'kg',
              dataEntrega: new Date(),
              status: 'pendente',
              pontos: 25
            },
            {
              _id: '2',
              usuarioId: '123456789',
              material: 'Papel',
              quantidade: 5,
              unidade: 'kg',
              dataEntrega: new Date(),
              status: 'validado',
              pontos: 50
            }
          ];
          this.materiaisCache = mockMateriais;
          if (usuarioId) {
            return of(mockMateriais.filter(m => m.usuarioId === usuarioId));
          }
          return of(mockMateriais);
        }
        return of([]);
      })
    );
  }

  getMaterialById(id: string): Observable<MaterialReciclado> {
    // Verificar cache primeiro
    const cachedMaterial = this.materiaisCache.find(m => m._id === id);
    if (cachedMaterial) {
      return of(cachedMaterial);
    }

    return this.http.get<MaterialReciclado>(`${this.apiUrl}/materiais-reciclados/${id}`).pipe(
      catchError(error => {
        console.error(`Erro ao buscar material ${id}:`, error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const mockMaterial: MaterialReciclado = {
            _id: id,
            usuarioId: '123456789',
            material: 'Plástico',
            quantidade: 2.5,
            unidade: 'kg',
            dataEntrega: new Date(),
            status: 'pendente',
            pontos: 25
          };
          return of(mockMaterial);
        }
        throw error;
      })
    );
  }

  registrarMaterial(material: MaterialReciclado): Observable<MaterialReciclado> {
    return this.http.post<MaterialReciclado>(`${this.apiUrl}/materiais-reciclados`, material).pipe(
      tap(novoMaterial => {
        this.materiaisCache.push(novoMaterial);
      }),
      catchError(error => {
        console.error('Erro ao registrar material:', error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const mockMaterial: MaterialReciclado = {
            ...material,
            _id: Date.now().toString(),
            status: 'pendente',
            pontos: Math.floor(material.quantidade * 10)
          };
          this.materiaisCache.push(mockMaterial);
          return of(mockMaterial);
        }
        throw error;
      })
    );
  }

  atualizarMaterial(id: string, material: Partial<MaterialReciclado>): Observable<MaterialReciclado> {
    return this.http.put<MaterialReciclado>(`${this.apiUrl}/materiais-reciclados/${id}`, material).pipe(
      tap(materialAtualizado => {
        const index = this.materiaisCache.findIndex(m => m._id === id);
        if (index !== -1) {
          this.materiaisCache[index] = materialAtualizado;
        }
      }),
      catchError(error => {
        console.error(`Erro ao atualizar material ${id}:`, error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const index = this.materiaisCache.findIndex(m => m._id === id);
          if (index !== -1) {
            const materialAtualizado = { ...this.materiaisCache[index], ...material };
            this.materiaisCache[index] = materialAtualizado;
            return of(materialAtualizado);
          }
        }
        throw error;
      })
    );
  }

  excluirMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/materiais-reciclados/${id}`).pipe(
      tap(() => {
        this.materiaisCache = this.materiaisCache.filter(m => m._id !== id);
      }),
      catchError(error => {
        console.error(`Erro ao excluir material ${id}:`, error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          this.materiaisCache = this.materiaisCache.filter(m => m._id !== id);
          return of(undefined);
        }
        throw error;
      })
    );
  }

  // Validação Cruzada
  getValidacoesPendentes(usuarioId: string): Observable<ValidacaoCruzada[]> {
    return this.http.get<ValidacaoCruzada[]>(`${this.apiUrl}/validacoes?usuarioId=${usuarioId}&pendente=true`).pipe(
      catchError(error => {
        console.error('Erro ao buscar validações pendentes:', error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const mockValidacoes: ValidacaoCruzada[] = [
            {
              _id: '1',
              materialRecicladoId: '1',
              usuarioEntregaId: '987654321',
              usuarioRecebeId: usuarioId,
              confirmado: false
            }
          ];
          return of(mockValidacoes);
        }
        return of([]);
      })
    );
  }

  confirmarValidacao(id: string, confirmado: boolean, observacoes?: string): Observable<ValidacaoCruzada> {
    return this.http.put<ValidacaoCruzada>(`${this.apiUrl}/validacoes/${id}`, {
      confirmado,
      observacoes,
      dataConfirmacao: new Date()
    }).pipe(
      catchError(error => {
        console.error(`Erro ao confirmar validação ${id}:`, error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const mockValidacao: ValidacaoCruzada = {
            _id: id,
            materialRecicladoId: '1',
            usuarioEntregaId: '987654321',
            usuarioRecebeId: '123456789',
            confirmado: confirmado,
            dataConfirmacao: new Date(),
            observacoes: observacoes
          };
          return of(mockValidacao);
        }
        throw error;
      })
    );
  }

  // Sistema de Pontos
  getPontosUsuario(usuarioId: string): Observable<PontosUsuario> {
    return this.http.get<PontosUsuario>(`${this.apiUrl}/pontos/${usuarioId}`).pipe(
      catchError(error => {
        console.error(`Erro ao buscar pontos do usuário ${usuarioId}:`, error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const mockPontos: PontosUsuario = {
            _id: '1',
            usuarioId: usuarioId,
            pontos: 150,
            pontosUtilizados: 50,
            historicoTransacoes: [
              {
                data: new Date(),
                pontos: 25,
                tipo: 'ganho',
                descricao: 'Reciclagem de 2.5kg de plástico'
              },
              {
                data: new Date(Date.now() - 86400000), // Ontem
                pontos: 50,
                tipo: 'ganho',
                descricao: 'Reciclagem de 5kg de papel'
              },
              {
                data: new Date(Date.now() - 172800000), // Anteontem
                pontos: 50,
                tipo: 'gasto',
                descricao: 'Resgate de voucher de desconto'
              }
            ]
          };
          return of(mockPontos);
        }
        return of({
          _id: '0',
          usuarioId: usuarioId,
          pontos: 0,
          pontosUtilizados: 0,
          historicoTransacoes: []
        });
      })
    );
  }

  // Recompensas
  getRecompensasDisponiveis(): Observable<Recompensa[]> {
    // Verificar cache primeiro
    if (this.recompensasCache.length > 0) {
      return of(this.recompensasCache.filter(r => r.disponivel));
    }

    return this.http.get<Recompensa[]>(`${this.apiUrl}/recompensas?disponivel=true`).pipe(
      tap(recompensas => this.recompensasCache = recompensas),
      catchError(error => {
        console.error('Erro ao buscar recompensas disponíveis:', error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const mockRecompensas: Recompensa[] = [
            {
              _id: '1',
              nome: 'Voucher de Desconto',
              descricao: '10% de desconto em compras acima de R$100',
              pontosNecessarios: 50,
              tipo: 'voucher',
              disponivel: true,
              validade: new Date(Date.now() + 30 * 86400000) // 30 dias
            },
            {
              _id: '2',
              nome: 'Ecobag Reutilizável',
              descricao: 'Ecobag feita de material reciclado',
              pontosNecessarios: 100,
              tipo: 'brinde',
              disponivel: true
            },
            {
              _id: '3',
              nome: 'Desconto em Serviços',
              descricao: '15% de desconto em serviços de jardinagem',
              pontosNecessarios: 75,
              tipo: 'desconto',
              disponivel: true,
              validade: new Date(Date.now() + 60 * 86400000) // 60 dias
            }
          ];
          this.recompensasCache = mockRecompensas;
          return of(mockRecompensas);
        }
        return of([]);
      })
    );
  }

  resgatarRecompensa(recompensaId: string, usuarioId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/recompensas/resgatar`, {
      recompensaId,
      usuarioId
    }).pipe(
      catchError(error => {
        console.error(`Erro ao resgatar recompensa ${recompensaId}:`, error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          // Simular sucesso no resgate
          return of({ success: true, message: 'Recompensa resgatada com sucesso!' });
        }
        throw error;
      })
    );
  }

  // Validação por Administrador
  validarMaterial(id: string, validado: boolean, observacoes?: string): Observable<MaterialReciclado> {
    return this.http.put<MaterialReciclado>(`${this.apiUrl}/materiais-reciclados/${id}/validar`, {
      status: validado ? 'validado' as const : 'rejeitado' as const,
      observacoes
    }).pipe(
      tap(materialAtualizado => {
        const index = this.materiaisCache.findIndex(m => m._id === id);
        if (index !== -1) {
          this.materiaisCache[index] = materialAtualizado;
        }
      }),
      catchError(error => {
        console.error(`Erro ao validar material ${id}:`, error);
        // Dados de exemplo para desenvolvimento
        if (!environment.production) {
          const index = this.materiaisCache.findIndex(m => m._id === id);
          if (index !== -1) {
            const materialAtualizado = { 
              ...this.materiaisCache[index], 
              status: validado ? 'validado' as const : 'rejeitado' as const,
              observacoes: observacoes
            };
            this.materiaisCache[index] = materialAtualizado;
            return of(materialAtualizado);
          }
          // Se não encontrar no cache, criar um mock
          const mockMaterial: MaterialReciclado = {
            _id: id,
            usuarioId: '123456789',
            material: 'Plástico',
            quantidade: 2.5,
            unidade: 'kg',
            dataEntrega: new Date(),
            status: validado ? 'validado' : 'rejeitado',
            observacoes: observacoes,
            pontos: 25
          };
          return of(mockMaterial);
        }
        throw error;
      })
    );
  }
}