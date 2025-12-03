import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface MetricasGerais {
    usuarios: {
        total: number;
        ativos: number;
        novos: number;
        crescimento: number;
        taxaAtivacao: string;
    };
    materiais: {
        total: number;
        validados: number;
        pendentes: number;
        crescimento: number;
        taxaValidacao: string;
    };
    pontos: {
        total: number;
        ativos: number;
        inativos: number;
        mediaUsuariosPorPonto: string;
    };
    recompensas: {
        totalResgates: number;
        pontosEmCirculacao: number;
    };
    alertas: {
        denunciasPendentes: number;
        materiaisPendentes: number;
    };
}

@Component({
    selector: 'app-dashboard-admin',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './dashboard-admin.component.html',
    styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
    metricas: MetricasGerais | null = null;
    carregando = true;
    periodo = 30;
    erro = '';

    constructor(
        private http: HttpClient,
        private router: Router
    ) {}

    ngOnInit() {
        this.carregarMetricas();
    }

    carregarMetricas() {
        this.carregando = true;
        this.erro = '';

        const url = `${environment.apiUrl}/admin/metricas/geral?periodo=${this.periodo}`;

        this.http.get<any>(url).subscribe({
            next: (response) => {
                if (response.success) {
                    this.metricas = response.data;
                }
                this.carregando = false;
            },
            error: (err) => {
                console.error('Erro ao carregar métricas:', err);
                this.erro = 'Erro ao carregar métricas do sistema';
                this.carregando = false;
            }
        });
    }

    alterarPeriodo(dias: number) {
        this.periodo = dias;
        this.carregarMetricas();
    }

    navegarPara(rota: string) {
        this.router.navigate([`/admin/${rota}`]);
    }

    getCorCrescimento(crescimento: number): string {
        if (crescimento > 0) return 'text-green-600';
        if (crescimento < 0) return 'text-red-600';
        return 'text-gray-600';
    }

    getIconeCrescimento(crescimento: number): string {
        if (crescimento > 0) return '↗️';
        if (crescimento < 0) return '↘️';
        return '➡️';
    }
}