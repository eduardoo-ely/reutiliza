import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

// Interface do Ponto de Coleta
export interface PontoColeta {
  id: string;
  nome: string;
  materiais: string[];
  latitude: number;
  longitude: number;
}

// Estende o 'L' do leaflet para evitar erros de tipo com a rota
declare module 'leaflet' {
  namespace Routing {
    function control(options: any): any;
  }
}

import { PontoService } from '../../services/ponto.service';

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

  meuIconeCustomizado = L.icon({
    iconUrl: 'https://img.icons8.com/?size=100&id=Ln7jSgbyMI2J&format=png&color=000000',
    iconSize: [50, 50],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });

  modalAberto = false;
  pontoForm!: FormGroup;
  pontoEmEdicao: PontoColeta | null = null;
  readonly materiaisDisponiveis = ['Plástico', 'Papel', 'Vidro', 'Metal', 'Orgânico'];

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
          const coords = position.coords;
          const latLng = L.latLng(coords.latitude, coords.longitude);
          this.userLocation = latLng;

          this.map = L.map('map').setView(latLng, 15);

          L.circleMarker(latLng, { radius: 15, color: '#020202', fillColor: '#007bff', fillOpacity: 1 })
            .addTo(this.map).bindPopup('Você está aqui!').openPopup();

          this.addTileLayerAndMarkers();
        },
        (error) => {
          console.error(`Erro ao obter localização: ${error.message}`);
          this.initMapAtDefaultLocation();
        }
      );
    } else {
      console.error('Geolocalização não é suportada.');
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

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.abrirModalParaCriar(e.latlng);
    });
  }

  private criarFormulario(): void {
    this.pontoForm = this.fb.group({
      nome: ['', Validators.required],
      materiais: this.fb.array(
        this.materiaisDisponiveis.map(() => this.fb.control(false))
      )
    });
  }

  private carregarPontos(): void {
    this.markersLayer.clearLayers();
    const pontos = this.pontoService.getAll();
    pontos.forEach(ponto => {
      this.adicionarMarker(ponto);
    });
  }

  private adicionarMarker(ponto: PontoColeta): void {
    const marker = L.marker([ponto.latitude, ponto.longitude], { icon: this.meuIconeCustomizado }).addTo(this.markersLayer);
    const popupContent = `<b>${ponto.nome}</b><br>Materiais: ${ponto.materiais.join(', ')}<hr><button class="btn-popup-editar" data-ponto-id="${ponto.id}">Editar</button><button class="btn-popup-excluir" data-ponto-id="${ponto.id}">Excluir</button>`;
    marker.bindPopup(popupContent);
    marker.on('popupopen', () => {
      document.querySelector(`[data-ponto-id="${ponto.id}"].btn-popup-editar`)?.addEventListener('click', () => this.abrirModalParaEditar(ponto));
      document.querySelector(`[data-ponto-id="${ponto.id}"].btn-popup-excluir`)?.addEventListener('click', () => this.excluirPonto(ponto.id));
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
    this.map.closePopup();
    this.pontoForm.patchValue({
      nome: ponto.nome,
      materiais: this.materiaisDisponiveis.map(material => ponto.materiais.includes(material))
    });
    this.pontoForm.addControl('latitude', new FormControl(ponto.latitude, Validators.required));
    this.pontoForm.addControl('longitude', new FormControl(ponto.longitude, Validators.required));
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.pontoEmEdicao = null;
    this.pontoForm.removeControl('latitude');
    this.pontoForm.removeControl('longitude');
  }

  salvarPonto(): void {
    if (this.pontoForm.invalid) return;
    // CORREÇÃO DO ERRO DE DIGITAÇÃO AQUI:
    const formValue = this.pontoForm.getRawValue();
    const pontoParaSalvar = {
      nome: formValue.nome,
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      materiais: this.materiaisDisponiveis.map((material, index) => formValue.materiais[index] ? material : null).filter((material): material is string => material !== null),
    };
    if (this.pontoEmEdicao) {
      const pontoAtualizado: PontoColeta = { ...pontoParaSalvar, id: this.pontoEmEdicao.id };
      this.pontoService.update(pontoAtualizado);
    } else {
      this.pontoService.save(pontoParaSalvar);
    }
    this.carregarPontos();
    this.fecharModal();
  }

  excluirPonto(id: string): void {
    if (confirm('Tem certeza?')) {
      this.pontoService.delete(id);
      this.carregarPontos();
      this.map.closePopup();
    }
  }

  tracarRotaParaMaterial(material: string): void {
    if (!this.userLocation) {
      alert('Sua localização ainda não foi determinada. Por favor, aguarde ou permita o acesso.');
      return;
    }
    const pontosFiltrados = this.pontoService.getAll().filter(p => p.materiais.includes(material));
    if (pontosFiltrados.length === 0) {
      alert(`Nenhum ponto de coleta encontrado para "${material}".`);
      return;
    }
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
      waypoints: [
        this.userLocation,
        destino
      ],
      show: false,
      addWaypoints: false,
      createMarker: () => { return null; },
      lineOptions: {
        styles: [{ color: '#007bff', opacity: 0.8, weight: 6 }]
      }
    }).addTo(this.map);
  }

  limparRota(): void {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }
  }
}
