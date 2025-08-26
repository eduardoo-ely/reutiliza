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
      this.router.navigate(['/rota']); // Rota correta
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
      // MUDANÇA AQUI: Usamos .subscribe() para esperar a resposta da API
      this.userService.login(email, senha).subscribe({
        next: (resultado) => {
          if (resultado.success) {
            this.router.navigate(['/rota']); // Redireciona para o mapa após login
          }
        },
        error: (err) => {
          // Exibe a mensagem de erro que vem do backend
          this.mensagemErro = err.error?.message || 'Erro ao tentar fazer login.';
        }
      });
    } else {
      // A lógica de cadastro também precisaria de um .subscribe()
      // this.userService.register(email, senha).subscribe({...});
      console.log('Funcionalidade de cadastro a ser implementada com API.');
    }
  }
}


/*
 * ----------------------------------------------------------------
 * ARQUIVO: src/app/pages/mapa-coleta/mapa-coleta.component.ts (VERSÃO ATUALIZADA)
 * ----------------------------------------------------------------
 * Ajustamos o método carregarPontos para usar .subscribe() e
 * carregar os dados do mapa vindos da API.
 * ----------------------------------------------------------------
 */
import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { PontoService, PontoColeta } from '../../services/ponto.service'; // Importa a interface atualizada

// Declaração para o routing machine (sem alterações)
declare module 'leaflet' {
  namespace Routing {
    function control(options: any): any;
  }
}

@Component({
  selector: 'app-mapa-coleta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mapa-coleta.component.html',
  styleUrls: ['./mapa-coleta.component.css']
})
export class MapaColetaComponent implements AfterViewInit {
  private map!: L.Map;
  private markersLayer = L.layerGroup();
  private userLocation: L.LatLng | null = null;
  private routingControl: any = null;
  private todosOsPontos: PontoColeta[] = []; // Cache para os pontos

  meuIconeCustomizado = L.icon({
    iconUrl: 'https://img.icons8.com/?size=100&id=Ln7jSgbyMI2J&format=png&color=000000',
    iconSize: [50, 50],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });

  modalAberto = false;
  pontoForm!: FormGroup;
  pontoEmEdicao: PontoColeta | null = null;
  readonly materiaisDisponiveis = ['Eletroeletrônicos', 'Móveis', 'Vidros', 'Óleo de Cozinha', 'Pneus', 'Metais e Ferros'];

  constructor(
      private pontoService: PontoService,
      private fb: FormBuilder
  ) {
    this.criarFormulario();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    // O código de inicialização do mapa permanece o mesmo
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = position.coords;
            const latLng = L.latLng(coords.latitude, coords.longitude);
            this.userLocation = latLng;
            this.map = L.map('map').setView(latLng, 15);
            L.circleMarker(latLng, { radius: 15, color: '#020202', fillColor: '#007bff', fillOpacity: 1 })
                .addTo(this.map).bindPopup('Você está aqui!').openPopup();
            this.addTileLayerAndMarkers();
          },
          (error) => {
            this.initMapAtDefaultLocation();
          }
      );
    } else {
      this.initMapAtDefaultLocation();
    }
  }

  private initMapAtDefaultLocation(): void {
    this.map = L.map('map').setView([-27.10, -52.61], 13);
    this.addTileLayerAndMarkers();
  }

  private addTileLayerAndMarkers(): void {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    this.map.addLayer(this.markersLayer);
    this.carregarPontos(); // Chama o método que agora usa a API
  }

  private carregarPontos(): void {
    this.markersLayer.clearLayers();
    // MUDANÇA AQUI: Usamos .subscribe() para buscar os pontos da API
    this.pontoService.getAll().subscribe({
      next: (pontos) => {
        this.todosOsPontos = pontos; // Guarda os pontos para usar nos filtros
        pontos.forEach(ponto => {
          this.adicionarMarker(ponto);
        });
      },
      error: (err) => {
        console.error('Erro ao carregar pontos de coleta:', err);
        alert('Não foi possível carregar os pontos de coleta. Verifique se o backend está rodando.');
      }
    });
  }

  private adicionarMarker(ponto: PontoColeta): void {
    // MUDANÇA AQUI: O ID agora é `_id` e precisamos de lat/lng
    // Certifique-se que seus dados no MongoDB tenham latitude e longitude
    if (!ponto.latitude || !ponto.longitude) {
      // Coordenadas aproximadas para os Ecopontos de Chapecó para fallback
      if (ponto.nome.includes("SEINFRA")) { ponto.latitude = -27.1033; ponto.longitude = -52.6295; }
      else if (ponto.nome.includes("Efapi")) { ponto.latitude = -27.1121; ponto.longitude = -52.6505; }
      else if (ponto.nome.includes("Seap")) { ponto.latitude = -27.0915; ponto.longitude = -52.6148; }
      else return; // Não adiciona marcador se não tiver coordenadas
    }

    const marker = L.marker([ponto.latitude, ponto.longitude], { icon: this.meuIconeCustomizado }).addTo(this.markersLayer);
    const popupContent = `<b>${ponto.nome}</b><br>Materiais: ${ponto.materiais.join(', ')}<hr><button class="btn-popup-editar" data-ponto-id="${ponto._id}">Editar</button><button class="btn-popup-excluir" data-ponto-id="${ponto._id}">Excluir</button>`;
    marker.bindPopup(popupContent);
    marker.on('popupopen', () => {
      document.querySelector(`[data-ponto-id="${ponto._id}"].btn-popup-editar`)?.addEventListener('click', () => this.abrirModalParaEditar(ponto));
      document.querySelector(`[data-ponto-id="${ponto._id}"].btn-popup-excluir`)?.addEventListener('click', () => this.excluirPonto(ponto._id));
    });
  }

  tracarRotaParaMaterial(material: string): void {
    if (!this.userLocation) {
      alert('Sua localização ainda não foi determinada.');
      return;
    }
    const pontosFiltrados = this.todosOsPontos.filter(p => p.materiais.includes(material) && p.latitude && p.longitude);
    if (pontosFiltrados.length === 0) {
      alert(`Nenhum ponto de coleta encontrado para "${material}".`);
      return;
    }
    // Lógica para encontrar o ponto mais próximo (sem alterações)
    let pontoFinal = pontosFiltrados[0];
    let menorDistancia = this.userLocation.distanceTo(L.latLng(pontoFinal.latitude, pontoFinal.longitude));
    for (let i = 1; i < pontosFiltrados.length; i++) {
      const pontoAtual = pontosFiltrados[i];
      const distancia = this.userLocation.distanceTo(L.latLng(pontoAtual.latitude, pontoAtual.longitude));
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        pontoFinal = pontoAtual;
      }
    }
    this.limparRota();
    const destino = L.latLng(pontoFinal.latitude, pontoFinal.longitude);
    this.routingControl = L.Routing.control({
      waypoints: [ this.userLocation, destino ],
      show: false, addWaypoints: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: '#007bff', opacity: 0.8, weight: 6 }] }
    }).addTo(this.map);
  }

  // Funções de CRUD (criar, editar, excluir) e de rota não foram alteradas na sua lógica principal,
  // mas precisariam de chamadas .subscribe() aos serviços se fossem ser implementadas com o backend.
  // O código abaixo é apenas para manter a estrutura.

  criarFormulario(): void {
    this.pontoForm = this.fb.group({
      nome: ['', Validators.required],
      materiais: this.fb.array(this.materiaisDisponiveis.map(() => this.fb.control(false)))
    });
  }

  limparRota(): void {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }
  }

  abrirModalParaCriar(latlng: L.LatLng): void { /* Lógica de UI */ }
  abrirModalParaEditar(ponto: PontoColeta): void { /* Lógica de UI */ }
  fecharModal(): void { this.modalAberto = false; }
  salvarPonto(): void { /* Precisaria chamar o service com .subscribe() */ }
  excluirPonto(id: string): void { /* Precisaria chamar o service com .subscribe() */ }
}