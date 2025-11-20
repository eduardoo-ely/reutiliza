import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialRecicladoService } from '../../../../core/services/material-reciclado.service';
import { PontoColeta } from '../../../../models/ponto-coleta.model';
import { UserService } from '../../../../core/services/user.service';

@Component({
    selector: 'app-registrar-material',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './registrar-material.component.html',
    styleUrls: ['./registrar-material.component.css']
})
export class RegistrarMaterialComponent implements OnInit {
    @Input() pontoColeta: PontoColeta | null = null;
    @Input() isVisible = false;
    @Output() close = new EventEmitter<void>();
    @Output() materialRegistrado = new EventEmitter<any>();

    materialForm: FormGroup;
    tiposMateriais = ['Papel', 'Plástico', 'Vidro', 'Metal', 'Eletrônico', 'Óleo', 'Outros'];
    unidades = ['kg', 'litros', 'unidades'];
    usuarioId = '';
    usuarioNome = '';
    isSubmitting = false;
    mensagemSucesso = '';
    mensagemErro = '';

    constructor(
        private fb: FormBuilder,
        private materialService: MaterialRecicladoService,
        private userService: UserService
    ) {
        this.materialForm = this.criarFormulario();
    }

    ngOnInit(): void {
        const user = this.userService.getLoggedInUser();
        if (user) {
            this.usuarioId = user.id;
            this.usuarioNome = user.nome;
        } else {
            console.warn('Usuário não está logado');
        }
    }

    criarFormulario(): FormGroup {
        return this.fb.group({
            material: ['', Validators.required],
            quantidade: ['', [Validators.required, Validators.min(0.1)]],
            unidade: ['kg', Validators.required],
            observacoes: ['']
        });
    }

    fecharModal(): void {
        this.isVisible = false;
        this.close.emit();
        this.resetForm();
    }

    resetForm(): void {
        this.materialForm.reset({
            material: '',
            quantidade: '',
            unidade: 'kg',
            observacoes: ''
        });
        this.mensagemSucesso = '';
        this.mensagemErro = '';
        this.isSubmitting = false;
    }

    registrarMaterial(): void {
        // Validações
        if (this.materialForm.invalid) {
            this.mensagemErro = 'Preencha todos os campos obrigatórios';
            this.marcarCamposComoTocados();
            return;
        }

        if (!this.pontoColeta || !this.pontoColeta._id) {
            this.mensagemErro = 'Ponto de coleta inválido';
            return;
        }

        if (!this.usuarioId) {
            this.mensagemErro = 'Usuário não identificado. Faça login novamente.';
            return;
        }

        this.isSubmitting = true;
        this.mensagemErro = '';
        this.mensagemSucesso = '';

        // Criar payload tipado corretamente
        const payload = {
            usuarioId: this.usuarioId,
            pontoColetaId: this.pontoColeta._id,
            material: this.materialForm.value.material,
            quantidade: parseFloat(this.materialForm.value.quantidade),
            unidade: this.materialForm.value.unidade,
            observacoes: this.materialForm.value.observacoes?.trim() || ''
        };

        console.log('📦 Registrando material:', payload);

        this.materialService.registrarMaterial(payload).subscribe({
            next: (response) => {
                console.log('✅ Material registrado:', response);
                this.isSubmitting = false;
                this.mensagemSucesso = `Material registrado com sucesso! Aguarde validação.`;
                this.materialRegistrado.emit(response);

                // Fechar modal após 2 segundos
                setTimeout(() => this.fecharModal(), 2000);
            },
            error: (err) => {
                console.error('❌ Erro ao registrar material:', err);
                this.isSubmitting = false;
                this.mensagemErro = err.message || 'Erro ao registrar material. Tente novamente.';
            }
        });
    }

    // Marcar todos os campos como tocados para mostrar erros
    private marcarCamposComoTocados(): void {
        Object.keys(this.materialForm.controls).forEach(key => {
            this.materialForm.get(key)?.markAsTouched();
        });
    }

    // Getters para facilitar validação no template
    get material() { return this.materialForm.get('material'); }
    get quantidade() { return this.materialForm.get('quantidade'); }
    get unidade() { return this.materialForm.get('unidade'); }
}