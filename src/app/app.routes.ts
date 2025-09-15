import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MapaColetaComponent } from './pages/mapa-coleta/mapa-coleta.component';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { RecompensasComponent } from './pages/recompensas/recompensas.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'rota', component: MapaColetaComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: 'recompensas', component: RecompensasComponent },
  { path: '**', redirectTo: '' }
];
