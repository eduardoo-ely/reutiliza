import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { PontoService } from '../../../../core/services/ponto.service';
import { PontoColeta } from '../../../../models/ponto-coleta.model';
import { CadastrarPontoComponent } from '../../components/cadastrar-ponto/cadastrar-ponto.component';
import { RegistrarMaterialComponent } from '../../components/registrar-material/registrar-material.component';

interface MaterialComIcone {
  nome: string;
  icone: string;
}

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
  routingControl: any = null;

  // Materiais obtidos dinamicamente do banco
  materiaisDisponiveis: MaterialComIcone[] = [];
  materiaisUnicos = new Set<string>();
  materialSelecionado: string = '';

  menuAberto = false;

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

  mostrarModalRegistro = false;
  pontoSelecionado: PontoColeta | null = null;

  constructor(private pontoService: PontoService) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.inicializarMapa(), 100);
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

    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView(this.userLocation, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.userMarker = L.marker(this.userLocation, { icon: this.userIcon })
        .bindPopup('<div style="text-align: center; font-weight: 600;">📍 Você está aqui!</div>')
        .addTo(this.map);

    this.markersLayer.addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.cadastrarPontoComp) {
        this.cadastrarPontoComp.abrirModalParaCriar(e.latlng);
      }
    });

    if (this.cadastrarPontoComp) {
      this.cadastrarPontoComp.pontoSalvo.subscribe(() => {
        console.log('🔄 Ponto salvo, recarregando mapa...');
        this.carregarPontos();
      });
    }

    this.carregarPontos();
  }

  recenterMap(): void {
    if (this.map && this.userLocation) {
      this.map.flyTo(this.userLocation, 15, { duration: 1 });
      console.log('🎯 Mapa centralizado');
    }
  }

  carregarPontos(): void {
    console.log('🗺️ Iniciando carregamento de pontos de coleta...');

    this.pontoService.getAll().subscribe({
      next: (data: PontoColeta[]) => {
        console.log(`✅ ${data.length} pontos recebidos do servidor`);

        if (!Array.isArray(data)) {
          console.error('❌ Resposta não é um array:', data);
          this.pontos = [];
          return;
        }

        this.pontos = data;

        // EXTRAIR MATERIAIS ÚNICOS DOS PONTOS
        this.materiaisUnicos.clear();
        this.pontos.forEach(ponto => {
          if (ponto.materiais && Array.isArray(ponto.materiais)) {
            ponto.materiais.forEach(material => {
              this.materiaisUnicos.add(material);
            });
          }
        });

        // CRIAR LISTA DE MATERIAIS COM ÍCONES
        this.materiaisDisponiveis = this.obterMateriaisComIcones();

        console.log('📦 Materiais únicos encontrados:', Array.from(this.materiaisUnicos));
        console.log('🎨 Materiais com ícones:', this.materiaisDisponiveis);

        if (this.pontos.length === 0) {
          console.warn('⚠️ Nenhum ponto de coleta encontrado no banco!');
          alert('⚠️ Nenhum ponto de coleta encontrado.\n\nExecute: cd backend && node seed.js');
        } else {
          this.renderizarPontos();
        }
      },
      error: (err) => {
        console.error('❌ Erro ao carregar pontos:', err);

        if (err.status === 0) {
          alert('❌ Backend não está rodando!\n\nInicie o servidor: cd backend && npm start');
        } else if (err.status === 404) {
          alert('❌ Rota /api/pontos não encontrada.\n\nVerifique o backend.');
        } else {
          alert(`❌ Erro ao carregar pontos:\n\n${err.message}`);
        }

        this.pontos = [];
      }
    });
  }

  // FUNÇÃO PARA OBTER MATERIAIS COM ÍCONES
  private obterMateriaisComIcones(): Array<{nome: string, icone: string}> {
    const iconesMap: { [key: string]: string } = {
      'Papel': '📄',
      'Papel e Papelão': '📄',
      'Plástico': '🥤',
      'Vidro': '🍾',
      'Metal': '🔩',
      'Metais e Ferros': '🔩',
      'Eletroeletrônicos': '📱',
      'Óleo de Cozinha': '🛢️',
      'Móveis': '🪑',
      'Pneus': '🚗',
      'Outros': '♻️'
    };

    return Array.from(this.materiaisUnicos)
        .map(material => ({
          nome: material,
          icone: iconesMap[material] || '♻️'
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  private renderizarPontos(): void {
    console.log('🎨 Limpando marcadores antigos...');
    this.markersLayer.clearLayers();

    console.log(`🎨 Renderizando ${this.pontos.length} marcadores...`);

    this.pontos.forEach((ponto, index) => {
      console.log(`   ${index + 1}. ${ponto.nome} (${ponto.latitude}, ${ponto.longitude})`);

      if (!ponto.latitude || !ponto.longitude) {
        console.warn(`⚠️ Ponto "${ponto.nome}" sem coordenadas válidas`);
        return;
      }

      // Criar lista de materiais com ícones
      const materiaisFormatados = ponto.materiais
          ?.map(m => {
            const materialObj = this.materiaisDisponiveis.find(mat => mat.nome === m);
            return materialObj ? `${materialObj.icone} ${m}` : m;
          })
          .join('<br>') || 'Não informado';

      const popupContent = `
        <div style="min-width: 250px; font-family: 'Inter', sans-serif;">
          <h3 style="margin: 0 0 12px 0; color: #2E7D32; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px;">
            ${ponto.nome}
          </h3>
          
          <div style="margin-bottom: 10px;">
            <strong style="color: #616161;">📍 Endereço:</strong>
            <p style="margin: 4px 0 0 0; color: #333;">${ponto.endereco || 'Não informado'}</p>
          </div>
          
          <div style="margin-bottom: 10px;">
            <strong style="color: #616161;">♻️ Materiais aceitos:</strong>
            <p style="margin: 4px 0 0 0; color: #333; line-height: 1.6;">${materiaisFormatados}</p>
          </div>
          
          <div style="margin-bottom: 10px;">
            <strong style="color: #616161;">🕒 Horário:</strong>
            <p style="margin: 4px 0 0 0; color: #333;">${ponto.horarioFuncionamento || 'Não informado'}</p>
          </div>
          
          ${ponto.telefone ? `
            <div style="margin-bottom: 10px;">
              <strong style="color: #616161;">📞 Telefone:</strong>
              <p style="margin: 4px 0 0 0; color: #333;">${ponto.telefone}</p>
            </div>
          ` : ''}
          
          ${ponto.email ? `
            <div style="margin-bottom: 10px;">
              <strong style="color: #616161;">📧 Email:</strong>
              <p style="margin: 4px 0 0 0; color: #333;">${ponto.email}</p>
            </div>
          ` : ''}
          
          <button
            onclick="window.registrarMaterialNoPonto('${ponto._id}')"
            style="
              width: 100%;
              margin-top: 12px;
              padding: 12px;
              background: linear-gradient(135deg, #2E7D32, #388E3C);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              font-size: 15px;
              box-shadow: 0 2px 8px rgba(46, 125, 50, 0.3);
              transition: all 0.2s;
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(46, 125, 50, 0.4)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(46, 125, 50, 0.3)';"
          >
            ♻️ Registrar Material Aqui
          </button>
        </div>
      `;

      try {
        const marker = L.marker([ponto.latitude, ponto.longitude], { icon: this.pontoIcon })
            .bindPopup(popupContent, { maxWidth: 300 })
            .on('dblclick', () => {
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

    (window as any).registrarMaterialNoPonto = (pontoId: string) => {
      this.abrirModalRegistroMaterial(pontoId);
    };
  }

  abrirModalRegistroMaterial(pontoId: string): void {
    const ponto = this.pontos.find(p => p._id === pontoId);
    if (!ponto) {
      console.error('❌ Ponto não encontrado:', pontoId);
      return;
    }

    console.log('📝 Abrindo modal de registro para:', ponto.nome);
    this.pontoSelecionado = ponto;
    this.mostrarModalRegistro = true;
    this.map.closePopup();
  }

  fecharModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.pontoSelecionado = null;
  }

  onMaterialRegistrado(material: any): void {
    console.log('✅ Material registrado no componente pai:', material);
  }

  // NOVA FUNÇÃO: Selecionar material e traçar rota
  selecionarMaterial(material: MaterialComIcone): void {
    console.log('🎯 Material selecionado:', material.nome);
    this.materialSelecionado = material.nome;
    this.tracarRotaParaMaterial(material.nome);
  }

  tracarRotaParaMaterial(material: string): void {
    if (!this.userLocation) {
      console.error('❌ Localização do usuário não disponível');
      return;
    }

    console.log('🔍 Buscando pontos que aceitam:', material);

    const candidatos = this.pontos.filter(p =>
        p.materiais?.some(m =>
            m.toLowerCase().includes(material.toLowerCase()) ||
            material.toLowerCase().includes(m.toLowerCase())
        )
    );

    console.log(`   ✅ ${candidatos.length} pontos encontrados`);

    if (!candidatos.length) {
      alert(`❌ Nenhum ponto de coleta encontrado para "${material}"\n\nTente outro material.`);
      this.materialSelecionado = '';
      return;
    }

    // Encontrar o ponto mais próximo
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

    console.log('🎯 Ponto mais próximo:', destino.nome);
    console.log('📏 Distância:', (menorDistancia / 1000).toFixed(2), 'km');

    this.tracarRotaParaPonto(destino);
  }

  tracarRotaParaPonto(ponto: PontoColeta): void {
    if (!this.userLocation) return;

    const destinoLatLng = L.latLng(ponto.latitude, ponto.longitude);

    // Remover rota anterior
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }

    console.log('🛣️ Traçando rota para:', ponto.nome);

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

    // Ajustar zoom para mostrar toda a rota
    setTimeout(() => {
      const bounds = L.latLngBounds([this.userLocation, destinoLatLng]);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }, 500);

    console.log('✅ Rota traçada com sucesso!');
  }

  limparRota(): void {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
      this.materialSelecionado = '';
      console.log('🧹 Rota limpa');

      // Recentralizar no usuário
      this.recenterMap();
    }
  }

  toggleMenu(): void {
    this.menuAberto = !this.menuAberto;
    console.log(this.menuAberto ? '📂 Menu aberto' : '📁 Menu fechado');
  }

  onClickReutiliza(): void {
    console.log('🔍 ReUtiliza clicado!');

    // Fechar popup se aberto
    this.map.closePopup();

    // Recentralizar mapa
    this.recenterMap();
  }
}