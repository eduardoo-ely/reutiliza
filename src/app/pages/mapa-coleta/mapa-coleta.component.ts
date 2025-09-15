import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { PontoService } from '../../services/ponto.service';
import { PontoColeta } from '../../services/models/ponto.models';
import { UserService } from '../../services/user.service';

declare module 'leaflet' {
  namespace Routing { function control(options: any): any; }
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
  private routingControl: any = null;
  private todosOsPontos: PontoColeta[] = [];
  private userLocation: L.LatLng | null = null;
  private destinoMarker: L.Marker | null = null;

  pontoColetaIcon = L.icon({
    iconUrl: 'assets/espaco-reservado.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });

  destinoIcon = L.icon({
    iconUrl: 'assets/saco-de-lixo.png', // ícone de saco de lixo
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
    className: 'ponto-destino' // adiciona animação pulse
  });

  userLocationIcon = L.icon({
    iconUrl: 'assets/localizacao-atual.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  modalAberto = false;
  pontoForm!: FormGroup;
  pontoEmEdicao: PontoColeta | null = null;
  readonly materiaisDisponiveis = [
    'Eletroeletrônicos',
    'Móveis',
    'Vidros',
    'Óleo de Cozinha',
    'Pneus',
    'Metais e Ferros',
    'Papel e Papelão'
  ];

  constructor(
      private pontoService: PontoService,
      private userService: UserService,
      private fb: FormBuilder,
      private router: Router
  ) {
    if (!this.userService.isLoggedIn()) this.router.navigate(['/']);
    this.criarFormulario();
  }

  ngAfterViewInit(): void { this.initMap(); }

  private initMap(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          pos => this.startMapAt(pos.coords.latitude, pos.coords.longitude),
          () => this.startMapAt(-27.10, -52.61) // fallback
      );
    } else {
      this.startMapAt(-27.10, -52.61);
    }
  }

  private startMapAt(lat: number, lng: number): void {
    this.userLocation = L.latLng(lat, lng);
    this.map = L.map('map').setView(this.userLocation, 15);

    // Marker usuário
    L.marker(this.userLocation, { icon: this.userLocationIcon })
        .addTo(this.map)
        .bindPopup('Você está aqui!');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.addLayer(this.markersLayer);
    this.carregarPontos();
  }

  recenterMap(): void {
    if (this.userLocation && this.map) this.map.flyTo(this.userLocation, 15);
    else alert('Localização não encontrada. Aguarde ou permita acesso.');
  }

  private carregarPontos(): void {
    this.markersLayer.clearLayers();
    this.pontoService.getAll().subscribe({
      next: pontos => {
        this.todosOsPontos = pontos;
        pontos.forEach(p => this.adicionarMarker(p));
      },
      error: err => alert('Erro ao carregar pontos: ' + err)
    });
  }

  private adicionarMarker(ponto: PontoColeta): void {
    if (!ponto.latitude || !ponto.longitude) return;

    const marker = L.marker([ponto.latitude, ponto.longitude], { icon: this.pontoColetaIcon })
        .addTo(this.markersLayer);

    marker.on('mouseover', () => marker.getElement()!.style.transform = 'scale(1.3)');
    marker.on('mouseout', () => marker.getElement()!.style.transform = 'scale(1)');

    marker.bindPopup(`
      <div class="popup-header">${ponto.nome}</div>
      <div class="popup-body">
        <strong>Materiais:</strong> ${ponto.materiais.join(', ')}
      </div>
    `);
  }

  tracarRotaParaMaterial(material: string): void {
    if (!this.userLocation) return alert('Localização não determinada.');

    const pontos = this.todosOsPontos.filter(p => p.materiais.includes(material) && p.latitude && p.longitude);
    if (!pontos.length) return alert(`Nenhum ponto de coleta para "${material}"`);

    let destino = pontos[0];
    let minDist = this.userLocation.distanceTo(L.latLng(destino.latitude, destino.longitude));
    pontos.forEach(p => {
      const dist = this.userLocation!.distanceTo(L.latLng(p.latitude, p.longitude));
      if (dist < minDist) { minDist = dist; destino = p; }
    });

    this.limparRota();

    const destinoLatLng = L.latLng(destino.latitude, destino.longitude);
    L.marker(destinoLatLng, { icon: this.destinoIcon })
        .addTo(this.markersLayer)
        .bindPopup(`Destino: ${destino.nome}`);

    // Rota verde
    this.routingControl = L.Routing.control({
      waypoints: [this.userLocation, destinoLatLng],
      show: false,
      addWaypoints: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: '#28a745', opacity: 0.9, weight: 6, lineCap: 'round' }] }
    }).addTo(this.map);
  }

  limparRota(): void {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }
    if (this.destinoMarker) {
      this.map.removeLayer(this.destinoMarker);
      this.destinoMarker = null;
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
    const sel = this.materiaisDisponiveis.map(m => ponto.materiais.includes(m));
    this.pontoForm.patchValue({ nome: ponto.nome, materiais: sel });
    this.modalAberto = true;
    this.map.closePopup();
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.pontoEmEdicao = null;
    if (this.pontoForm.contains('latitude')) { this.pontoForm.removeControl('latitude'); this.pontoForm.removeControl('longitude'); }
  }

  salvarPonto(): void {
    if (this.pontoForm.invalid) return;
    const val = this.pontoForm.value;
    const materiaisSel = this.materiaisDisponiveis.filter((_, i) => val.materiais[i]);

    if (!this.pontoEmEdicao) {
      const novo = { nome: val.nome, materiais: materiaisSel, latitude: val.latitude, longitude: val.longitude };
      this.pontoService.save(novo).subscribe(() => { this.carregarPontos(); this.fecharModal(); });
    } else {
      const atualizado = { nome: val.nome, materiais: materiaisSel };
      this.pontoService.update(this.pontoEmEdicao._id, atualizado).subscribe(() => { this.carregarPontos(); this.fecharModal(); });
    }
  }

  excluirPonto(id: string): void {
    if (confirm('Deseja excluir este ponto?')) {
      this.pontoService.delete(id).subscribe(() => { this.carregarPontos(); this.map.closePopup(); });
    }
  }
}