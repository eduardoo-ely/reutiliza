import { Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/pages/login/login.component';
import { MapaColetaComponent } from './modules/auth/pages/mapa-coleta/mapa-coleta.component';
import { PerfilComponent } from './modules/auth/pages/perfil/perfil.component';
import { RecompensasComponent } from './modules/auth/pages/recompensas/recompensas.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'rota', component: MapaColetaComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: 'recompensas', component: RecompensasComponent },
  { path: '**', redirectTo: '' }
];
