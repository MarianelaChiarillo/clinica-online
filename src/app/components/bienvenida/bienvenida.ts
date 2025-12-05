import { Component } from '@angular/core';
import { MenuComponent } from '../componentes/menu/menu.component';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-bienvenida',
  imports: [MenuComponent],
  templateUrl: './bienvenida.html',
  styleUrl: './bienvenida.scss',
   animations: [
    trigger('slideInLeft', [
      state('hidden', style({ transform: 'translateX(-100%)', opacity: 0 })),
      state('visible', style({ transform: 'translateX(0)', opacity: 1 })),
      transition('hidden => visible', animate('500ms ease-out')),
      transition('visible => hidden', animate('300ms ease-in'))
    ])
  ]
})
export class Bienvenida {
 slideState = 'hidden';

  ngOnInit() {
    setTimeout(() => {
      this.slideState = 'visible';
    }, 50);
  }
}
