import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UserService } from '../../../core/services/user.service';

@Component({
    selector: 'app-navigation',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    template: `
    <nav class="tab-bar">
      <a routerLink="/rota" routerLinkActive="active" class="tab-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>Mapa</span>
      </a>
      <a routerLink="/recompensas" routerLinkActive="active" class="tab-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18.3 5.7 2.9 2.9a2 2 0 0 1 0 2.8L12 20.6a2 2 0 0 1-2.8 0L2.8 11.4a2 2 0 0 1 0-2.8l2.9-2.9a2 2 0 0 1 2.8 0L12 9.1l3.5-3.5a2 2 0 0 1 2.8 0Z"/><path d="M12 20.6 12 22"/><path d="m18 15-4-4"/><path d="m6 15 4-4"/></svg>
        <span>Recompensas</span>
      </a>
      <a routerLink="/perfil" routerLinkActive="active" class="tab-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Perfil</span>
      </a>
    </nav>
  `,
    styles: [`
    .tab-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background-color: white;
      display: flex;
      justify-content: space-around;
      align-items: center;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
      z-index: 2000; /* Garante que fica por cima do mapa */
    }
    .tab-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #999;
      text-decoration: none;
      font-size: 12px;
      transition: color 0.3s;
    }
    .tab-item svg {
      margin-bottom: 4px;
    }
    .tab-item.active {
      color: var(--primary-green); /* Usa a cor primária definida em styles.css */
    }
  `]
})
export class NavigationComponent {}
