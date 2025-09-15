import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Recompensa {
    _id: string;
    nome: string;
    descricao: string;
    custoEmPontos: number;
    tipo: string;
    valor: string;
}

@Injectable({
    providedIn: 'root'
})
export class RecompensaService {
    private readonly apiUrl = 'http://localhost:3000/api/recompensas';

    constructor(private http: HttpClient) { }

    getRecompensas(): Observable<Recompensa[]> {
        return this.http.get<Recompensa[]>(this.apiUrl);
    }

    resgatar(userId: string, recompensaId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/resgatar`, { userId, recompensaId });
    }
}
