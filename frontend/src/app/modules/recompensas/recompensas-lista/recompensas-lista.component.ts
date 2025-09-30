import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRecicladoService } from '../../../core/services/material-reciclado.service';
import { Recompensa, PontosUsuario } from '../../../models/material-reciclado.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recompensas-lista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recompensas-lista.component.html',
  styleUrls: ['./recompensas-lista.component.css']
})
export class RecompensasListaComponent implements OnInit {
  recompensas: Recompensa[] = [];
  pontosUsuario: PontosUsuario | null = null;
  carregando = true;
  usuarioId = '';
  mensagem = '';
  tipoMensagem = '';
  
  constructor(
    private materialService: MaterialRecicladoService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.usuarioId = user._id;
        this.carregarDados();
      }
    });
  }

  carregarDados(): void {
    this.carregando = true;
    
    // Carregar recompensas disponíveis
    this.materialService.getRecompensasDisponiveis().subscribe({
      next: (recompensas) => {
        this.recompensas = recompensas;
        
        // Carregar pontos do usuário
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
      },
      error: (err) => {
        console.error('Erro ao carregar recompensas:', err);
        this.carregando = false;
      }
    });
  }

  resgatarRecompensa(recompensa: Recompensa): void {
    if (!this.pontosUsuario || this.getPontosDisponiveis() < recompensa.pontosNecessarios) {
      this.exibirMensagem('Você não possui pontos suficientes para resgatar esta recompensa.', 'erro');
      return;
    }
    
    this.materialService.resgatarRecompensa(recompensa._id!, this.usuarioId).subscribe({
      next: () => {
        this.exibirMensagem(`Recompensa "${recompensa.nome}" resgatada com sucesso!`, 'sucesso');
        this.carregarDados(); // Recarregar dados após resgate
      },
      error: (err) => {
        console.error('Erro ao resgatar recompensa:', err);
        this.exibirMensagem('Erro ao resgatar recompensa. Tente novamente.', 'erro');
      }
    });
  }

  getPontosDisponiveis(): number {
    if (!this.pontosUsuario) return 0;
    return this.pontosUsuario.pontos - this.pontosUsuario.pontosUtilizados;
  }

  podeResgatar(recompensa: Recompensa): boolean {
    return this.getPontosDisponiveis() >= recompensa.pontosNecessarios;
  }

  exibirMensagem(texto: string, tipo: 'sucesso' | 'erro' | 'info'): void {
    this.mensagem = texto;
    this.tipoMensagem = tipo;
    setTimeout(() => {
      this.mensagem = '';
    }, 5000);
  }
}