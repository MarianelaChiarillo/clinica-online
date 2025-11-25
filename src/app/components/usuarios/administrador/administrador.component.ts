import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { LayoutComponent } from '../../componentes/layout/layout.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { UsuarioService } from '../../../services/usuarios/usuario.service';
import { EspecialistaService } from '../../../services/usuarios/especialista.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-administrador',
  standalone: true,
  imports: [CommonModule, MenuComponent, LayoutComponent, SpinnerComponent, MensajeComponent],
  templateUrl: './administrador.component.html',
  styleUrls: ['./administrador.component.scss'],
})
export class AdministradorComponente implements OnInit {
  usuarios: any[] = [];
  cargando = false;
  mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;

  constructor(
    private usuarioSrv: UsuarioService,
    private especialistaSrv: EspecialistaService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    await this.cargarUsuarios();
    this.cargando = false;
  }

  async cargarUsuarios(): Promise<void> {
    try {
      this.usuarios = await this.usuarioSrv.obtenerTodos();
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      this.mostrarMensaje('Error', 'No se pudieron cargar los usuarios.', 'error');
    }
  }
  irARegistroAdmin() {
    this.router.navigate(['registro/admin']);
  }

  async toggleEstado(usuario: any): Promise<void> {
    if (usuario.tipo_usuario !== 'especialista') return;

    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';

    try {
      await this.especialistaSrv.actualizarEstadoYEspecialidades(usuario.auth_id, nuevoEstado);
      usuario.estado = nuevoEstado;

      this.mostrarMensaje(
        'Actualizado',
        `El especialista ${usuario.nombre ?? ''} ${
          usuario.apellido ?? ''
        } ahora está ${nuevoEstado}.`,
        'success'
      );
    } catch (error) {
      console.error(error);
      this.mostrarMensaje('Error', 'No se pudo actualizar el estado del especialista.', 'error');
    }
  }

  mostrarMensaje(titulo: string, texto: string, tipo: 'error' | 'success' | 'info') {
    this.mensaje = { titulo, texto, tipo };
    setTimeout(() => (this.mensaje = null), 4000);
  }

  verturnos() {

    this.router.navigate(['/turnos/administrador']);
  }
}
