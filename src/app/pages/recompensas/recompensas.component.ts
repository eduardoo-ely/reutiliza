import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-recompensas',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-container">
      <h2>Recompensas</h2>
      <p>Acumule pontos e troque por recompensas! Página em construção.</p>
    </div>
  `,
    styles: [` .page-container { padding: 20px; text-align: center; } `]
})
export class RecompensasComponent {}