import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from './user.service';

// Interfaces para tipagem das respostas
export interface MetricasGerais {
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

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = `${environment.apiUrl}/admin`; // Usa a mesma base do environment

    constructor(
        private http: HttpClient,
        private userService: UserService // Injeta o UserService ajustado
    ) {}

    // Helper para cabeçalhos (idealmente isso seria um Interceptor, mas funciona aqui)
    private getHeaders(): HttpHeaders {
        const user = this.userService.getLoggedInUser();
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'x-user-id': user?.id || ''
        });
    }

    // --- Métodos de Verificação ---

    isAdmin(): boolean {
        const user = this.userService.getLoggedInUser();
        // Verifica as roles permitidas
        return user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'moderador';
    }

    // --- Métricas ---

    getMetricasGerais(periodo: number = 30): Observable<MetricasGerais> {
        return this.http.get<MetricasGerais>(`${this.apiUrl}/metricas/geral?periodo=${periodo}`, {
            headers: this.getHeaders()
        });
    }

    getMetricasUsuarios(periodo: number = 30): Observable<any> {
        return this.http.get(`${this.apiUrl}/metricas/usuarios?periodo=${periodo}`, {
            headers: this.getHeaders()
        });
    }

    getMetricasMateriais(periodo: number = 30): Observable<any> {
        return this.http.get(`${this.apiUrl}/metricas/materiais?periodo=${periodo}`, {
            headers: this.getHeaders()
        });
    }

    getMetricasPontosColeta(periodo: number = 30): Observable<any> {
        return this.http.get(`${this.apiUrl}/metricas/pontos-coleta?periodo=${periodo}`, {
            headers: this.getHeaders()
        });
    }

    getMetricasRecompensas(periodo: number = 30): Observable<any> {
        return this.http.get(`${this.apiUrl}/metricas/recompensas?periodo=${periodo}`, {
            headers: this.getHeaders()
        });
    }

    // --- Gestão de Usuários ---

    listarUsuarios(params?: any): Observable<any> {
        return this.http.get(`${this.apiUrl}/usuarios`, {
            headers: this.getHeaders(),
            params
        });
    }

    buscarUsuario(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/usuarios/${id}`, {
            headers: this.getHeaders()
        });
    }

    suspenderUsuario(id: string, motivo: string, duracao?: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/usuarios/${id}/suspender`,
            { motivo, duracao },
            { headers: this.getHeaders() }
        );
    }

    reativarUsuario(id: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/usuarios/${id}/reativar`, {}, {
            headers: this.getHeaders()
        });
    }

    // --- Gestão de Pontos ---

    listarPontos(params?: any): Observable<any> {
        return this.http.get(`${this.apiUrl}/pontos`, {
            headers: this.getHeaders(),
            params
        });
    }

    ativarPonto(id: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/pontos/${id}/ativar`, {}, {
            headers: this.getHeaders()
        });
    }

    desativarPonto(id: string, motivo: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/pontos/${id}/desativar`,
            { motivo },
            { headers: this.getHeaders() }
        );
    }

    // --- Gestão de Resgates ---

    listarResgates(params?: any): Observable<any> {
        return this.http.get(`${this.apiUrl}/recompensas/resgates`, {
            headers: this.getHeaders(),
            params
        });
    }

    validarResgate(id: string, observacoes?: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/recompensas/resgates/${id}/validar`,
            { observacoes },
            { headers: this.getHeaders() }
        );
    }

    cancelarResgate(id: string, motivo: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/recompensas/resgates/${id}/cancelar`,
            { motivo },
            { headers: this.getHeaders() }
        );
    }
}