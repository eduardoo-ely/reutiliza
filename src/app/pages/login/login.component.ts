import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

export function senhasIguaisValidator(control: AbstractControl): ValidationErrors | null {
  const senha = control.get('senha');
  const confirmarSenha = control.get('confirmarSenha');
  if (!confirmarSenha) return null;
  return senha && confirmarSenha && senha.value !== confirmarSenha.value ? { senhasNaoConferem: true } : null;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoginMode = true;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
      private fb: FormBuilder,
      private userService: UserService,
      private router: Router
  ) {}

  ngOnInit(): void {
    if (this.userService.isLoggedIn()) {
      this.router.navigate(['/rota']);
    }
    this.iniciarFormulario();
  }

  iniciarFormulario(): void {
    if (this.isLoginMode) {
      this.loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        senha: ['', [Validators.required]]
      });
    } else {
      this.loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmarSenha: ['', [Validators.required]]
      }, { validators: senhasIguaisValidator });
    }
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.iniciarFormulario();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.mensagemErro = 'Por favor, preencha os campos corretamente.';
      return;
    }
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    const { email, senha } = this.loginForm.value;

    if (this.isLoginMode) {
      // MUDANÇA AQUI: Adicionados console.log para depuração
      console.log('Tentando fazer login com:', { email, senha });

      this.userService.login(email, senha).subscribe({
        next: (resultado) => {
          console.log('Resposta recebida do backend:', resultado); // Vemos a resposta completa
          if (resultado.success) {
            console.log('Login bem-sucedido! A navegar para /rota...');
            this.router.navigate(['/rota']);
          } else {
            console.warn('Backend respondeu, mas o login falhou:', resultado.message);
            this.mensagemErro = resultado.message;
          }
        },
        error: (err) => {
          console.error('Erro na chamada de login:', err); // Vemos o erro completo
          this.mensagemErro = err.error?.message || 'Erro ao tentar fazer login.';
        }
      });
    } else {
      // Lógica de cadastro aqui
    }
  }
}