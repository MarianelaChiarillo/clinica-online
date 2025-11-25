import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import supabase from '../../../../services/supabase.client';

@Component({
  selector: 'app-calificar-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calificar-turno-modal.component.html',
  styleUrls: ['./calificar-turno-modal.component.scss']
})
export class CalificarTurnoModalComponent {
  @Input() turno!: any;
  @Output() cerrar = new EventEmitter<boolean>();
  @Input() isOpen: boolean = false;  // 🔥 AGREGAR ESTO

  comentario: string = '';
  calificacion: number | null = null; // 1..5
  saving = false;
  error: string | null = null;

  cerrarModal() {
    this.cerrar.emit(false);   // cerrar sin guardar
  }

  async confirmarCalificar() {
    if (!this.calificacion || this.calificacion < 1 || this.calificacion > 5) {
      this.error = 'Ingresá una calificación entre 1 y 5.';
      return;
    }

    this.saving = true;
    this.error = null;

    try {
      const { data, error } = await supabase
        .from('turnos')
        .update({
          calificacion_atencion: this.calificacion,
          comentario_calificacion: this.comentario
        })
        .eq('id', this.turno.id)
        .select()
        .single();

      if (error) {
        this.error = error.message;
        return;
      }

      // éxito → cerrar modal
      this.cerrar.emit(true);

    } catch (err: any) {
      this.error = err.message || 'Error inesperado';
    } finally {
      this.saving = false;
    }
  }
}

