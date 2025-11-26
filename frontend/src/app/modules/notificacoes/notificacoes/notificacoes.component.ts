// frontend/src/app/modules/notificacoes/notificacoes/notificacoes.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { UserService } from '../../../core/services/user.service';

interface Notificacao {
    _id: string;
    tipo: string;
    titulo: string;
    mensagem: string;
    lida: boolean;
    dataLeitura?: Date;
    prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
    createdAt: Date;
    referencia?: {
        tipo: string;
        id: string;
    };
}

interface NotificacoesResponse {
    success: boolean;
    data: {
        notificacoes: Notificacao[];
        total: number;
        naoLidas: number;
        pagina: number;
        totalPaginas: number;
    };
}

@Component({
    selector: 'app-notificacoes',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notificacoes.component.html',
    styleUrls: ['./notificacoes.component.css']
})
export class NotificacoesComponent implements OnInit {
    notificacoes: Notificacao[] = [];
    totalNaoLidas = 0;
    carregando = true;
    mensagem = '';
    tipoMensagem: 'success' | 'error' | 'info' = 'info';
    usuarioId = '';

    filtroAtivo: 'todas' | 'naoLidas' = 'todas';

    constructor(
        private http: HttpClient,
        private userService: UserService
    ) {}

    ngOnInit(): void {
        const user = this.userService.getLoggedInUser();
        if (user) {
            this.usuarioId = user.id;
            this.carregarNotificacoes();
        }
    }

    carregarNotificacoes(): void {
        this.carregando = true;
        const apenasNaoLidas = this.filtroAtivo === 'naoLidas';

        this.http.get<NotificacoesResponse>(
            `${environment.apiUrl}/notificacoes/${this.usuarioId}?apenasNaoLidas=${apenasNaoLidas}`
        ).subscribe({
            next: (response) => {
                this.notificacoes = response.data.notificacoes;
                this.totalNaoLidas = response.data.naoLidas;
                this.carregando = false;
            },
            error: (err) => {
                console.error('Erro ao carregar notificações:', err);
                this.exibirMensagem('Erro ao carregar notificações', 'error');
                this.carregando = false;
            }
        });
    }

    marcarComoLida(notificacaoId: string): void {
        this.http.put(
            `${environment.apiUrl}/notificacoes/${notificacaoId}/ler`,
            {}
        ).subscribe({
            next: () => {
                const notificacao = this.notificacoes.find(n => n._id === notificacaoId);
                if (notificacao) {
                    notificacao.lida = true;
                    this.totalNaoLidas = Math.max(0, this.totalNaoLidas - 1);
                }
            },
            error: (err) => {
                console.error('Erro ao marcar como lida:', err);
            }
        });
    }

    marcarTodasComoLidas(): void {
        this.http.put(
            `${environment.apiUrl}/notificacoes/${this.usuarioId}/ler-todas`,
            {}
        ).subscribe({
            next: () => {
                this.notificacoes.forEach(n => n.lida = true);
                this.totalNaoLidas = 0;
                this.exibirMensagem('Todas as notificações foram marcadas como lidas', 'success');
            },
            error: (err) => {
                console.error('Erro ao marcar todas como lidas:', err);
                this.exibirMensagem('Erro ao marcar notificações como lidas', 'error');
            }
        });
    }

    deletarNotificacao(notificacaoId: string): void {
        if (!confirm('Deseja realmente excluir esta notificação?')) {
            return;
        }

        this.http.delete(
            `${environment.apiUrl}/notificacoes/${notificacaoId}`
        ).subscribe({
            next: () => {
                this.notificacoes = this.notificacoes.filter(n => n._id !== notificacaoId);
                this.exibirMensagem('Notificação excluída', 'success');
            },
            error: (err) => {
                console.error('Erro ao excluir notificação:', err);
                this.exibirMensagem('Erro ao excluir notificação', 'error');
            }
        });
    }

    mudarFiltro(filtro: 'todas' | 'naoLidas'): void {
        this.filtroAtivo = filtro;
        this.carregarNotificacoes();
    }

    getIconeTipo(tipo: string): string {
        const icones: { [key: string]: string } = {
            'validacao_aprovada': '✅',
            'validacao_rejeitada': '❌',
            'validacao_pendente': '⏳',
            'pontos_ganhos': '🏆',
            'pontos_gastos': '💸',
            'recompensa_disponivel': '🎁',
            'recompensa_resgatada': '🎉',
            'sistema': '⚙️'
        };
        return icones[tipo] || '📢';
    }

    getClassePrioridade(prioridade: string): string {
        return `prioridade-${prioridade}`;
    }

    formatarData(data: Date): string {
        const agora = new Date();
        const dataNotif = new Date(data);
        const diffMs = agora.getTime() - dataNotif.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHoras = Math.floor(diffMs / 3600000);
        const diffDias = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHoras < 24) return `${diffHoras}h atrás`;
        if (diffDias < 7) return `${diffDias}d atrás`;

        return dataNotif.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    exibirMensagem(texto: string, tipo: 'success' | 'error' | 'info'): void {
        this.mensagem = texto;
        this.tipoMensagem = tipo;
        setTimeout(() => {
            this.mensagem = '';
        }, 4000);
    }
}