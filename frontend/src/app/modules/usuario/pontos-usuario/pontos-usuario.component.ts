import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRecicladoService, PontosUsuario } from '../../../core/services/material-reciclado.service';
import { UserService } from '../../../core/services/user.service';

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
  mensagemErro = '';

  constructor(
      private materialService: MaterialRecicladoService,
      private userService: UserService
  ) {}

  ngOnInit(): void {
    const user = this.userService.getLoggedInUser();
    if (user) {
      this.usuarioId = user.id;
      this.carregarPontosUsuario();
    } else {
      this.mensagemErro = 'Usuário não identificado. Faça login novamente.';
      this.carregando = false;
    }
  }

  carregarPontosUsuario(): void {
    this.carregando = true;
    this.mensagemErro = '';

    console.log('📊 Carregando pontos do usuário:', this.usuarioId);

    this.materialService.getPontosUsuario(this.usuarioId).subscribe({
      next: (pontos) => {
        console.log('✅ Pontos carregados:', pontos);
        this.pontosUsuario = pontos;
        this.carregando = false;
      },
      error: (err) => {
        console.error('❌ Erro ao carregar pontos:', err);
        this.carregando = false;
        this.mensagemErro = err.message || 'Erro ao carregar pontos do usuário.';
      }
    });
  }

  formatarData(data: Date | undefined | string): string {
    if (!data) return 'Data não disponível';
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

  // Ordenar transações por data (mais recentes primeiro)
  getTransacoesOrdenadas() {
    if (!this.pontosUsuario?.historicoTransacoes) return [];
    return [...this.pontosUsuario.historicoTransacoes].sort((a, b) => {
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
  }

  // Obter resumo de estatísticas
  getEstatisticas() {
    if (!this.pontosUsuario?.historicoTransacoes) {
      return {
        totalGanhos: 0,
        totalGastos: 0,
        totalTransacoes: 0
      };
    }

    const ganhos = this.pontosUsuario.historicoTransacoes
        .filter(t => t.tipo === 'ganho')
        .reduce((sum, t) => sum + t.pontos, 0);

    const gastos = this.pontosUsuario.historicoTransacoes
        .filter(t => t.tipo === 'gasto')
        .reduce((sum, t) => sum + t.pontos, 0);

    return {
      totalGanhos: ganhos,
      totalGastos: gastos,
      totalTransacoes: this.pontosUsuario.historicoTransacoes.length
    };
  }

  recarregar(): void {
    this.carregarPontosUsuario();
  }
}