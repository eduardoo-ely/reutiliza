import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRecicladoService, ValidacaoCruzada } from '../../../core/services/material-reciclado.service';
import { UserService } from '../../../core/services/user.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-validacao-cruzada',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './validacao-cruzada.component.html',
    styleUrls: ['./validacao-cruzada.component.css']
})
export class ValidacaoCruzadaComponent implements OnInit {
    validacoesPendentes: ValidacaoCruzada[] = [];
    usuarioId: string = '';
    carregando = true;
    mensagem = '';
    tipoMensagem: 'sucesso' | 'erro' | 'info' = 'info';

    constructor(
        private materialService: MaterialRecicladoService,
        private userService: UserService
    ) {}

    ngOnInit(): void {
        const user = this.userService.getLoggedInUser();
        if (user) {
            this.usuarioId = user.id;
            this.carregarValidacoesPendentes();
        } else {
            this.exibirMensagem('Usuário não identificado. Faça login novamente.', 'erro');
            this.carregando = false;
        }
    }

    carregarValidacoesPendentes(): void {
        this.carregando = true;
        this.materialService.getValidacoesPendentes(this.usuarioId).subscribe({
            next: (validacoes) => {
                console.log('✅ Validações pendentes:', validacoes);
                this.validacoesPendentes = validacoes;
                this.carregando = false;
            },
            error: (err) => {
                console.error('❌ Erro ao carregar validações:', err);
                this.carregando = false;
                this.exibirMensagem('Erro ao carregar validações pendentes. Tente novamente.', 'erro');
            }
        });
    }

    confirmarValidacao(validacao: ValidacaoCruzada, confirmado: boolean, observacoes: string = ''): void {
        if (!validacao._id) {
            this.exibirMensagem('Erro: ID da validação não encontrado', 'erro');
            return;
        }

        console.log(`${confirmado ? '✅' : '❌'} Processando validação:`, validacao._id);

        this.materialService.confirmarValidacao(validacao._id, confirmado, observacoes.trim()).subscribe({
            next: (response) => {
                console.log('✅ Validação processada:', response);
                this.exibirMensagem(
                    confirmado
                        ? 'Validação confirmada com sucesso! Material aprovado.'
                        : 'Validação rejeitada com sucesso.',
                    confirmado ? 'sucesso' : 'info'
                );

                // Remover da lista
                this.validacoesPendentes = this.validacoesPendentes.filter(v => v._id !== validacao._id);
            },
            error: (err) => {
                console.error('❌ Erro ao processar validação:', err);
                this.exibirMensagem(err.message || 'Erro ao processar validação. Tente novamente.', 'erro');
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

    // Helpers para acessar dados do material populado
    getMaterialInfo(validacao: ValidacaoCruzada): any {
        return validacao.material || {};
    }

    getMaterialTipo(validacao: ValidacaoCruzada): string {
        const material = this.getMaterialInfo(validacao);
        return material.tipo || material.material || 'Não especificado';
    }

    getMaterialQuantidade(validacao: ValidacaoCruzada): string {
        const material = this.getMaterialInfo(validacao);
        return `${material.quantidade || 0} ${material.unidade || 'kg'}`;
    }

    getUsuarioNome(validacao: ValidacaoCruzada): string {
        const material = this.getMaterialInfo(validacao);
        return material.usuario?.nome || 'Não informado';
    }

    getPontoNome(validacao: ValidacaoCruzada): string {
        const material = this.getMaterialInfo(validacao);
        return material.pontoColeta?.nome || 'Não informado';
    }

    getMaterialDataRegistro(validacao: ValidacaoCruzada): Date | undefined {
        const material = this.getMaterialInfo(validacao);
        return material.dataRegistro;
    }

    getMaterialObservacoes(validacao: ValidacaoCruzada): string | undefined {
        const material = this.getMaterialInfo(validacao);
        return material.observacoes;
    }
}