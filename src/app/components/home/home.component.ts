import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MenuComponent } from '../componentes/menu/menu.component';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MenuComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  cargando = true;
  usuario: any;

  constructor(
    private router: Router,
    private autenticacionService: AuthService,
    private usuarioService: UsuarioService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.autenticacionService.getUsuarioActual();

      if (!user) {
        this.router.navigate(['/home/bienvenida']);
        return;
      }

      const resp = await this.usuarioService.obtenerPorAuthId(user.id);
      if (resp && resp.data) {
        this.usuario = resp.data;

        const tipo = this.usuario.tipo_usuario;
        this.router.navigate([`/home/${tipo}`]);
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
