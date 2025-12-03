import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MenuComponent } from '../componentes/menu/menu.component';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, MenuComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  cargando = true;
  
  constructor(
    private router: Router,
    private authSrv: AuthService,
    private usuarioSrv: UsuarioService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.authSrv.getUsuarioActual();
      
      if (!user) {
        this.router.navigate(['/home/bienvenida']);
        return;
      }
      
      const resp = await this.usuarioSrv.obtenerPorAuthId(user.id);
      
      if (resp && resp.data) {
        const usuario = resp.data;
        
        switch(usuario.tipo_usuario) {
          case 'paciente':
            this.router.navigate(['/home/paciente']);
            break;
          case 'especialista':
            this.router.navigate(['/home/especialista']);
            break;
          case 'administrador':
            this.router.navigate(['/usuarios']);
            break;
          default:
            this.router.navigate(['/home/bienvenida']);
        }
      } else {
        this.router.navigate(['/home/bienvenida']);
      }
      
    } catch (error) {
      console.error('Error al determinar redirección:', error);
      this.router.navigate(['/home/bienvenida']);
    } finally {
      this.cargando = false;
    }
  }
}