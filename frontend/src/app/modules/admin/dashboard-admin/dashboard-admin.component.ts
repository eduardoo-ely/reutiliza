// frontend/src/app/modules/admin/dashboard-admin/dashboard-admin.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DashboardData {
    periodo: {
        dias: number;
        dataInicio: Date;
        dataFim: Date;
    };
    resumo: {
        totalUsuarios: number;
        totalMateriais: number;
        materiaisValidados: number;
        materiaisPendentes: number;
        totalPontoColetas: number;
        alertasEstoque: number;
        taxaValidacao: string;
    };
    materiaisPorTipo: Array<{
        _id: string;
        totalQuantidade: number;
        totalPontos: number;
        count: number;
    }>;
    materiaisPorPonto: Array<{
        pontoNome: string;
        pontoEndereco: string;
        totalQuantidade: number;
        totalMateriais: number;
    }>;
    tendencia: Array<{
        _id: string;
        totalQuantidade: number;
        totalMateriais: number;
    }>;
    topUsuarios: Array<{
        nome: string;
        email: string;
        pontos: number;
    }>;
    recompensasDisponiveis: number;
}

@Component({
    selector: 'app-dashboard-admin',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dashboard-admin.component.html',
    styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
    dashboardData: DashboardData | null = null;
    carregando = true;
    mensagemErro = '';
    periodo = 30;

    constructor(private http: HttpClient) {}

    ngOnInit(): void {
        this.carregarDashboard();
    }

    carregarDashboard(): void {
        this.carregando = true;
        this.mensagemErro = '';

        this.http.get<{ success: boolean; data: DashboardData }>(
            `${environment.apiUrl}/dashboard/admin?periodo=${this.periodo}`
        ).subscribe({
            next: (response) => {
                this.dashboardData = response.data;
                this.carregando = false;
            },
            error: (err) => {
                console.error('Erro ao carregar dashboard:', err);
                this.mensagemErro = 'Erro ao carregar dashboard administrativo';
                this.carregando = false;
            }
        });
    }

    mudarPeriodo(dias: number): void {
        this.periodo = dias;
        this.carregarDashboard();
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

    getMaxTendencia(): number {
        if (!this.dashboardData || this.dashboardData.tendencia.length === 0) {
            return 1;
        }
        return Math.max(...this.dashboardData.tendencia.map(t => t.totalQuantidade));
    }
}