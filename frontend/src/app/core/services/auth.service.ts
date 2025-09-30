import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface User {
  _id: string;
  nome: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private api = environment.apiUrl;
    private currentUserSubject = new BehaviorSubject<User | null>(null);

    constructor(private http: HttpClient) {
      // Verificar se há um usuário no localStorage ao iniciar
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUserSubject.next(JSON.parse(storedUser));
      }
    }

    login(credentials: { email: string; password: string }) {
        return this.http.post<{token: string, user: User}>(`${this.api}/auth/login`, credentials)
          .pipe(
            tap(response => {
              if (response && response.user) {
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                this.currentUserSubject.next(response.user);
              }
            })
          );
    }

    register(data: any) {
        return this.http.post(`${this.api}/auth/register`, data);
    }

    setToken(token: string) {
        localStorage.setItem('token', token);
    }

    getToken() {
        return localStorage.getItem('token');
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
    }

    getCurrentUser(): Observable<User | null> {
        return this.currentUserSubject.asObservable();
    }

    // Método auxiliar para obter o usuário atual de forma síncrona
    getCurrentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    // Método para simular um usuário logado (para desenvolvimento)
    simulateLogin() {
        const mockUser = {
            _id: '123456789',
            nome: 'Usuário Teste',
            email: 'teste@example.com'
        };
        localStorage.setItem('currentUser', JSON.stringify(mockUser));
        this.currentUserSubject.next(mockUser);
    }
}
