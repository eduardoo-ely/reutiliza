// components/cadastrar-ponto/cadastrar-ponto.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { PontoService } from '../../../../core/services/ponto.service';
import { PontoColeta } from '../../../../models/ponto.models';

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

    criarFormulario(): void {
        this.pontoForm = this.fb.group({
            nome: ['', [Validators.required, Validators.minLength(3)]],
            materiais: this.fb.array(this.materiaisDisponiveis.map(() => new FormControl(false))),
            latitude: [0, Validators.required],
            longitude: [0, Validators.required]
        });
    }

    abrirModalParaCriar(latlng: L.LatLng): void {
        this.pontoEmEdicao = null;
        this.criarFormulario();
        this.pontoForm.patchValue({
            latitude: latlng.lat,
            longitude: latlng.lng
        });
        this.modalAberto = true;
    }

    abrirModalParaEditar(ponto: PontoColeta): void {
        this.pontoEmEdicao = ponto;
        this.criarFormulario();
        
        // Preenche o formulário com os dados do ponto
        this.pontoForm.patchValue({
            nome: ponto.nome,
            latitude: ponto.latitude,
            longitude: ponto.longitude
        });

        // Marca os materiais que o ponto coleta
        const materiaisArray = this.pontoForm.get('materiais') as FormArray;
        this.materiaisDisponiveis.forEach((material, index) => {
            if (ponto.materiais.includes(material)) {
                materiaisArray.at(index).setValue(true);
            }
        });

        this.modalAberto = true;
    }

    fecharModal(): void {
        this.modalAberto = false;
        this.pontoEmEdicao = null;
    }

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