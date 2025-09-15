import { Component, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import * as L from 'leaflet';

import { PontoColeta } from '../../services/models/ponto.model';
import { PontoService } from '../../services/ponto.service';

// Workaround para o ícone padrão do Leaflet não aparecer
const iconDefault = L.icon({
  iconRetinaUrl: 'assets/marker-icon-2x.png',
  iconUrl: 'assets/marker-icon.png',
  shadowUrl: 'assets/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;


@Component({
  selector: 'app-mapa-coleta',
  templateUrl: './mapa-coleta.component.html',
  styleUrls: ['./mapa-coleta.component.css']
})
export class MapaColetaComponent implements AfterViewInit {
  private map!: L.Map;
  private markersLayer = L.layerGroup();

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
    this.carregarPontos();
  }

  private criarFormulario(): void {
    this.pontoForm = this.fb.group({
      nome: ['', Validators.required],
      materiais: this.fb.array(
        this.materiaisDisponiveis.map(() => this.fb.control(false))
      )
    });
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [-27.10, -52.61], // Centro de Chapecó
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.addLayer(this.markersLayer);

    // Evento de clique no mapa para adicionar novo ponto
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.abrirModalParaCriar(e.latlng);
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
    const marker = L.marker([ponto.latitude, ponto.longitude]).addTo(this.markersLayer);

    // Popup do marker com as ações
    const popupContent = `
      <b>${ponto.nome}</b><br>
      Materiais: ${ponto.materiais.length > 0 ? ponto.materiais.join(', ') : 'Nenhum'}<br><hr>
      <button class="btn-popup-editar" data-ponto-id="${ponto.id}">Editar</button>
      <button class="btn-popup-excluir" data-ponto-id="${ponto.id}">Excluir</button>
    `;
    marker.bindPopup(popupContent);

    // Adiciona listener para os botões do popup
    marker.on('popupopen', () => {
      document.querySelector(`[data-ponto-id="${ponto.id}"].btn-popup-editar`)
        ?.addEventListener('click', () => this.abrirModalParaEditar(ponto));

      document.querySelector(`[data-ponto-id="${ponto.id}"].btn-popup-excluir`)
        ?.addEventListener('click', () => this.excluirPonto(ponto.id));
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
    this.map.closePopup(); // Fecha o popup do mapa

    this.pontoForm.patchValue({
      nome: ponto.nome,
      materiais: this.materiaisDisponiveis.map(material =>
        ponto.materiais.includes(material)
      )
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
    if (this.pontoForm.invalid) {
      return;
    }

    const formValue = this.pontoForm.value;

    const pontoData: Omit<PontoColeta, 'id' | 'materiais'> & { materiais: string[] } = {
      nome: formValue.nome,
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      materiais: formValue.materiais
        .map((selecionado: boolean, i: number) => selecionado ? this.materiaisDisponiveis[i] : null)
        .filter((v: string | null): v is string => v !== null)
    };

    if (this.pontoEmEdicao) {
      this.pontoService.update({ ...pontoData, id: this.pontoEmEdicao.id });
    } else {
      this.pontoService.save(pontoData);
    }

    this.carregarPontos();
    this.fecharModal();
  }

  excluirPonto(id: string): void {
    if (confirm('Tem certeza que deseja excluir este ponto de coleta?')) {
      this.pontoService.delete(id);
      this.carregarPontos();
      this.map.closePopup();
    }
  }
}
