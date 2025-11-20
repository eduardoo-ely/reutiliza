import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRecicladoService, Recompensa, PontosUsuario } from '../../../core/services/material-reciclado.service';
import { UserService } from '../../../core/services/user.service';

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
  tipoMensagem: 'sucesso' | 'erro' | 'info' = 'info';

  constructor(
      private materialService: MaterialRecicladoService,
      private userService: UserService
  ) {}

  ngOnInit(): void {
    const user = this.userService.getLoggedInUser();
    if (user) {
      this.usuarioId = user.id;
      this.carregarDados();
    } else {
      this.exibirMensagem('Usuário não identificado. Faça login novamente.', 'erro');
      this.carregando = false;
    }
  }

  carregarDados(): void {
    this.carregando = true;

    console.log('🎁 Carregando recompensas disponíveis...');

    // Carregar recompensas disponíveis
    this.materialService.getRecompensasDisponiveis().subscribe({
      next: (recompensas) => {
        console.log('✅ Recompensas carregadas:', recompensas);
        this.recompensas = recompensas;

        // Carregar pontos do usuário
        this.materialService.getPontosUsuario(this.usuarioId).subscribe({
          next: (pontos) => {
            console.log('✅ Pontos do usuário:', pontos);
            this.pontosUsuario = pontos;
            this.carregando = false;
          },
          error: (err) => {
            console.error('❌ Erro ao carregar pontos:', err);
            this.carregando = false;
            this.exibirMensagem('Erro ao carregar seus pontos.', 'erro');
          }
        });
      },
      error: (err) => {
        console.error('❌ Erro ao carregar recompensas:', err);
        this.carregando = false;
        this.exibirMensagem('Erro ao carregar recompensas disponíveis.', 'erro');
      }
    });
  }

  resgatarRecompensa(recompensa: Recompensa): void {
    if (!this.podeResgatar(recompensa)) {
      this.exibirMensagem('Você não possui pontos suficientes para resgatar esta recompensa.', 'erro');
      return;
    }

    if (!recompensa._id) {
      this.exibirMensagem('Erro: ID da recompensa não encontrado.', 'erro');
      return;
    }

    // Confirmar com o usuário
    const confirmar = confirm(`Deseja resgatar "${recompensa.nome || recompensa.titulo}" por ${this.getPontosNecessarios(recompensa)} pontos?`);
    if (!confirmar) return;

    console.log('🎁 Resgatando recompensa:', recompensa._id);

    this.materialService.resgatarRecompensa(recompensa._id, this.usuarioId).subscribe({
      next: (response) => {
        console.log('✅ Recompensa resgatada:', response);
        this.exibirMensagem(
            `Recompensa "${recompensa.nome || recompensa.titulo}" resgatada com sucesso!`,
            'sucesso'
        );

        // Recarregar dados
        setTimeout(() => this.carregarDados(), 1500);
      },
      error: (err) => {
        console.error('❌ Erro ao resgatar recompensa:', err);
        this.exibirMensagem(err.message || 'Erro ao resgatar recompensa. Tente novamente.', 'erro');
      }
    });
  }

  getPontosDisponiveis(): number {
    if (!this.pontosUsuario) return 0;
    return this.pontosUsuario.pontos - this.pontosUsuario.pontosUtilizados;
  }

  podeResgatar(recompensa: Recompensa): boolean {
    const pontosNecessarios = this.getPontosNecessarios(recompensa);
    return this.getPontosDisponiveis() >= pontosNecessarios;
  }

  getPontosNecessarios(recompensa: Recompensa): number {
    return recompensa.pontosNecessarios || recompensa.custoEmPontos || 0;
  }

  getNomeRecompensa(recompensa: Recompensa): string {
    return recompensa.nome || recompensa.titulo || 'Recompensa';
  }

  exibirMensagem(texto: string, tipo: 'sucesso' | 'erro' | 'info'): void {
    this.mensagem = texto;
    this.tipoMensagem = tipo;
    setTimeout(() => {
      this.mensagem = '';
    }, 5000);
  }

  formatarValidade(data: Date | undefined): string {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  recarregar(): void {
    this.carregarDados();
  }
}