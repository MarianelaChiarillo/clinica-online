import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import supabase from '../../../../services/supabase.client';

@Component({
  selector: 'app-cancelar-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancelar-turno-modal.component.html',
  styleUrls: ['./cancelar-turno-modal.component.scss']
})
export class CancelarTurnoModalComponent {
  @Input() turno!: any;
  @Output() cerrar = new EventEmitter<boolean>();
  @Input() isOpen: boolean = false;  // 🔥 AGREGAR ESTO

  motivo: string = '';
  saving = false;
  error: string | null = null;

  cerrarModal() {
    this.cerrar.emit(false);   // cerrar sin confirmar
  }

  async confirmarCancelar() {

    if (!this.motivo.trim()) {
      this.error = 'Por favor ingresá el motivo de cancelación.';
      return;
    }

    this.saving = true;
    this.error = null;

    try {
      const { data, error } = await supabase
        .from('turnos')
        .update({
          estado: 'cancelado',
          comentario_cancelacion: this.motivo
        })
        .eq('id', this.turno.id)
        .select()
        .single();

      if (error) {
        this.error = error.message || 'Error al cancelar el turno';
        return;
      }

      this.cerrar.emit(true); // éxito → cerrar modal

    } catch (err: any) {
      this.error = err.message || 'Error inesperado';
    } finally {
      this.saving = false;
    }
  }
}
