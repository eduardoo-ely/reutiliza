import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapViewComponent } from './pages/map-view/map-view.component';
import { MapaColetaComponent } from './pages/mapa-coleta/mapa-coleta.component';

const routes: Routes = [
  { path: '', loadChildren: () => import('./pages/map-view/map-view.component').then(m => m.MapViewComponent) },
  { path: 'coleta', component: MapaColetaComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MapRoutingModule { }