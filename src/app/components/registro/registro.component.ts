import { Component } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss',
})
export class RegistroComponent {
  constructor(public router: Router, public route: ActivatedRoute) {}

  public get estaEnFormulario(): boolean {
    const rutaActual = this.router.url;
    return (
      rutaActual.includes('/registro/paciente') ||
      rutaActual.includes('/registro/especialista') ||
      rutaActual.includes('/registro/admin')
    );
  }
  
}
