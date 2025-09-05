import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';

export interface PontoColeta {
  _id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  materiais: string[];
}

@Injectable({
  providedIn: 'root'
})

export class PontoService {
  private readonly apiUrl = 'http://192.168.1.11:3000/api/pontos';

  constructor(private http: HttpClient) { }

  getAll(): Observable<PontoColeta[]> {
    return this.http.get<PontoColeta[]>(this.apiUrl);
  }
}
