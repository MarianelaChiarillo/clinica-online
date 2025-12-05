import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-administrador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './administrador.component.html',
  styleUrls: ['./administrador.component.scss'],
  animations: [
  trigger('fadeSlide', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(10px)' }),
      animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
    ]),
    transition(':leave', [
      animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(5px)' }))
    ])
  ])
]
 
})
export class AdministradorComponent {
  constructor(private router: Router) {}

   mostrarContenido = false;

  ngOnInit() {
    // Muestra el contenido suavemente al cargar
    setTimeout(() => this.mostrarContenido = true, 0);
  }

  ocultarContenido() {
    this.mostrarContenido = false;
  }
}
