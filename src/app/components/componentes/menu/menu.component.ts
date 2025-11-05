import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MensajeComponent } from '../mensaje/mensaje.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [MensajeComponent, SpinnerComponent, CommonModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  cargando = false;
  logueado = false;
  mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' | 'confirm' } | null = null;

  constructor(private router: Router) {}


  cerrarSesion() {
    this.mensaje = {
      titulo: '¿Querés cerrar sesión?',
      texto: 'Vas a salir y volver al inicio',
      tipo: 'confirm',
    };
  }

  navegarALogin() {
    this.router.navigate(['/login']);
  }

  navegarARegistro() {
    this.router.navigate(['/registro']);
  }
}

