import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRecicladoService, MaterialReciclado } from '../../../core/services/material-reciclado.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-validacao-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './validacao-admin.component.html',
    styleUrls: ['./validacao-admin.component.css']
})
export class ValidacaoAdminComponent implements OnInit {
    materiaisPendentes: MaterialReciclado[] = [];
    carregando = true;
    mensagem = '';
    tipoMensagem = '';
    filtroStatus = 'pendente';

    constructor(private materialService: MaterialRecicladoService) {}

    ngOnInit(): void {
        this.carregarMateriais();
    }

    carregarMateriais(): void {
        this.carregando = true;
        this.materialService.getMateriais(undefined, this.filtroStatus).subscribe({
            next: (materiais) => {
                this.materiaisPendentes = materiais;
                this.carregando = false;
            },
            error: (err) => {
                console.error('Erro ao carregar materiais:', err);
                this.carregando = false;
                this.exibirMensagem('Erro ao carregar materiais. Tente novamente.', 'erro');
            }
        });
    }

    validarMaterial(material: MaterialReciclado, validado: boolean, observacoes: string = ''): void {
        if (!material._id) {
            this.exibirMensagem('Erro: ID do material não encontrado', 'erro');
            return;
        }

        this.materialService.validarMaterial(material._id, validado, observacoes).subscribe({
            next: () => {
                this.exibirMensagem(
                    validado ? 'Material validado com sucesso!' : 'Material rejeitado com sucesso!',
                    validado ? 'sucesso' : 'info'
                );
                this.materiaisPendentes = this.materiaisPendentes.filter(m => m._id !== material._id);
            },
            error: (err) => {
                console.error('Erro ao validar material:', err);
                this.exibirMensagem('Erro ao validar material. Tente novamente.', 'erro');
            }
        });
    }

    exibirMensagem(texto: string, tipo: 'sucesso' | 'erro' | 'info'): void {
        this.mensagem = texto;
        this.tipoMensagem = tipo;
        setTimeout(() => {
            this.mensagem = '';
        }, 5000);
    }

    formatarData(data: Date | undefined): string {
        if (!data) return 'Data não disponível';
        return new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    mudarFiltro(status: string): void {
        this.filtroStatus = status;
        this.carregarMateriais();
    }

    getMaterialTipo(material: MaterialReciclado): string {
        return material.material || material.tipo || 'Não especificado';
    }

    getUsuarioNome(material: MaterialReciclado): string {
        if (typeof material.usuario === 'object' && material.usuario !== null) {
            return (material.usuario as any).nome || 'Não informado';
        }
        return 'Não informado';
    }

    getPontoNome(material: MaterialReciclado): string {
        if (typeof material.pontoColeta === 'object' && material.pontoColeta !== null) {
            return (material.pontoColeta as any).nome || 'Não informado';
        }
        return 'Não informado';
    }
}