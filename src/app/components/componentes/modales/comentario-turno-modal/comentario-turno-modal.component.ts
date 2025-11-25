import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-comentario-turno-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comentario-turno-modal.component.html',
  styleUrls: ['./comentario-turno-modal.component.scss']
})
export class ComentarioTurnoModalComponent {

  @Input() turno!: any;
  @Input() isOpen: boolean = false;  // 🔥 AGREGAR ESTO

  // Único output que usa el componente padre
  @Output() cerrar = new EventEmitter<boolean>();

  cerrarModal() {
    this.cerrar.emit(false); // solo cierra
  }
}
