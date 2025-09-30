import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PontoColeta } from '../../../models/ponto.models';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PontoCrudService {
  private apiUrl = `${environment.apiUrl}/pontos`;

  constructor(private http: HttpClient) { }

  // Obter todos os pontos
  getAll(): Observable<PontoColeta[]> {
    return this.http.get<PontoColeta[]>(this.apiUrl);
  }

  // Obter um ponto específico
  getById(id: string): Observable<PontoColeta> {
    return this.http.get<PontoColeta>(`${this.apiUrl}/${id}`);
  }

  // Criar um novo ponto
  create(ponto: Partial<PontoColeta>): Observable<PontoColeta> {
    return this.http.post<PontoColeta>(this.apiUrl, ponto);
  }

  // Atualizar um ponto existente
  update(id: string, ponto: Partial<PontoColeta>): Observable<PontoColeta> {
    return this.http.put<PontoColeta>(`${this.apiUrl}/${id}`, ponto);
  }

  // Excluir um ponto
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}