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
    console.log('🎁 Inicializando componente de recompensas...');

    const user = this.userService.getLoggedInUser();
    if (user) {
      this.usuarioId = user.id;
      console.log('👤 Usuário logado:', user.nome, '(ID:', user.id, ')');
      this.carregarDados();
    } else {
      console.error('❌ Usuário não identificado');
      this.exibirMensagem('Usuário não identificado. Faça login novamente.', 'erro');
      this.carregando = false;
    }
  }

  carregarDados(): void {
    this.carregando = true;
    console.log('📦 Carregando recompensas e pontos...');

    // Carregar recompensas disponíveis
    this.materialService.getRecompensasDisponiveis().subscribe({
      next: (recompensas) => {
        console.log('✅ Recompensas recebidas:', recompensas);
        this.recompensas = recompensas;

        if (this.recompensas.length === 0) {
          console.warn('⚠️ Nenhuma recompensa disponível no banco');
          this.exibirMensagem('Nenhuma recompensa disponível no momento.', 'info');
        }

        // Carregar pontos do usuário
        this.carregarPontos();
      },
      error: (err) => {
        console.error('❌ Erro ao carregar recompensas:', err);
        this.carregando = false;
        this.exibirMensagem('Erro ao carregar recompensas disponíveis.', 'erro');
      }
    });
  }

  carregarPontos(): void {
    console.log('💰 Carregando pontos do usuário...');

    this.materialService.getPontosUsuario(this.usuarioId).subscribe({
      next: (pontos) => {
        console.log('✅ Pontos recebidos:', pontos);
        this.pontosUsuario = pontos;
        this.carregando = false;
      },
      error: (err) => {
        console.error('❌ Erro ao carregar pontos:', err);
        this.carregando = false;
        this.exibirMensagem('Erro ao carregar seus pontos.', 'erro');
      }
    });
  }

  resgatarRecompensa(recompensa: Recompensa): void {
    console.log('🎁 Tentando resgatar:', recompensa.nome);

    if (!this.podeResgatar(recompensa)) {
      this.exibirMensagem('Você não possui pontos suficientes para resgatar esta recompensa.', 'erro');
      return;
    }

    if (!recompensa._id) {
      this.exibirMensagem('Erro: ID da recompensa não encontrado.', 'erro');
      return;
    }

    const pontosNecessarios = this.getPontosNecessarios(recompensa);
    const nomeRecompensa = this.getNomeRecompensa(recompensa);

    const confirmar = confirm(
        `Deseja resgatar "${nomeRecompensa}" por ${pontosNecessarios} pontos?\n\n` +
        `Seus pontos disponíveis: ${this.getPontosDisponiveis()}\n` +
        `Após o resgate: ${this.getPontosDisponiveis() - pontosNecessarios} pontos`
    );

    if (!confirmar) return;

    console.log('✅ Usuário confirmou o resgate');
    console.log('   Recompensa ID:', recompensa._id);
    console.log('   Usuario ID:', this.usuarioId);

    this.materialService.resgatarRecompensa(recompensa._id, this.usuarioId).subscribe({
      next: (response) => {
        console.log('✅ Recompensa resgatada com sucesso:', response);

        let mensagemSucesso = `Recompensa "${nomeRecompensa}" resgatada com sucesso!`;

        if (response && response.recompensa && response.recompensa.codigo) {
          mensagemSucesso += `\n\nCódigo: ${response.recompensa.codigo}`;

          // Copiar código para clipboard
          navigator.clipboard.writeText(response.recompensa.codigo).then(() => {
            console.log('📋 Código copiado para clipboard');
          }).catch(err => {
            console.error('❌ Erro ao copiar código:', err);
          });
        }

        this.exibirMensagem(mensagemSucesso, 'sucesso');

        // Recarregar dados após 2 segundos
        setTimeout(() => this.carregarDados(), 2000);
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

  getImagemRecompensa(recompensa: Recompensa): string {
    return recompensa.imagem || 'assets/images/reward-placeholder.jpg';
  }

  formatarValidade(data: Date | undefined): string {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  exibirMensagem(texto: string, tipo: 'sucesso' | 'erro' | 'info'): void {
    this.mensagem = texto;
    this.tipoMensagem = tipo;

    console.log(`${tipo === 'sucesso' ? '✅' : tipo === 'erro' ? '❌' : 'ℹ️'} ${texto}`);

    setTimeout(() => {
      this.mensagem = '';
    }, 5000);
  }

  recarregar(): void {
    console.log('🔄 Recarregando dados...');
    this.carregarDados();
  }
}