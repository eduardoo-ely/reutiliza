import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { PontoService } from '../../services/ponto.service';
import { PontoColeta } from '../../services/models/ponto.models';
import { UserService } from '../../services/user.service';

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
  private todosOsPontos: PontoColeta[] = [];

  meuIconeCustomizado = L.icon({
    iconUrl: 'https://img.icons8.com/?size=100&id=Ln7jSgbyMI2J&format=png&color=000000',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50]
  });

  modalAberto = false;
  pontoForm!: FormGroup;
  pontoEmEdicao: PontoColeta | null = null;
  readonly materiaisDisponiveis = ['Eletroeletrônicos', 'Móveis', 'Vidros', 'Óleo de Cozinha', 'Pneus', 'Metais e Ferros', 'Papel e Papelão'];

  constructor(
      private pontoService: PontoService,
      private userService: UserService,
      private fb: FormBuilder,
      private router: Router
  ) {
    // Protege a rota: se o utilizador não estiver logado, volta para a página de login
    if (!this.userService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    this.criarFormulario();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  logout(): void {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  private initMap(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            this.userLocation = L.latLng(latitude, longitude);
            this.map = L.map('map').setView(this.userLocation, 15);
            L.circleMarker(this.userLocation, { radius: 10, color: '#007bff', fillColor: '#007bff', fillOpacity: 1 })
                .addTo(this.map).bindPopup('Você está aqui!');
            this.addTileLayerAndMarkers();
          },
          () => this.initMapAtDefaultLocation()
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
    this.carregarPontos();

    // Adiciona evento de clique no mapa para criar novos pontos
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.abrirModalParaCriar(e.latlng);
    });
  }

  private carregarPontos(): void {
    this.markersLayer.clearLayers();
    this.pontoService.getAll().subscribe({
      next: (pontos) => {
        this.todosOsPontos = pontos;
        pontos.forEach(ponto => this.adicionarMarker(ponto));
      },
      error: (err) => {
        console.error('Erro ao carregar pontos de coleta:', err);
        alert('Não foi possível carregar os pontos. Verifique se o backend está a funcionar.');
      }
    });
  }

  private adicionarMarker(ponto: PontoColeta): void {
    if (!ponto.latitude || !ponto.longitude) return;
    const marker = L.marker([ponto.latitude, ponto.longitude], { icon: this.meuIconeCustomizado }).addTo(this.markersLayer);

    const popupContent = `
        <div class="popup-header">${ponto.nome}</div>
        <div class="popup-body">
            <strong>Materiais:</strong> ${ponto.materiais.join(', ')}
        </div>
        <div class="popup-actions">
            <button class="btn-popup-editar" data-ponto-id="${ponto._id}">Editar</button>
            <button class="btn-popup-excluir" data-ponto-id="${ponto._id}">Excluir</button>
        </div>
    `;
    marker.bindPopup(popupContent);

    // Adiciona os listeners para os botões do popup
    marker.on('popupopen', () => {
      document.querySelector(`[data-ponto-id="${ponto._id}"].btn-popup-editar`)?.addEventListener('click', () => this.abrirModalParaEditar(ponto));
      document.querySelector(`[data-ponto-id="${ponto._id}"].btn-popup-excluir`)?.addEventListener('click', () => this.excluirPonto(ponto._id));
    });
  }

  tracarRotaParaMaterial(material: string): void {
    if (!this.userLocation) {
      alert('A sua localização ainda não foi determinada.');
      return;
    }
    const pontosFiltrados = this.todosOsPontos.filter(p => p.materiais.includes(material) && p.latitude && p.longitude);
    if (pontosFiltrados.length === 0) {
      alert(`Nenhum ponto de coleta encontrado para "${material}".`);
      return;
    }
    let pontoFinal = pontosFiltrados[0];
    let menorDistancia = this.userLocation.distanceTo(L.latLng(pontoFinal.latitude, pontoFinal.longitude));
    pontosFiltrados.forEach(ponto => {
      const distancia = this.userLocation!.distanceTo(L.latLng(ponto.latitude, ponto.longitude));
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        pontoFinal = ponto;
      }
    });
    this.limparRota();
    const destino = L.latLng(pontoFinal.latitude, pontoFinal.longitude);
    this.routingControl = L.Routing.control({
      waypoints: [this.userLocation, destino],
      show: false, addWaypoints: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: '#007bff', opacity: 0.8, weight: 6 }] }
    }).addTo(this.map);
  }

  limparRota(): void {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }
  }

  criarFormulario(): void {
    this.pontoForm = this.fb.group({
      nome: ['', Validators.required],
      materiais: this.fb.array(this.materiaisDisponiveis.map(() => this.fb.control(false)))
    });
  }

  abrirModalParaCriar(latlng: L.LatLng): void {
    this.pontoEmEdicao = null;
    this.pontoForm.reset({ nome: '', materiais: this.materiaisDisponiveis.map(() => false) });
    this.pontoForm.addControl('latitude', new FormControl(latlng.lat, Validators.required));
    this.pontoForm.addControl('longitude', new FormControl(latlng.lng, Validators.required));
    this.modalAberto = true;
  }

  abrirModalParaEditar(ponto: PontoColeta): void {
    this.pontoEmEdicao = ponto;
    const materiaisSelecionados = this.materiaisDisponiveis.map(material =>
        ponto.materiais.includes(material)
    );
    this.pontoForm.patchValue({
      nome: ponto.nome,
      materiais: materiaisSelecionados
    });
    this.modalAberto = true;
    this.map.closePopup();
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.pontoEmEdicao = null;
    if (this.pontoForm.contains('latitude')) {
      this.pontoForm.removeControl('latitude');
      this.pontoForm.removeControl('longitude');
    }
  }

  salvarPonto(): void {
    if (this.pontoForm.invalid) return;

    const formValue = this.pontoForm.value;
    const materiaisSelecionados = this.materiaisDisponiveis.filter((_, i) => formValue.materiais[i]);

    if (!this.pontoEmEdicao) {
      // Lógica de CRIAÇÃO
      const novoPonto = {
        nome: formValue.nome,
        materiais: materiaisSelecionados,
        latitude: formValue.latitude,
        longitude: formValue.longitude,
      };
      this.pontoService.save(novoPonto).subscribe(() => {
        this.carregarPontos();
        this.fecharModal();
      });
    } else {
      // Lógica de ATUALIZAÇÃO
      const pontoAtualizado = {
        nome: formValue.nome,
        materiais: materiaisSelecionados
      };
      this.pontoService.update(this.pontoEmEdicao._id, pontoAtualizado).subscribe(() => {
        this.carregarPontos();
        this.fecharModal();
      });
    }
  }

  excluirPonto(id: string): void {
    if (confirm('Tem a certeza de que deseja excluir este ponto?')) {
      this.pontoService.delete(id).subscribe(() => {
        this.carregarPontos();
        this.map.closePopup();
      });
    }
  }
}