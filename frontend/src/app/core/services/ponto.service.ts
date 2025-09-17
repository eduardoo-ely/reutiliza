import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PontoColeta } from '../../models/ponto.models';

@Injectable({
    providedIn: 'root'
})
export class PontoService {
    private readonly apiUrl = 'http://localhost:3000/api/pontos';

    constructor(private http: HttpClient) { }

    getAll(): Observable<PontoColeta[]> {
        return this.http.get<PontoColeta[]>(this.apiUrl);
    }

    save(pontoData: { nome: any; materiais: string[]; latitude: any; longitude: any }): Observable<PontoColeta> {
        return this.http.post<PontoColeta>(this.apiUrl, pontoData);
    }

    update(id: string, pontoData: Partial<PontoColeta>): Observable<PontoColeta> {
        return this.http.put<PontoColeta>(`${this.apiUrl}/${id}`, pontoData);
    }

    delete(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}