import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {FormsModule} from "@angular/forms";

interface Estoque {
    _id: string;
    pontoColeta: {
        _id: string;
        nome: string;
        endereco: string;
    };
    tipoMaterial: string;
    quantidadeAtual: number;
    unidade: string;
    capacidadeMaxima: number;
    nivelAlerta: number;
    status: 'normal' | 'alerta' | 'cheio' | 'vazio';
    ultimaEntrada?: Date;
    ultimaSaida?: Date;
}

@Component({
    selector: 'app-estoque-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './estoque-lista.component.html',
    styleUrls: ['./estoque-lista.component.css']
})
export class EstoqueListaComponent implements OnInit {
    estoques: Estoque[] = [];
    estoquesAlertas: Estoque[] = [];
    carregando = true;
    mensagem = '';
    tipoMensagem: 'success' | 'error' | 'info' = 'info';

    filtroStatus: string = 'todos';
    filtroMaterial: string = 'todos';

    materiaisDisponiveis = [
        'Papel',
        'Plástico',
        'Vidro',
        'Metal',
        'Eletrônico',
        'Óleo',
        'Outros'
    ];

    constructor(private http: HttpClient) {}

    ngOnInit(): void {
        this.carregarEstoques();
        this.carregarAlertas();
    }

    carregarEstoques(): void {
        this.carregando = true;
        let url = `${environment.apiUrl}/estoque`;

        const params = [];
        if (this.filtroStatus !== 'todos') {
            params.push(`status=${this.filtroStatus}`);
        }
        if (this.filtroMaterial !== 'todos') {
            params.push(`tipoMaterial=${this.filtroMaterial}`);
        }
        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        this.http.get<{ success: boolean; data: Estoque[] }>(url).subscribe({
            next: (response) => {
                this.estoques = response.data;
                this.carregando = false;
            },
            error: (err) => {
                console.error('Erro ao carregar estoques:', err);
                this.exibirMensagem('Erro ao carregar estoques', 'error');
                this.carregando = false;
            }
        });
    }

    carregarAlertas(): void {
        this.http.get<{ success: boolean; data: Estoque[] }>(
            `${environment.apiUrl}/estoque/alertas`
        ).subscribe({
            next: (response) => {
                this.estoquesAlertas = response.data;
            },
            error: (err) => {
                console.error('Erro ao carregar alertas:', err);
            }
        });
    }

    mudarFiltroStatus(status: string): void {
        this.filtroStatus = status;
        this.carregarEstoques();
    }

    mudarFiltroMaterial(material: string): void {
        this.filtroMaterial = material;
        this.carregarEstoques();
    }

    getPercentualOcupacao(estoque: Estoque): number {
        return (estoque.quantidadeAtual / estoque.capacidadeMaxima) * 100;
    }

    getClasseStatus(status: string): string {
        const classes: { [key: string]: string } = {
            'normal': 'status-normal',
            'alerta': 'status-alerta',
            'cheio': 'status-cheio',
            'vazio': 'status-vazio'
        };
        return classes[status] || 'status-normal';
    }

    getIconeMaterial(tipo: string): string {
        const icones: { [key: string]: string } = {
            'Papel': '📄',
            'Plástico': '🥤',
            'Vidro': '🍾',
            'Metal': '🔩',
            'Eletrônico': '📱',
            'Óleo': '🛢️',
            'Outros': '♻️'
        };
        return icones[tipo] || '♻️';
    }

    getIconeStatus(status: string): string {
        const icones: { [key: string]: string } = {
            'normal': '✅',
            'alerta': '⚠️',
            'cheio': '🚨',
            'vazio': '📭'
        };
        return icones[status] || '✅';
    }

    formatarData(data: Date | undefined): string {
        if (!data) return 'Não registrado';
        return new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    exibirMensagem(texto: string, tipo: 'success' | 'error' | 'info'): void {
        this.mensagem = texto;
        this.tipoMensagem = tipo;
        setTimeout(() => {
            this.mensagem = '';
        }, 4000);
    }

    recarregar(): void {
        this.carregarEstoques();
        this.carregarAlertas();
    }
}