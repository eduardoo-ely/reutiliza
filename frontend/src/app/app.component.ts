import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { RegistrarMaterialComponent } from './modules/map/components/registrar-material/registrar-material.component';
import { ValidacaoCruzadaComponent } from './modules/validacao/validacao-cruzada/validacao-cruzada.component';
import { ValidacaoAdminComponent } from './modules/admin/validacao-admin/validacao-admin.component';
import { PontosUsuarioComponent } from './modules/usuario/pontos-usuario/pontos-usuario.component';
import { RecompensasListaComponent } from './modules/recompensas/recompensas-lista/recompensas-lista.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    CommonModule, 
    NavigationComponent,
    RegistrarMaterialComponent,
    ValidacaoCruzadaComponent,
    ValidacaoAdminComponent,
    PontosUsuarioComponent,
    RecompensasListaComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'reutiliza';
  showNavigation = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.showNavigation = event.urlAfterRedirects !== '/';
    });
  }
}
