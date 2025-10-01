import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MapRoutingModule } from './map-routing.module';
import { MapaColetaComponent } from './pages/mapa-coleta/mapa-coleta.component';
import { CadastrarPontoComponent } from './components/cadastrar-ponto/cadastrar-ponto.component';
import {RegistrarMaterialComponent} from "./components/registrar-material/registrar-material.component";

@NgModule({
  imports: [
    CommonModule,
    MapRoutingModule,
    ReactiveFormsModule,
    RegistrarMaterialComponent,
    CadastrarPontoComponent,
    MapaColetaComponent
  ]
})
export class MapModule { }