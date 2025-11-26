import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecompensasListaComponent } from './recompensas-lista/recompensas-lista.component';

@Component({
    selector: 'app-recompensas',
    standalone: true,
    imports: [
        CommonModule,
        RecompensasListaComponent   // <-- IMPORTA SEU COMPONENTE COMPLETO
    ],
    template: `
    <div class="page-container">
      <h2>Recompensas</h2>

      <!-- Componente de lista -->
      <app-recompensas-lista></app-recompensas-lista>
    </div>
  `,
    styles: [`
    .page-container {
      padding: 20px;
      text-align: center;
    }
  `]
})
export class RecompensasComponent {}
