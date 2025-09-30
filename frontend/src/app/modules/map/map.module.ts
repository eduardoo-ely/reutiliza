import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MapRoutingModule } from './map-routing.module';
import { MapViewComponent } from './pages/map-view/map-view.component';
import { MapaColetaComponent } from './pages/mapa-coleta/mapa-coleta.component';
import { CadastrarPontoComponent } from './components/cadastrar-ponto/cadastrar-ponto.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    MapRoutingModule,
    ReactiveFormsModule,
    MapViewComponent,
    MapaColetaComponent,
    CadastrarPontoComponent
  ]
})
export class MapModule { }