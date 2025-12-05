import { Component } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss',
  animations: [
    trigger('fadeInOut', [
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      state('hidden', style({ opacity: 0, transform: 'translateY(-20px)' })),
      transition('hidden => visible', animate('400ms ease-out')),
      transition('visible => hidden', animate('300ms ease-in'))
    ])
  ]
})
export class RegistroComponent {
  fadeState = 'hidden'; // inicio oculto

  constructor(public router: Router, public route: ActivatedRoute) {}

  ngOnInit() {
    // Activamos la animación al cargar el componente
    setTimeout(() => {
      this.fadeState = 'visible';
    }, 50);
  }

  public get estaEnFormulario(): boolean {
    const rutaActual = this.router.url;
    return (
      rutaActual.includes('/registro/paciente') ||
      rutaActual.includes('/registro/especialista') ||
      rutaActual.includes('/registro/admin')
    );
  }
}
