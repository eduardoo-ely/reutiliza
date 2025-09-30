import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRecicladoService } from '../../../core/services/material-reciclado.service';
import { PontosUsuario, TransacaoPontos } from '../../../models/material-reciclado.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pontos-usuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pontos-usuario.component.html',
  styleUrls: ['./pontos-usuario.component.css']
})
export class PontosUsuarioComponent implements OnInit {
  pontosUsuario: PontosUsuario | null = null;
  carregando = true;
  usuarioId = '';
  
  constructor(
    private materialService: MaterialRecicladoService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.usuarioId = user._id;
        this.carregarPontosUsuario();
      }
    });
  }

  carregarPontosUsuario(): void {
    this.carregando = true;
    this.materialService.getPontosUsuario(this.usuarioId).subscribe({
      next: (pontos) => {
        this.pontosUsuario = pontos;
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao carregar pontos do usuário:', err);
        this.carregando = false;
      }
    });
  }

  formatarData(data: Date): string {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getPontosDisponiveis(): number {
    if (!this.pontosUsuario) return 0;
    return this.pontosUsuario.pontos - this.pontosUsuario.pontosUtilizados;
  }
}