import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { MaterialRecicladoService } from '../../../../core/services/material-reciclado.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface UserStats {
    totalReciclado: number;
    pontosGanhos: number;
    recompensasResgatadas: number;
    diasAtivo: number;
    materiaisValidados: number;
    materiaisPendentes: number;
}

interface Achievement {
    emoji: string;
    title: string;
    desc: string;
    unlocked: boolean;
}

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './perfil.component.html',
    styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
    user: any = null;
    stats: UserStats = {
        totalReciclado: 0,
        pontosGanhos: 0,
        recompensasResgatadas: 0,
        diasAtivo: 0,
        materiaisValidados: 0,
        materiaisPendentes: 0
    };
    achievements: Achievement[] = [];
    loading = true;
    errorMessage = '';

    constructor(
        private userService: UserService,
        private materialService: MaterialRecicladoService,
        private http: HttpClient,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.carregarDados();
    }

    carregarDados(): void {
        const currentUser = this.userService.getLoggedInUser();

        if (!currentUser) {
            this.router.navigate(['/']);
            return;
        }

        this.user = currentUser;
        this.carregarEstatisticas();
    }

    carregarEstatisticas(): void {
        // Carregar pontos do usuário
        this.materialService.getPontosUsuario(this.user.id).subscribe({
            next: (pontos) => {
                this.stats.pontosGanhos = pontos.pontos || 0;

                // Calcular dias ativo
                if (this.user.createdAt) {
                    const dataRegistro = new Date(this.user.createdAt);
                    const hoje = new Date();
                    const diffTime = Math.abs(hoje.getTime() - dataRegistro.getTime());
                    this.stats.diasAtivo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                // Contar recompensas resgatadas
                if (pontos.historicoTransacoes) {
                    this.stats.recompensasResgatadas = pontos.historicoTransacoes.filter(
                        t => t.tipo === 'gasto'
                    ).length;
                }
            },
            error: (err) => {
                console.error('Erro ao carregar pontos:', err);
            }
        });

        // Carregar materiais do usuário
        this.materialService.getMateriais(this.user.id).subscribe({
            next: (materiais) => {
                this.stats.materiaisValidados = materiais.filter(m => m.status === 'validado').length;
                this.stats.materiaisPendentes = materiais.filter(m => m.status === 'pendente').length;

                // Calcular total reciclado (apenas validados em kg)
                this.stats.totalReciclado = materiais
                    .filter(m => m.status === 'validado' && m.unidade === 'kg')
                    .reduce((sum, m) => sum + (m.quantidade || 0), 0);

                this.gerarConquistas();
                this.loading = false;
            },
            error: (err) => {
                console.error('Erro ao carregar materiais:', err);
                this.loading = false;
            }
        });
    }

    gerarConquistas(): void {
        this.achievements = [
            {
                emoji: '🥇',
                title: 'Primeira Reciclagem',
                desc: 'Completou sua primeira entrega',
                unlocked: this.stats.materiaisValidados >= 1
            },
            {
                emoji: '💯',
                title: '100 Pontos',
                desc: 'Atingiu 100 pontos de reciclagem',
                unlocked: this.stats.pontosGanhos >= 100
            },
            {
                emoji: '🔥',
                title: 'Sequência de 7 dias',
                desc: 'Reciclou por 7 dias seguidos',
                unlocked: this.stats.diasAtivo >= 7
            },
            {
                emoji: '🌟',
                title: '5 Entregas',
                desc: 'Realizou 5 entregas validadas',
                unlocked: this.stats.materiaisValidados >= 5
            },
            {
                emoji: '♻️',
                title: 'Eco Warrior',
                desc: 'Reciclou mais de 10kg',
                unlocked: this.stats.totalReciclado >= 10
            },
            {
                emoji: '🎁',
                title: 'Primeira Recompensa',
                desc: 'Resgatou sua primeira recompensa',
                unlocked: this.stats.recompensasResgatadas >= 1
            }
        ];
    }

    getPontosDisponiveis(): number {
        if (!this.user) return 0;
        return (this.user.pontos || 0) - (this.user.pontosUtilizados || 0);
    }

    getNivel(): number {
        const pontos = this.user?.pontos || 0;
        return Math.floor(pontos / 100) + 1;
    }

    getProgressoNivel(): number {
        const pontos = this.user?.pontos || 0;
        const nivel = this.getNivel();
        const pontosNivelAtual = (nivel - 1) * 100;
        const progresso = pontos - pontosNivelAtual;
        return Math.min(100, (progresso / 100) * 100);
    }

    getPontosParaProximoNivel(): number {
        const pontos = this.user?.pontos || 0;
        const nivel = this.getNivel();
        return Math.max(0, (nivel * 100) - pontos);
    }

    getTituloNivel(): string {
        const nivel = this.getNivel();
        if (nivel >= 10) return '🌳 Guardião Verde';
        if (nivel >= 7) return '♻️ Eco Expert';
        if (nivel >= 5) return '🌿 Reciclador Pro';
        if (nivel >= 3) return '🌱 Eco Warrior';
        return '🌾 Iniciante Verde';
    }

    getConquistasDesbloqueadas(): Achievement[] {
        return this.achievements.filter(a => a.unlocked);
    }

    getConquistasBloqueadas(): Achievement[] {
        return this.achievements.filter(a => !a.unlocked);
    }

    isAdmin(): boolean {
        return this.user?.role === 'admin';
    }

    formatarDataCadastro(): string {
        if (!this.user?.createdAt) return 'Data não disponível';
        return new Date(this.user.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    logout(): void {
        if (confirm('Deseja realmente sair?')) {
            this.userService.logout();
            this.router.navigate(['/']);
        }
    }

    navegarPara(rota: string): void {
        this.router.navigate([rota]);
    }
}