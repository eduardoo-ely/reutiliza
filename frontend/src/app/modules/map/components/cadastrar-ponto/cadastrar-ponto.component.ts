import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { PontoService } from '../../../../core/services/ponto.service';
import { PontoColeta } from '../../../../models/ponto-coleta.model';

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
    readonly materiaisDisponiveis = [
        'Eletroeletrônicos', 'Móveis', 'Vidros', 'Óleo de Cozinha',
        'Pneus', 'Metais e Ferros', 'Papel e Papelão'
    ];

    @Output() pontoSalvo = new EventEmitter<void>();

    constructor(private pontoService: PontoService, private fb: FormBuilder) {
        this.criarFormulario();
    }

    criarFormulario(): void {
        this.pontoForm = this.fb.group({
            nome: ['', [Validators.required, Validators.minLength(3)]],
            endereco: ['', Validators.required],
            latitude: [0, Validators.required],
            longitude: [0, Validators.required],
            materiais: this.fb.array(this.materiaisDisponiveis.map(() => new FormControl(false))),
            horarioFuncionamento: ['', Validators.required],
            telefone: [''],
            email: ['']
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
        const materiaisArray = this.pontoForm.get('materiais') as FormArray;

        materiaisArray.controls.forEach((ctrl, i) => {
            ctrl.setValue(ponto.materiais.includes(this.materiaisDisponiveis[i]));
        });

        this.pontoForm.patchValue({
            nome: ponto.nome,
            endereco: ponto.endereco,
            latitude: ponto.latitude,
            longitude: ponto.longitude,
            horarioFuncionamento: ponto.horarioFuncionamento,
            telefone: ponto.telefone || '',
            email: ponto.email || ''
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

        const ponto: PontoColeta = {
            ...(this.pontoEmEdicao?._id && { _id: this.pontoEmEdicao._id }),
            nome: formValue.nome,
            endereco: formValue.endereco,
            latitude: formValue.latitude,
            longitude: formValue.longitude,
            materiais: materiaisSelecionados,
            horarioFuncionamento: formValue.horarioFuncionamento,
            telefone: formValue.telefone,
            email: formValue.email,
            ativo: true
        };

        if (this.pontoEmEdicao?._id) {
            this.pontoService.update(this.pontoEmEdicao._id, ponto).subscribe(() => {
                this.pontoSalvo.emit();
                this.fecharModal();
            });
        } else {
            this.pontoService.create(ponto).subscribe(() => {
                this.pontoSalvo.emit();
                this.fecharModal();
            });
        }
    }

    get materiaisControls(): FormArray {
        return this.pontoForm.get('materiais') as FormArray;
    }
}
