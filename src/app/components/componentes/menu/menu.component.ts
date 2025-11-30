import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../spinner/spinner.component';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2'; 
import { Usuario } from '../../../models/user-data';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [SpinnerComponent, CommonModule, RouterLink, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent implements OnInit, OnDestroy {
  cargando: boolean = false;
  logueado: boolean = false;
  rolUsuario: 'paciente' | 'especialista' | 'administrador' | null = null;
  
  private suscripcionAuth!: Subscription;

  constructor(
    private router: Router,
    private servicioAuth: AuthService
  ) {}

  ngOnInit() {
    this.suscripcionAuth = this.servicioAuth.usuarioActual$.subscribe(
      (usuario) => {
        this.logueado = !!usuario;
        this.obtenerRol();
        console.log('Estado de autenticación:', this.logueado);
      }
    );
    this.obtenerRol();
  }

  ngOnDestroy() {
    if (this.suscripcionAuth) {
      this.suscripcionAuth.unsubscribe();
    }
  }

  private obtenerRol(): void {
    const usuarioJson = localStorage.getItem('usuario');
    
    if (this.logueado && usuarioJson) {
      try {
        const usuario: Usuario = JSON.parse(usuarioJson);
        this.rolUsuario = usuario.tipo_usuario as 'paciente' | 'especialista' | 'administrador';
      } catch (e) {
        console.error('Error al parsear datos de usuario desde localStorage', e);
        this.rolUsuario = null;
      }
    } else {
      this.rolUsuario = null;
    }
    console.log('Rol de usuario:', this.rolUsuario);
  }

  async cerrarSesion() {
    const resultado = await Swal.fire({
      title: '<span class="text">¿Querés cerrar sesión?</span>',
      html: '<span class="text">Vas a salir y volver al inicio</span>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      confirmButtonColor: 'rgba(51, 130, 221, 1)',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#d33',
      customClass: {
        confirmButton: 'text',
        cancelButton: 'text',
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown',
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp',
      },
    });

    if (resultado.isConfirmed) {
      this.cargando = true;
      try {
        await this.servicioAuth.cerrarSesion();
        this.rolUsuario = null; 
        localStorage.removeItem('usuario'); 
        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        Swal.fire('Error', 'No se pudo cerrar sesión', 'error');
      } finally {
        this.cargando = false;
      }
    }
  }

  navegarALogin() {
    this.router.navigate(['/login']);
  }

  navegarARegistro() {
    this.router.navigate(['/registro']);
  }
}