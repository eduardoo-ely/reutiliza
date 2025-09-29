import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-container">
      <h2>Perfil do Utilizador</h2>
      <p>Bem-vindo! Esta página está em construção.</p>
      <button (click)="logout()">Sair</button>
    </div>
  `,
    styles: [`
    .page-container { padding: 20px; text-align: center; }
    button { 
      background-color: var(--primary-green); 
      color: white; 
      border: none; 
      padding: 10px 20px; 
      border-radius: 8px; 
      cursor: pointer;
      margin-top: 20px;
    }
  `]
})
export class PerfilComponent {
    constructor(private userService: UserService, private router: Router) {}

    logout(): void {
        this.userService.logout();
        this.router.navigate(['/']);
    }
}