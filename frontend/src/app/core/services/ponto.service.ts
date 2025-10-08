import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PontoColeta } from '../../models/ponto-coleta.model';

@Injectable({ providedIn: 'root' })
export class PontoService {
    private baseUrl = ' http://100.111.131.103:3000/api/pontos';

    constructor(private http: HttpClient) {}

    // Buscar todos os pontos
    getAll(): Observable<PontoColeta[]> {
        return this.http.get<PontoColeta[]>(this.baseUrl);
    }

    // Buscar ponto por ID (pode ser útil na edição)
    getById(id: string): Observable<PontoColeta> {
        return this.http.get<PontoColeta>(`${this.baseUrl}/${id}`);
    }

    // Criar novo ponto
    create(ponto: PontoColeta): Observable<PontoColeta> {
        return this.http.post<PontoColeta>(this.baseUrl, ponto);
    }

    // Atualizar ponto existente
    update(id: string, ponto: PontoColeta): Observable<PontoColeta> {
        return this.http.put<PontoColeta>(`${this.baseUrl}/${id}`, ponto);
    }

    // Deletar ponto (caso precise remover algum)
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
