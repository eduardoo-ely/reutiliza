import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms'; // Validators foi re-adicionado
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { PontoService, PontoColeta } from '../../services/ponto.service';

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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            this.userLocation = L.latLng(latitude, longitude);
            this.map = L.map('map').setView(this.userLocation, 15);
            L.circleMarker(this.userLocation, { radius: 15, color: '#020202', fillColor: '#007bff', fillOpacity: 1 })
                .addTo(this.map).bindPopup('Você está aqui!').openPopup();
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
        alert('Não foi possível carregar os pontos. Verifique se o backend está rodando.');
      }
    });
  }

  private adicionarMarker(ponto: PontoColeta): void {
    if (!ponto.latitude || !ponto.longitude) return;
    const marker = L.marker([ponto.latitude, ponto.longitude], { icon: this.meuIconeCustomizado }).addTo(this.markersLayer);
    const popupContent = `<b>${ponto.nome}</b><br>Materiais: ${ponto.materiais.join(', ')}`;
    marker.bindPopup(popupContent);
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

  // --- FUNÇÕES DO MODAL RE-ADICIONADAS ---
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
    // Lógica para editar um ponto (ainda não implementada com a API)
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.pontoEmEdicao = null;
    this.pontoForm.removeControl('latitude');
    this.pontoForm.removeControl('longitude');
  }

  salvarPonto(): void {
    // Lógica para salvar um novo ponto (ainda não implementada com a API)
    console.log('Salvando ponto:', this.pontoForm.value);
    this.fecharModal();
  }

  excluirPonto(id: string): void {
    // Lógica para excluir um ponto (ainda não implementada com a API)
    console.log('Excluindo ponto com id:', id);
  }
}