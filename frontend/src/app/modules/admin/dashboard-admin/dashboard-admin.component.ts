import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminService, MetricasGerais } from '../../../core/services/admin.service';

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
    menuMobileAberto = false;

    constructor(
        private adminService: AdminService,
        private router: Router
    ) {}

    ngOnInit() {
        if (!this.adminService.isAdmin()) {
            alert('❌ Acesso negado. Apenas administradores podem acessar esta área.');
            this.router.navigate(['/']);
            return;
        }
        this.carregarMetricas();
    }

    carregarMetricas() {
        this.carregando = true;
        this.erro = '';

        this.adminService.getMetricasGerais(this.periodo).subscribe({
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

    toggleMenuMobile() {
        this.menuMobileAberto = !this.menuMobileAberto;
    }

    getCorCrescimento(crescimento: number): string {
        if (crescimento > 0) return 'text-green';
        if (crescimento < 0) return 'text-red';
        return 'text-gray';
    }

    getIconeCrescimento(crescimento: number): string {
        if (crescimento > 0) return '↗️';
        if (crescimento < 0) return '↘️';
        return '➡️';
    }
}