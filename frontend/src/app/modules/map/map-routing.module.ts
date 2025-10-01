import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapaColetaComponent } from './pages/mapa-coleta/mapa-coleta.component';

const routes: Routes = [
  { path: '', component: MapaColetaComponent },
  { path: 'coleta', component: MapaColetaComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MapRoutingModule { }