import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filtro-general',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filtro-general.component.html',
  styleUrls: ['./filtro-general.component.scss'],
})
export class FiltroGeneralComponent {
  @Input() placeholder: string = 'Buscar...'; // 👈 propiedad esperada en el HTML
  @Output() filtroChange = new EventEmitter<string>(); // 👈 emite texto, no evento

  textoFiltro: string = '';

  onInputChange(event: Event) {
    const valor = (event.target as HTMLInputElement).value; // convertir Event → string
    this.filtroChange.emit(valor); // emite el texto, no el evento entero
  }

  limpiarFiltro() {
    this.textoFiltro = '';
    this.filtroChange.emit(''); // limpia el filtro
  }
}
