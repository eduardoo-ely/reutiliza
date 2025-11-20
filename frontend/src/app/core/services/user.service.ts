import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  nome: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = 'http://localhost:3000/api/users';
  private readonly LOGGED_IN_USER_KEY = 'app-logged-in-user';

  constructor(private http: HttpClient) { }

  register(nome: string, email: string, senha: string): Observable<{ success: boolean, message: string }> {
    return this.http.post<{ success: boolean, message: string }>(`${this.apiUrl}/register`, { nome, email, senha });
  }

  login(email: string, senha: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, senha }).pipe(
        tap(response => {
          if (response.success && response.user) {
            sessionStorage.setItem(this.LOGGED_IN_USER_KEY, JSON.stringify(response.user));
          }
        })
    );
  }

  logout(): void {
    sessionStorage.removeItem(this.LOGGED_IN_USER_KEY);
  }

  getLoggedInUser(): User | null {
    const userJson = sessionStorage.getItem(this.LOGGED_IN_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  isLoggedIn(): boolean {
    return this.getLoggedInUser() !== null;
  }

}