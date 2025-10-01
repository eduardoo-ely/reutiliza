import { Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/pages/login/login.component';
import { MapaColetaComponent } from './modules/map/pages/mapa-coleta/mapa-coleta.component';
import { PerfilComponent } from './modules/profile/pages/perfil/perfil.component';
import { ValidacaoCruzadaComponent } from './modules/validacao/validacao-cruzada/validacao-cruzada.component';
import { ValidacaoAdminComponent } from './modules/admin/validacao-admin/validacao-admin.component';
import { PontosUsuarioComponent } from './modules/usuario/pontos-usuario/pontos-usuario.component';
import { RecompensasListaComponent } from './modules/recompensas/recompensas-lista/recompensas-lista.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'rota', component: MapaColetaComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: 'recompensas', component: RecompensasListaComponent },
  { path: 'validacao-cruzada', component: ValidacaoCruzadaComponent },
  { path: 'validacao-admin', component: ValidacaoAdminComponent },
  { path: 'pontos', component: PontosUsuarioComponent },
  { path: '**', redirectTo: '' }
];
