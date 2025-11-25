import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-aceptar-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aceptar-turno-modal.component.html',
  styleUrls: ['./aceptar-turno-modal.component.scss']
})
export class AceptarTurnoModalComponent {

  @Input() turno: any = null;
  @Input() isOpen: boolean = false;

  @Output() cerrar = new EventEmitter<void>();
  @Output() aceptar = new EventEmitter<any>(); // acá devolvemos el turno aceptado

  confirmarAceptar() {
    this.aceptar.emit(this.turno);
  }

  cerrarModal() {
    this.cerrar.emit();
  }
}
