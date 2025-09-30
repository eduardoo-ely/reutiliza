import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRecicladoService } from '../../../core/services/material-reciclado.service';
import { ValidacaoCruzada, MaterialReciclado } from '../../../models/material-reciclado.model';
import { AuthService } from '../../../core/services/auth.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-validacao-cruzada',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './validacao-cruzada.component.html',
  styleUrls: ['./validacao-cruzada.component.css']
})
export class ValidacaoCruzadaComponent implements OnInit {
  validacoesPendentes: ValidacaoCruzada[] = [];
  materiaisMap: Map<string, MaterialReciclado> = new Map();
  usuarioId: string = '';
  carregando = true;
  mensagem = '';
  tipoMensagem = '';

  constructor(
    private materialService: MaterialRecicladoService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.usuarioId = user._id;
        this.carregarValidacoesPendentes();
      }
    });
  }

  carregarValidacoesPendentes(): void {
    this.carregando = true;
    this.materialService.getValidacoesPendentes(this.usuarioId).subscribe({
      next: (validacoes) => {
        this.validacoesPendentes = validacoes;
        this.carregarDetalhesMateriaisReciclados();
      },
      error: (err) => {
        console.error('Erro ao carregar validações pendentes:', err);
        this.carregando = false;
        this.exibirMensagem('Erro ao carregar validações pendentes. Tente novamente.', 'erro');
      }
    });
  }

  carregarDetalhesMateriaisReciclados(): void {
    const materialIds = this.validacoesPendentes.map(v => v.materialRecicladoId);
    const uniqueIds = [...new Set(materialIds)];
    
    let loadedCount = 0;
    
    if (uniqueIds.length === 0) {
      this.carregando = false;
      return;
    }
    
    uniqueIds.forEach(id => {
      this.materialService.getMaterialById(id).subscribe({
        next: (material) => {
          this.materiaisMap.set(id, material);
          loadedCount++;
          if (loadedCount === uniqueIds.length) {
            this.carregando = false;
          }
        },
        error: (err) => {
          console.error(`Erro ao carregar material ${id}:`, err);
          loadedCount++;
          if (loadedCount === uniqueIds.length) {
            this.carregando = false;
          }
        }
      });
    });
  }

  confirmarValidacao(validacao: ValidacaoCruzada, confirmado: boolean, observacoes: string = ''): void {
    this.materialService.confirmarValidacao(validacao._id!, confirmado, observacoes).subscribe({
      next: () => {
        this.exibirMensagem(
          confirmado ? 'Validação confirmada com sucesso!' : 'Validação rejeitada com sucesso!', 
          confirmado ? 'sucesso' : 'info'
        );
        this.validacoesPendentes = this.validacoesPendentes.filter(v => v._id !== validacao._id);
      },
      error: (err) => {
        console.error('Erro ao processar validação:', err);
        this.exibirMensagem('Erro ao processar validação. Tente novamente.', 'erro');
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

  getMaterialInfo(id: string): MaterialReciclado | null {
    return this.materiaisMap.get(id) || null;
  }

  formatarData(data: Date): string {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}