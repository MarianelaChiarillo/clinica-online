import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-layout',
  imports: [],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  @Input() titulo = '';
  @Input() tituloClase = '';
  @Input() tamano: 'pequeno' | 'mediano' | 'grande' | 'registro' | 'completo' = 'mediano';
  @Input() sinMargen = false;
}