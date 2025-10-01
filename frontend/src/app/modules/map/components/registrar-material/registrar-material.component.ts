import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialRecicladoService } from '../../../../core/services/material-reciclado.service';
import { MaterialReciclado } from '../../../../models/material-reciclado.model';
import { PontoColeta } from '../../../../models/ponto-coleta.model';
import { AuthService } from '../../../../core/services/auth.service';

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
  @Output() materialRegistrado = new EventEmitter<MaterialReciclado>();

  materialForm: FormGroup;
  tiposMateriais = ['Papel', 'Plástico', 'Vidro', 'Metal', 'Eletrônico', 'Óleo', 'Outros'];
  unidades = ['kg', 'litros', 'unidades'];
  usuarioNome = '';
  usuarioId = '';
  isSubmitting = false;
  mensagemSucesso = '';
  mensagemErro = '';

  constructor(
      private fb: FormBuilder,
      private materialService: MaterialRecicladoService,
      private authService: AuthService
  ) {
    this.materialForm = this.criarFormulario();
  }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.usuarioId = user._id;
        this.usuarioNome = user.nome || '';
      }
    });
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
    this.materialForm.reset({ material: '', quantidade: '', unidade: 'kg', observacoes: '' });
    this.mensagemSucesso = '';
    this.mensagemErro = '';
  }

  registrarMaterial(): void {
    if (this.materialForm.invalid || !this.pontoColeta || !this.usuarioId) return;

    this.isSubmitting = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    const novoMaterial: MaterialReciclado = {
      usuarioId: this.usuarioId,
      pontoColetaId: this.pontoColeta._id!,
      material: this.materialForm.value.material,
      quantidade: this.materialForm.value.quantidade,
      unidade: this.materialForm.value.unidade,
      dataEntrega: new Date(),
      status: 'pendente',
      observacoes: this.materialForm.value.observacoes
    };

    this.materialService.registrarMaterial(novoMaterial).subscribe({
      next: (material) => {
        this.isSubmitting = false;
        this.mensagemSucesso = `Material registrado com sucesso por ${this.usuarioNome}!`;
        this.materialRegistrado.emit(material);
        setTimeout(() => this.fecharModal(), 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.mensagemErro = 'Erro ao registrar material. Tente novamente.';
        console.error(err);
      }
    });
  }
}
