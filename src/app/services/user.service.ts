import { Injectable } from '@angular/core';

// Vamos definir como um usuário será salvo
export interface User {
  id: string;
  email: string;
  senha?: string; // a '?' torna a senha opcional para não guardá-la em todo lugar
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly USERS_STORAGE_KEY = 'app-users';
  private readonly LOGGED_IN_USER_KEY = 'app-logged-in-user';

  constructor() { }

  // --- Métodos de Cadastro e Login ---

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
      // Login bem-sucedido: Salva o usuário logado no session storage
      const userToSave: User = { id: user.id, email: user.email }; // Não salvamos a senha
      sessionStorage.setItem(this.LOGGED_IN_USER_KEY, JSON.stringify(userToSave));
      return { success: true, message: 'Login efetuado com sucesso!', user: userToSave };
    }

    return { success: false, message: 'E-mail ou senha incorretos.' };
  }

  logout(): void {
    sessionStorage.removeItem(this.LOGGED_IN_USER_KEY);
  }

  // --- Métodos de Gerenciamento ---

  deleteAccount(userId: string): { success: boolean, message: string } {
    let users = this.getUsersFromStorage();
    const initialLength = users.length;
    users = users.filter(u => u.id !== userId);

    if (users.length < initialLength) {
      localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));
      this.logout(); // Desloga o usuário após apagar a conta
      return { success: true, message: 'Conta excluída com sucesso.' };
    }

    return { success: false, message: 'Usuário não encontrado.' };
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
