// components/cadastrar-ponto/cadastrar-ponto.component.ts (NOVO FICHEIRO)
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { PontoService } from '../../services/ponto.service';
import { PontoColeta } from '../../services/models/ponto.models';

@Component({
    selector: 'app-cadastrar-ponto',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './cadastrar-ponto.component.html',
    styleUrls: ['./cadastrar-ponto.component.css']
})
export class CadastrarPontoComponent {
    modalAberto = false;
    pontoForm!: FormGroup;
    pontoEmEdicao: PontoColeta | null = null;
    readonly materiaisDisponiveis = ['Eletroeletrônicos', 'Móveis', 'Vidros', 'Óleo de Cozinha', 'Pneus', 'Metais e Ferros', 'Papel e Papelão'];

    // Avisa o "componente pai" (o mapa) que um ponto foi salvo
    @Output() pontoSalvo = new EventEmitter<void>();

    constructor(
        private pontoService: PontoService,
        private fb: FormBuilder
    ) {
        this.criarFormulario();
    }

    // A lógica do formulário e do CRUD foi movida para aqui
    criarFormulario(): void { /* ... */ }
    abrirModalParaCriar(latlng: L.LatLng): void { /* ... */ }
    abrirModalParaEditar(ponto: PontoColeta): void { /* ... */ }
    fecharModal(): void { /* ... */ }

    salvarPonto(): void {
        if (this.pontoForm.invalid) return;

        const formValue = this.pontoForm.value;
        const materiaisSelecionados = this.materiaisDisponiveis.filter((_, i) => formValue.materiais[i]);

        if (this.pontoEmEdicao) {
            // ATUALIZA um ponto
            const pontoAtualizado = {
                nome: formValue.nome,
                materiais: materiaisSelecionados
            };
            this.pontoService.update(this.pontoEmEdicao._id, pontoAtualizado).subscribe(() => {
                this.pontoSalvo.emit(); // Avisa o mapa
                this.fecharModal();
            });
        } else {
            // CRIA um novo ponto
            const novoPonto = {
                nome: formValue.nome,
                materiais: materiaisSelecionados,
                latitude: formValue.latitude,
                longitude: formValue.longitude,
            };
            this.pontoService.save(novoPonto).subscribe(() => {
                this.pontoSalvo.emit(); // Avisa o mapa
                this.fecharModal();
            });
        }
    }
}