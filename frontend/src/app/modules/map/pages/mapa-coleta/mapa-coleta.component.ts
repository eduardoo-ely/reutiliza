import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { PontoService } from '../../../../core/services/ponto.service';
import { PontoColeta } from '../../../../models/ponto-coleta.model';
import { CadastrarPontoComponent } from '../../components/cadastrar-ponto/cadastrar-ponto.component';
import { RegistrarMaterialComponent } from '../../components/registrar-material/registrar-material.component';

@Component({
  selector: 'app-mapa-coleta',
  standalone: true,
  imports: [CommonModule, CadastrarPontoComponent, RegistrarMaterialComponent],
  templateUrl: './mapa-coleta.component.html',
  styleUrls: ['./mapa-coleta.component.css']
})
export class MapaColetaComponent implements AfterViewInit {
  @ViewChild(CadastrarPontoComponent) cadastrarPontoComp!: CadastrarPontoComponent;
  @ViewChild(RegistrarMaterialComponent) registrarMaterialComp!: RegistrarMaterialComponent;

  map!: L.Map;
  markersLayer: L.LayerGroup = L.layerGroup();
  pontos: PontoColeta[] = [];
  userLocation!: L.LatLng;
  userMarker!: L.Marker;
  private routingControl: any = null;

  materiaisDisponiveis = [
    'Eletroeletrônicos',
    'Móveis',
    'Vidros',
    'Óleo de Cozinha',
    'Pneus',
    'Metais e Ferros',
    'Papel e Papelão'
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

  // Controle de modal de registro
  mostrarModalRegistro = false;
  pontoSelecionado: PontoColeta | null = null;

  constructor(private pontoService: PontoService) {}

  ngAfterViewInit(): void {
    // Delay para garantir que ViewChild está disponível
    setTimeout(() => this.inicializarMapa(), 100);
  }

  inicializarMapa(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          pos => this.criarMapa(pos.coords.latitude, pos.coords.longitude),
          () => this.criarMapa(-27.1004, -52.6152) // Chapecó como fallback
      );
    } else {
      this.criarMapa(-27.1004, -52.6152);
    }
  }

  private criarMapa(lat: number, lng: number): void {
    this.userLocation = L.latLng(lat, lng);

    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView(this.userLocation, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Marcador do usuário
    this.userMarker = L.marker(this.userLocation, { icon: this.userIcon })
        .bindPopup('📍 Você está aqui!')
        .addTo(this.map);

    this.markersLayer.addTo(this.map);

    // Event: Clique no mapa para criar novo ponto (admin)
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.cadastrarPontoComp) {
        this.cadastrarPontoComp.abrirModalParaCriar(e.latlng);
      }
    });

    // Recarregar pontos ao salvar
    if (this.cadastrarPontoComp) {
      this.cadastrarPontoComp.pontoSalvo.subscribe(() => {
        console.log('🔄 Ponto salvo, recarregando mapa...');
        this.carregarPontos();
      });
    }

    // Carregar pontos do banco
    this.carregarPontos();
  }

  recenterMap(): void {
    if (this.map && this.userLocation) {
      this.map.flyTo(this.userLocation, 15, {
        duration: 1
      });
    }
  }

  carregarPontos(): void {
    console.log('🗺️ Iniciando carregamento de pontos de coleta...');

    this.pontoService.getAll().subscribe({
      next: (data: PontoColeta[]) => {
        console.log(`✅ ${data.length} pontos recebidos do servidor`);
        console.log('📍 Dados:', data);

        // Garantir que data é um array
        if (!Array.isArray(data)) {
          console.error('❌ Resposta não é um array:', data);
          this.pontos = [];
          return;
        }

        this.pontos = data;

        if (this.pontos.length === 0) {
          console.warn('⚠️ Nenhum ponto de coleta encontrado no banco!');
          console.warn('💡 Execute: cd backend && node seed-pontos.js');
          alert('Nenhum ponto de coleta encontrado. Execute seed-pontos.js no backend.');
        } else {
          console.log(`🎯 Renderizando ${this.pontos.length} pontos no mapa...`);
          this.renderizarPontos();
        }
      },
      error: (err) => {
        console.error('❌ Erro ao carregar pontos:', err);
        console.error('❌ Status:', err.status);
        console.error('❌ Mensagem:', err.message);
        console.error('❌ URL tentada:', err.url);

        // Mensagem amigável baseada no erro
        if (err.status === 0) {
          alert('❌ Backend não está rodando! Inicie o servidor backend.');
        } else if (err.status === 404) {
          alert('❌ Rota /api/pontos não encontrada. Verifique o backend.');
        } else if (err.status === 500) {
          alert('❌ Erro no servidor. Verifique os logs do backend.');
        } else {
          alert(`❌ Erro ao carregar pontos: ${err.message}`);
        }

        this.pontos = [];
      }
    });
  }

  private renderizarPontos(): void {
    console.log('🎨 Limpando marcadores antigos...');
    this.markersLayer.clearLayers();

    console.log(`🎨 Renderizando ${this.pontos.length} marcadores...`);

    this.pontos.forEach((ponto, index) => {
      console.log(`   ${index + 1}. ${ponto.nome} (${ponto.latitude}, ${ponto.longitude})`);

      // Validar coordenadas
      if (!ponto.latitude || !ponto.longitude) {
        console.warn(`⚠️ Ponto "${ponto.nome}" sem coordenadas válidas`);
        return;
      }

      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 10px 0; color: #2E7D32;">${ponto.nome}</h3>
          <p style="margin: 5px 0;"><strong>📍 Endereço:</strong><br>${ponto.endereco || 'Não informado'}</p>
          <p style="margin: 5px 0;"><strong>♻️ Materiais:</strong><br>${ponto.materiais?.join(', ') || 'Não informado'}</p>
          <p style="margin: 5px 0;"><strong>🕒 Horário:</strong><br>${ponto.horarioFuncionamento || 'Não informado'}</p>
          ${ponto.telefone ? `<p style="margin: 5px 0;"><strong>📞 Telefone:</strong><br>${ponto.telefone}</p>` : ''}
          ${ponto.email ? `<p style="margin: 5px 0;"><strong>📧 Email:</strong><br>${ponto.email}</p>` : ''}
          <button
            onclick="window.registrarMaterialNoPonto('${ponto._id}')"
            style="
              width: 100%;
              margin-top: 10px;
              padding: 8px;
              background-color: #2E7D32;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 600;
            "
          >
            ♻️ Registrar Material Aqui
          </button>
        </div>
      `;

      try {
        const marker = L.marker([ponto.latitude, ponto.longitude], { icon: this.pontoIcon })
            .bindPopup(popupContent)
            .on('dblclick', () => {
              // Duplo clique para editar (admin)
              if (this.cadastrarPontoComp) {
                this.cadastrarPontoComp.abrirModalParaEditar(ponto);
              }
            });

        marker.addTo(this.markersLayer);
      } catch (error) {
        console.error(`❌ Erro ao criar marcador para "${ponto.nome}":`, error);
      }
    });

    console.log('✅ Renderização concluída!');

    // Expor função global para o botão do popup
    (window as any).registrarMaterialNoPonto = (pontoId: string) => {
      this.abrirModalRegistroMaterial(pontoId);
    };
  }

  abrirModalRegistroMaterial(pontoId: string): void {
    const ponto = this.pontos.find(p => p._id === pontoId);
    if (!ponto) {
      console.error('Ponto não encontrado:', pontoId);
      return;
    }

    console.log('📝 Abrindo modal de registro para:', ponto.nome);
    this.pontoSelecionado = ponto;
    this.mostrarModalRegistro = true;

    // Fechar popup do mapa
    this.map.closePopup();
  }

  fecharModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.pontoSelecionado = null;
  }

  onMaterialRegistrado(material: any): void {
    console.log('✅ Material registrado no componente pai:', material);
  }

  tracarRotaParaMaterial(material: string): void {
    if (!this.userLocation) return;

    const candidatos = this.pontos.filter(p => p.materiais?.includes(material));

    if (!candidatos.length) {
      alert(`Nenhum ponto de coleta encontrado para "${material}"`);
      return;
    }

    // Escolher o mais próximo
    let destino = candidatos[0];
    let menorDistancia = this.userLocation.distanceTo(
        L.latLng(destino.latitude, destino.longitude)
    );

    candidatos.forEach(p => {
      const dist = this.userLocation.distanceTo(L.latLng(p.latitude, p.longitude));
      if (dist < menorDistancia) {
        menorDistancia = dist;
        destino = p;
      }
    });

    this.tracarRotaParaPonto(destino);
  }

  tracarRotaParaPonto(ponto: PontoColeta): void {
    if (!this.userLocation) return;

    const destinoLatLng = L.latLng(ponto.latitude, ponto.longitude);

    // Remover rota anterior se existir
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

    // Zoom para mostrar toda a rota
    setTimeout(() => {
      const bounds = L.latLngBounds([this.userLocation, destinoLatLng]);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }, 500);
  }

  limparRota(): void {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
      console.log('🧹 Rota limpa');
    }
  }

  onClickReutiliza(): void {
    console.log('🔍 ReUtiliza clicado!');
  }
}