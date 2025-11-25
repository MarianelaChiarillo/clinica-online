import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import supabase from '../../../../services/supabase.client';

@Component({
  selector: 'app-rechazar-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rechazar-turno-modal.component.html',
  styleUrls: ['./rechazar-turno-modal.component.scss']
})
export class RechazarTurnoModalComponent {
  @Input() turno!: any;
  @Output() cerrar = new EventEmitter<boolean>();
  @Input() isOpen: boolean = false; 

  motivo: string = '';
  saving = false;
  error: string | null = null;

  cerrarModal() {
    this.cerrar.emit(false);   // solo cerrar modal
  }

  async confirmarRechazo() {
    if (!this.motivo.trim()) {
      this.error = 'Ingresá el motivo del rechazo.';
      return;
    }

    this.saving = true;
    this.error = null;

    try {
      const { data, error } = await supabase
        .from('turnos')
        .update({
          estado: 'rechazado',
          comentario_rechazo: this.motivo
        })
        .eq('id', this.turno.id)
        .select()
        .single();

      if (error) {
        this.error = error.message;
        return;
      }

      // éxito → cerrar modal indicando "true"
      this.cerrar.emit(true);

    } catch (err: any) {
      this.error = err.message || 'Error inesperado';
    } finally {
      this.saving = false;
    }
  }
}
