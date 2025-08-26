import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MapaColetaComponent } from './pages/mapa-coleta/mapa-coleta.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'rota', component: MapaColetaComponent }
];
