import { Injectable } from '@angular/core';

export interface PontoColeta {
  id: string;
  nome: string;
  materiais: string[];
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class PontoService {
  private readonly storageKey = 'pontos-coleta';

  constructor() { }

  getAll(): PontoColeta[] {
    const pontos = localStorage.getItem(this.storageKey);
    return pontos ? JSON.parse(pontos) : [];
  }

  save(ponto: Omit<PontoColeta, 'id'>): PontoColeta {
    const pontos = this.getAll();
    const novoPonto = { ...ponto, id: crypto.randomUUID() };
    pontos.push(novoPonto);
    localStorage.setItem(this.storageKey, JSON.stringify(pontos));
    return novoPonto;
  }

  update(pontoAtualizado: PontoColeta): PontoColeta {
    let pontos = this.getAll();
    pontos = pontos.map(p => p.id === pontoAtualizado.id ? pontoAtualizado : p);
    localStorage.setItem(this.storageKey, JSON.stringify(pontos));
    return pontoAtualizado;
  }

  delete(id: string): void {
    let pontos = this.getAll();
    pontos = pontos.filter(p => p.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(pontos));
  }
}


/*
 * ----------------------------------------------------------------
 * ARQUIVO: src/app/services/user.service.ts (VERSÃO ORIGINAL)
 * ----------------------------------------------------------------
 * Este é o seu serviço de usuário original com localStorage.
 * ----------------------------------------------------------------
 */
import { Injectable } from '@angular/core';

export interface User {
  id: string;
  email: string;
  senha?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly USERS_STORAGE_KEY = 'app-users';
  private readonly LOGGED_IN_USER_KEY = 'app-logged-in-user';

  constructor() { }

  register(email: string, senha: string): { success: boolean, message: string } {
    const users = this.getUsersFromStorage();
    const userExists = users.find(u => u.email === email);

    if (userExists) {
      return { success: false, message: 'Este e-mail já está cadastrado.' };
    }

    const newUser: User = { id: crypto.randomUUID(), email, senha };
    users.push(newUser);
    localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));

    return { success: true, message: 'Conta criada com sucesso!' };
  }

  login(email: string, senha: string): { success: boolean, message: string, user?: User } {
    const users = this.getUsersFromStorage();
    const user = users.find(u => u.email === email && u.senha === senha);

    if (user) {
      const userToSave: User = { id: user.id, email: user.email };
      sessionStorage.setItem(this.LOGGED_IN_USER_KEY, JSON.stringify(userToSave));
      return { success: true, message: 'Login efetuado com sucesso!', user: userToSave };
    }

    return { success: false, message: 'E-mail ou senha incorretos.' };
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

  private getUsersFromStorage(): User[] {
    const usersJson = localStorage.getItem(this.USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  }
}
