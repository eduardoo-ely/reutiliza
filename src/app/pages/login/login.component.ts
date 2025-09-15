import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Função validadora personalizada para verificar se as senhas são iguais no registo
export function senhasIguaisValidator(control: AbstractControl): ValidationErrors | null {
  const senha = control.get('senha');
  const confirmarSenha = control.get('confirmarSenha');
  if (!confirmarSenha) return null;
  return senha && confirmarSenha && senha.value !== confirmarSenha.value ? { senhasNaoConferem: true } : null;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // Dependências para componentes standalone
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoginMode = true; // Controla se o formulário é de login ou de registo
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
      private fb: FormBuilder,
      private userService: UserService,
      private router: Router
  ) {}

  ngOnInit(): void {
    // Se o utilizador já estiver logado, redireciona-o diretamente para o mapa
    if (this.userService.isLoggedIn()) {
      this.router.navigate(['/rota']);
    }
    this.iniciarFormulario();
  }

  // Inicia ou recria o formulário com as validações corretas para o modo atual
  iniciarFormulario(): void {
    if (this.isLoginMode) {
      this.loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        senha: ['', [Validators.required]]
      });
    } else {
      this.loginForm = this.fb.group({
        nome: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmarSenha: ['', [Validators.required]]
      }, { validators: senhasIguaisValidator }); // Aplica o validador de senhas
    }
  }

  // Alterna entre o modo de login e o modo de registo
  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.iniciarFormulario(); // Recria o formulário para o novo modo
  }

  // Função chamada quando o formulário é submetido
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.mensagemErro = 'Por favor, preencha os campos corretamente.';
      return;
    }

    this.mensagemErro = '';
    this.mensagemSucesso = '';
    const { email, senha, nome } = this.loginForm.value;

    if (this.isLoginMode) {
      // --- LÓGICA DE LOGIN ---
      this.userService.login(email, senha).subscribe({
        next: (resultado) => {
          if (resultado.success) {
            this.router.navigate(['/rota']); // Redireciona para o mapa
          }
        },
        error: (err) => {
          // Mostra a mensagem de erro específica vinda do backend
          this.mensagemErro = err.error.message || 'Erro ao tentar fazer login.';
        }
      });
    } else {
      // --- LÓGICA DE REGISTO ---
      this.userService.register(nome, email, senha).subscribe({
        next: (resultado) => {
          if (resultado.success) {
            this.mensagemSucesso = resultado.message + ' Por favor, faça o login.';
            this.toggleMode(); // Volta para a tela de login
          }
        },
        error: (err) => {
          // Mostra a mensagem de erro específica vinda do backend
          this.mensagemErro = err.error.message || 'Erro ao tentar criar a conta.';
        }
      });
    }
  }
}