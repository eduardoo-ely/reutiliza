import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { PontoService } from '../../../../core/services/ponto.service';
import { PontoColeta } from '../../../../models/ponto-coleta.model';
import { CadastrarPontoComponent } from '../../components/cadastrar-ponto/cadastrar-ponto.component';

@Component({
  selector: 'app-mapa-coleta',
  standalone: true,
  imports: [CommonModule, CadastrarPontoComponent],
  templateUrl: './mapa-coleta.component.html',
  styleUrls: ['./mapa-coleta.component.css']
})
export class MapaColetaComponent implements AfterViewInit {
  @ViewChild(CadastrarPontoComponent) cadastrarPontoComp!: CadastrarPontoComponent;

  map!: L.Map;
  markersLayer: L.LayerGroup = L.layerGroup();
  pontos: PontoColeta[] = [];
  userLocation!: L.LatLng;

  private routingControl: any = null;

  materiaisDisponiveis = [
    'Eletroeletrônicos', 'Móveis', 'Vidros', 'Óleo de Cozinha',
    'Pneus', 'Metais e Ferros', 'Papel e Papelão'
  ];

  pontoIcon = L.icon({
    iconUrl: 'assets/fabrica.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  userIcon = L.icon({
    iconUrl: 'assets/localizacao-atual.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  constructor(private pontoService: PontoService) {}

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  inicializarMapa(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          pos => this.criarMapa(pos.coords.latitude, pos.coords.longitude),
          () => this.criarMapa(-27.1004, -52.6152)
      );
    } else {
      this.criarMapa(-27.1004, -52.6152);
    }
  }

  private criarMapa(lat: number, lng: number): void {
    this.userLocation = L.latLng(lat, lng);
    this.map = L.map('map', { zoomControl: true }).setView(this.userLocation, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    L.marker(this.userLocation, { icon: this.userIcon })
        .bindPopup('Você está aqui!')
        .addTo(this.map);

    this.markersLayer.addTo(this.map);

    // Clique no mapa abre modal de novo ponto
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.cadastrarPontoComp?.abrirModalParaCriar(e.latlng);
    });

    // Recarrega pontos ao salvar
    this.cadastrarPontoComp?.pontoSalvo.subscribe(() => this.carregarPontos());

    // Carrega pontos do banco
    this.carregarPontos();
  }

  recenterMap(): void {
    if (this.map && this.userLocation) {
      this.map.flyTo(this.userLocation, 15);
    }
  }

  carregarPontos(): void {
    this.pontoService.getAll().subscribe({
      next: (data: PontoColeta[]) => {
        this.pontos = data || [];
        this.renderizarPontos();
      },
      error: err => console.error('Erro ao carregar pontos:', err)
    });
  }

  private renderizarPontos(): void {
    this.markersLayer.clearLayers();

    this.pontos.forEach(ponto => {
      const popupContent = `
    <b>${ponto.nome}</b><br>
    <b>Endereço:</b> ${ponto.endereco}<br>
    <b>Materiais:</b> ${ponto.materiais.join(', ')}<br>
    <b>Horário:</b> ${ponto.horarioFuncionamento || 'Não informado'}<br>
    ${ponto.telefone ? `<b>Telefone:</b> ${ponto.telefone}<br>` : ''}
    ${ponto.email ? `<b>Email:</b> ${ponto.email}<br>` : ''}
    `;


      const marker = L.marker([ponto.latitude, ponto.longitude], { icon: this.pontoIcon })
          .bindPopup(popupContent)
          .on('dblclick', () => this.cadastrarPontoComp?.abrirModalParaEditar(ponto));

      marker.addTo(this.markersLayer);
    });
  }


  tracarRotaParaMaterial(material: string): void {
    if (!this.userLocation) return;

    const candidatos = this.pontos.filter(p => p.materiais.includes(material));
    if (!candidatos.length) {
      alert(`Nenhum ponto de coleta encontrado para "${material}"`);
      return;
    }

    // escolhe o mais próximo
    let destino = candidatos[0];
    let menor = this.userLocation.distanceTo(L.latLng(destino.latitude, destino.longitude));
    candidatos.forEach(p => {
      const d = this.userLocation.distanceTo(L.latLng(p.latitude, p.longitude));
      if (d < menor) { menor = d; destino = p; }
    });

    this.tracarRotaParaPonto(destino);
  }

  tracarRotaParaPonto(ponto: PontoColeta): void {
    if (!this.userLocation) return;

    const destinoLatLng = L.latLng(ponto.latitude, ponto.longitude);

    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }

    this.routingControl = (L.Routing.control as any)({
      waypoints: [this.userLocation, destinoLatLng],
      show: false,
      addWaypoints: false,
      createMarker: () => null,
      lineOptions: {
        styles: [
          { color: '#1b5e20', opacity: 0.35, weight: 10, lineCap: 'round' },
          { color: '#28a745', opacity: 1, weight: 6, lineCap: 'round' }
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      }
    }).addTo(this.map);

  }

  limparRota(): void {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }
  }

  onClickReutiliza(): void {
    console.log('ReUtiliza clicado!');
  }

}
