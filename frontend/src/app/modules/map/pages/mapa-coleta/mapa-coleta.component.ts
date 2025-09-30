import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { PontoCrudService } from '../../services/ponto-crud.service';
import { PontoColeta } from '../../../../models/ponto.models';
import { CadastrarPontoComponent } from '../../components/cadastrar-ponto/cadastrar-ponto.component';

@Component({
  selector: 'app-mapa-coleta',
  standalone: true,
  imports: [CommonModule, CadastrarPontoComponent],
  templateUrl: './mapa-coleta.component.html',
  styleUrls: ['./mapa-coleta.component.css']
})
export class MapaColetaComponent implements OnInit {
  private map!: L.Map;
  private markers: L.Marker[] = [];
  private userLocationMarker: L.Marker | null = null;
  
  constructor(private pontoCrudService: PontoCrudService) {}

  ngOnInit(): void {
    this.inicializarMapa();
    this.carregarPontos();
    this.obterLocalizacaoUsuario();
  }

  private inicializarMapa(): void {
    // Configuração inicial do mapa
    this.map = L.map('mapa').setView([-23.5505, -46.6333], 12);
    
    // Adiciona o tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Adiciona evento de clique no mapa para criar novos pontos
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.abrirModalCadastro(e.latlng);
    });
  }

  private carregarPontos(): void {
    this.pontoCrudService.getAll().subscribe(pontos => {
      // Limpa os marcadores existentes
      this.limparMarcadores();
      
      // Adiciona os novos marcadores
      pontos.forEach(ponto => {
        this.adicionarMarcador(ponto);
      });
    });
  }

  private adicionarMarcador(ponto: PontoColeta): void {
    const marker = L.marker([ponto.latitude, ponto.longitude])
      .addTo(this.map)
      .bindPopup(this.criarConteudoPopup(ponto))
      .on('click', () => {
        // Armazena o ponto selecionado para possível edição
        marker.openPopup();
      });
    
    this.markers.push(marker);
  }

  private criarConteudoPopup(ponto: PontoColeta): L.Popup {
    const container = L.DomUtil.create('div', 'popup-container');
    
    // Título
    const titulo = L.DomUtil.create('h3', 'popup-titulo', container);
    titulo.textContent = ponto.nome;
    
    // Materiais
    const materiaisContainer = L.DomUtil.create('div', 'popup-materiais', container);
    const materiaisTitulo = L.DomUtil.create('strong', '', materiaisContainer);
    materiaisTitulo.textContent = 'Materiais aceitos:';
    
    const materiaisLista = L.DomUtil.create('ul', '', materiaisContainer);
    ponto.materiais.forEach(material => {
      const item = L.DomUtil.create('li', '', materiaisLista);
      item.textContent = material;
    });
    
    // Botões de ação
    const acoesContainer = L.DomUtil.create('div', 'popup-acoes', container);
    
    const btnEditar = L.DomUtil.create('button', 'btn-editar', acoesContainer);
    btnEditar.textContent = 'Editar';
    L.DomEvent.on(btnEditar, 'click', (e) => {
      L.DomEvent.stopPropagation(e);
      this.abrirModalEdicao(ponto);
    });
    
    const btnExcluir = L.DomUtil.create('button', 'btn-excluir', acoesContainer);
    btnExcluir.textContent = 'Excluir';
    L.DomEvent.on(btnExcluir, 'click', (e) => {
      L.DomEvent.stopPropagation(e);
      this.excluirPonto(ponto._id);
    });
    
    return L.popup().setContent(container);
  }

  private limparMarcadores(): void {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  }

  // Métodos para interagir com o componente de cadastro
  abrirModalCadastro(latlng: L.LatLng): void {
    const cadastrarPontoComponent = document.querySelector('app-cadastrar-ponto') as any;
    if (cadastrarPontoComponent) {
      cadastrarPontoComponent.abrirModalParaCriar(latlng);
    }
  }

  abrirModalEdicao(ponto: PontoColeta): void {
    const cadastrarPontoComponent = document.querySelector('app-cadastrar-ponto') as any;
    if (cadastrarPontoComponent) {
      cadastrarPontoComponent.abrirModalParaEditar(ponto);
    }
  }

  excluirPonto(id: string): void {
    if (confirm('Tem certeza que deseja excluir este ponto de coleta?')) {
      this.pontoCrudService.delete(id).subscribe(() => {
        this.carregarPontos();
      });
    }
  }

  // Método chamado quando um ponto é salvo no componente de cadastro
  onPontoSalvo(): void {
    this.carregarPontos();
  }

  // Obter localização atual do usuário
  private obterLocalizacaoUsuario(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Centraliza o mapa na posição do usuário
          this.map.setView([lat, lng], 15);
          
          // Adiciona um marcador na posição do usuário
          if (this.userLocationMarker) {
            this.userLocationMarker.remove();
          }
          
          // Cria um ícone personalizado para a localização do usuário
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="pulse"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          
          this.userLocationMarker = L.marker([lat, lng], { icon: userIcon })
            .addTo(this.map)
            .bindPopup('Você está aqui!')
            .openPopup();
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
        }
      );
    } else {
      console.error('Geolocalização não é suportada por este navegador.');
    }
  }

  // Centralizar mapa na localização do usuário
  centralizarMapa(): void {
    this.obterLocalizacaoUsuario();
  }
}