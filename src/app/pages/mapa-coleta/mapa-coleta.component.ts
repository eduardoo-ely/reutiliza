import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
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

  // Camadas e estruturas
  private markersLayer = L.layerGroup();
  private markersMap = new Map<string, L.Marker>(); // mapa ponto._id => marker
  private routingControl: any = null;
  private todosOsPontos: PontoColeta[] = [];
  private userLocation: L.LatLng | null = null;

  // marcador temporário de destino (referência para reset)
  private destinoMarker: L.Marker | null = null;
  private destinoMarkerIsTemporary = false; // se foi criado só para a rota

  // Icons
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
    className: 'ponto-destino' // sua CSS pulse deve usar essa classe
  });

  userLocationIcon = L.icon({
    iconUrl: 'assets/localizacao-atual.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  // Formulário / modal
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
    if (!this.userService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    this.criarFormulario();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  // ---------- MAPA ----------
  private initMap(): void {
    // tenta usar geolocalização, senão fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          pos => this.startMapAt(pos.coords.latitude, pos.coords.longitude),
          () => this.startMapAt(-27.10, -52.61) // Chapecó / fallback
      );
    } else {
      this.startMapAt(-27.10, -52.61);
    }
  }

  private startMapAt(lat: number, lng: number): void {
    this.userLocation = L.latLng(lat, lng);
    this.map = L.map('map').setView(this.userLocation, 15);

    // marker do usuário
    L.marker(this.userLocation, { icon: this.userLocationIcon })
        .addTo(this.map)
        .bindPopup('Você está aqui!');

    // tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // adiciona camada de markers e evento de clique para criar ponto
    this.markersLayer.addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => this.abrirModalParaCriar(e.latlng));

    this.carregarPontos();
  }

  recenterMap(): void {
    if (this.userLocation && this.map) {
      this.map.flyTo(this.userLocation, 15);
    } else {
      alert('Localização não encontrada. Aguarde ou permita acesso.');
    }
  }

  // ---------- PONTOS ----------
  private carregarPontos(): void {
    // limpa camada e mapa auxiliar
    this.markersLayer.clearLayers();
    this.markersMap.clear();

    this.pontoService.getAll().subscribe({
      next: pontos => {
        this.todosOsPontos = pontos || [];
        pontos.forEach(p => this.adicionarMarker(p));
      },
      error: err => {
        console.error('Erro ao carregar pontos:', err);
        alert('Erro ao carregar pontos de coleta.');
      }
    });
  }

  private adicionarMarker(ponto: PontoColeta): void {
    if (!ponto.latitude || !ponto.longitude) return;

    const latlng: L.LatLngExpression = [ponto.latitude, ponto.longitude];

    // limita a exibição dos materiais
    let materiaisText = '';
    if (ponto.materiais.length <= 3) {
      materiaisText = ponto.materiais.join(', ');
    } else {
      materiaisText = ponto.materiais.slice(0, 3).join(', ') + ' + diversos';
    }

    const horario = ponto['horario'] ? `<div><strong>Horário:</strong> ${ponto['horario']}</div>` : '';

    const popupContent = `
    <div class="popup-card">
      <h3>${ponto.nome}</h3>
      <div><strong>Materiais:</strong> ${materiaisText}</div>
      ${horario}
      <div class="popup-actions">
        <button class="btn-popup-editar" data-ponto-id="${ponto._id}">Editar</button>
        <button class="btn-popup-excluir" data-ponto-id="${ponto._id}">Excluir</button>
      </div>
    </div>
  `;

    const marker = L.marker(latlng, { icon: this.pontoColetaIcon, title: ponto.nome });
    marker.bindPopup(popupContent);

    // hover via classe (evita manipular style direto)
    marker.on('mouseover', () => {
      const el = marker.getElement();
      if (el) el.classList.add('marker-hover');
    });
    marker.on('mouseout', () => {
      const el = marker.getElement();
      if (el) el.classList.remove('marker-hover');
    });

    marker.on('popupopen', () => {
      // liga os botões do popup (só para este ponto)
      const editBtn = document.querySelector(`button.btn-popup-editar[data-ponto-id="${ponto._id}"]`);
      const delBtn = document.querySelector(`button.btn-popup-excluir[data-ponto-id="${ponto._id}"]`);

      if (editBtn) {
        // remove listeners anteriores para evitar duplicação
        (editBtn as HTMLElement).onclick = () => this.abrirModalParaEditar(ponto);
      }
      if (delBtn) {
        (delBtn as HTMLElement).onclick = () => this.excluirPonto(ponto._id);
      }
    });

    marker.addTo(this.markersLayer);
    if (ponto._id) this.markersMap.set(ponto._id, marker);
  }

  // ---------- ROTA / DESTINO ----------
  tracarRotaParaMaterial(material: string): void {
    if (!this.userLocation) {
      alert('Sua localização ainda não foi determinada.');
      return;
    }

    const candidatos = this.todosOsPontos.filter(p => p.materiais.includes(material) && p.latitude && p.longitude);
    if (!candidatos.length) {
      alert(`Nenhum ponto de coleta encontrado para "${material}".`);
      return;
    }

    // escolhe o mais próximo
    let destino = candidatos[0];
    let menor = this.userLocation.distanceTo(L.latLng(destino.latitude, destino.longitude));
    candidatos.forEach(p => {
      const d = this.userLocation!.distanceTo(L.latLng(p.latitude, p.longitude));
      if (d < menor) { menor = d; destino = p; }
    });

    // limpa rota anterior (e restaura ícone caso exista)
    this.limparRota();

    const destinoLatLng = L.latLng(destino.latitude, destino.longitude);

    // Tenta encontrar marker existente para esse ponto
    const existing = destino._id ? this.markersMap.get(destino._id) : undefined;
    if (existing) {
      // troca icon do marker existente
      existing.setIcon(this.destinoIcon);
      this.destinoMarker = existing;
      this.destinoMarkerIsTemporary = false;
      this.destinoMarker = existing;
      this.destinoMarkerId = destino._id ?? null;
    } else {
      // (caso raro) cria marker temporário
      this.destinoMarker = L.marker(destinoLatLng, { icon: this.destinoIcon }).addTo(this.map);
      this.destinoMarkerIsTemporary = true;
      this.destinoMarkerId = null;
    }

    // efeito hover para destino tb
    if (this.destinoMarker && this.destinoMarker.getElement()) {
      this.destinoMarker.getElement()!.classList.add('marker-hover');
    } else if (this.destinoMarker) {
      // caso getElement ainda não esteja pronto, garante event listener quando for adicionada
      this.destinoMarker.on('add', () => {
        this.destinoMarker!.getElement()!.classList.add('marker-hover');
      });
    }

    // Rota "bonitinha" — duas camadas: contorno + linha principal
    if (this.routingControl) {
      try { this.map.removeControl(this.routingControl); } catch {}
      this.routingControl = null;
    }

    this.routingControl = L.Routing.control({
      waypoints: [this.userLocation!, destinoLatLng],
      show: false,
      addWaypoints: false,
      createMarker: () => null,
      lineOptions: {
        // primeiro estilo é "contorno" (mais largo, opaco), depois a linha principal
        styles: [
          { color: '#1b5e20', opacity: 0.35, weight: 10, lineCap: 'round' },
          { color: '#28a745', opacity: 1, weight: 6, lineCap: 'round' }
        ]
      }
    }).addTo(this.map);
  }

  // guarda id do destino atual (para referência)
  private destinoMarkerId: string | null = null;

  limparRota(): void {
    // remove controle de rota
    if (this.routingControl) {
      try { this.map.removeControl(this.routingControl); } catch {}
      this.routingControl = null;
    }

    // se destinoMarker foi criado temporariamente, remove; se foi existente, restaura ícone
    if (this.destinoMarker) {
      try {
        if (this.destinoMarkerIsTemporary) {
          // remove temporário
          this.map.removeLayer(this.destinoMarker);
          this.destinoMarker = null;
          this.destinoMarkerIsTemporary = false;
          this.destinoMarkerId = null;
        } else {
          // restaura ícone padrão
          this.destinoMarker.setIcon(this.pontoColetaIcon);
          this.destinoMarker.getElement()?.classList.remove('marker-hover');
          this.destinoMarker = null;
          this.destinoMarkerId = null;
        }
      } catch (e) {
        console.warn('Erro ao limpar destinoMarker:', e);
        this.destinoMarker = null;
        this.destinoMarkerIsTemporary = false;
        this.destinoMarkerId = null;
      }
    }
  }

  // ---------- FORMULÁRIO / MODAL ----------
  criarFormulario(): void {
    this.pontoForm = this.fb.group({
      nome: ['', Validators.required],
      horario: [''], // campo novo
      materiais: this.fb.array(this.materiaisDisponiveis.map(() => this.fb.control(false)))
    });
  }

  // getter para usar no template se precisar
  get materiaisControls(): FormArray {
    return this.pontoForm.get('materiais') as FormArray;
  }

  abrirModalParaCriar(latlng: L.LatLng): void {
    this.pontoEmEdicao = null;
    this.pontoForm.reset({ nome: '', materiais: this.materiaisDisponiveis.map(() => false) });
    // remove controles caso existam
    if (this.pontoForm.contains('latitude')) {
      this.pontoForm.removeControl('latitude');
      this.pontoForm.removeControl('longitude');
    }
    this.pontoForm.addControl('latitude', new FormControl(latlng.lat, Validators.required));
    this.pontoForm.addControl('longitude', new FormControl(latlng.lng, Validators.required));
    this.modalAberto = true;
  }

  abrirModalParaEditar(ponto: PontoColeta): void {
    this.pontoEmEdicao = ponto;
    const sel = this.materiaisDisponiveis.map(m => ponto.materiais.includes(m));
    this.pontoForm.patchValue({ nome: ponto.nome, materiais: sel });
    // se quiser mostrar lat/lng no modal, adicionar controles (opcional)
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

    const val = this.pontoForm.value;
    const materiaisSel = this.materiaisDisponiveis.filter((_, i) => val.materiais[i]);

    if (!this.pontoEmEdicao) {
      const novo: any = {
        nome: val.nome,
        horario: val.horario,
        materiais: materiaisSel,
        latitude: val.latitude,
        longitude: val.longitude
      };
      this.pontoService.save(novo).subscribe({
        next: () => { this.carregarPontos(); this.fecharModal(); },
        error: err => { console.error(err); alert('Erro ao salvar ponto'); }
      });
    } else {
      const atualizado: any = {
        nome: val.nome,
        horario: val.horario,
        materiais: materiaisSel
      };
      this.pontoService.update(this.pontoEmEdicao._id, atualizado).subscribe({
        next: () => { this.carregarPontos(); this.fecharModal(); },
        error: err => { console.error(err); alert('Erro ao atualizar ponto'); }
      });
    }
  }

  excluirPonto(id: string): void {
    if (!confirm('Deseja excluir este ponto?')) return;
    this.pontoService.delete(id).subscribe({
      next: () => { this.carregarPontos(); this.map.closePopup(); },
      error: err => { console.error(err); alert('Erro ao excluir ponto'); }
    });
  }
}