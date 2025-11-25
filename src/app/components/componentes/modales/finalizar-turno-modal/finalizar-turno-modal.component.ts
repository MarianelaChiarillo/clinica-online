import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import supabase from '../../../../services/supabase.client';

@Component({
  selector: 'app-finalizar-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finalizar-turno-modal.component.html',
  styleUrls: ['./finalizar-turno-modal.component.scss']
})
export class FinalizarTurnoModalComponent {

  @Input() turno!: any;

  // ÚNICO output para cerrar modal
  @Output() cerrar = new EventEmitter<boolean>();

  // Para avisar al padre que guardó correctamente
  @Output() saved = new EventEmitter<any>();
  @Input() isOpen: boolean = false;  // 🔥 AGREGAR ESTO

  resenia: string = '';
  crearEncuesta = false;
  encuestaRespuestas: any = { p1: '', p2: '', p3: '', observaciones: '' };

  saving = false;
  error: string | null = null;

  cerrarModal() {
    this.cerrar.emit(false); // solo cierra sin acción
  }

  async confirmarFinalizar() {

    if (!this.resenia.trim() && !this.crearEncuesta) {
      this.error = 'Agregá una reseña o marcá que crearás encuesta.';
      return;
    }

    this.saving = true; 
    this.error = null;

    let encuestaId: number | null = null;

    try {

      // 1️⃣ Crear encuesta si corresponde
      if (this.crearEncuesta) {
        const { data: encData, error: encErr } = await supabase
          .from('encuestas')
          .insert([{
            turno_id: this.turno.id,
            pregunta_1: this.encuestaRespuestas.p1,
            pregunta_2: this.encuestaRespuestas.p2,
            pregunta_3: this.encuestaRespuestas.p3,
            observaciones: this.encuestaRespuestas.observaciones
          }])
          .select()
          .single();

        if (encErr) { 
          this.error = encErr.message; 
          this.saving = false; 
          return; 
        }

        encuestaId = encData.id;
      }

      // 2️⃣ Actualizar turno como "realizado"
      const updateObj: any = { estado: 'realizado' };

      if (this.resenia.trim()) {
        updateObj.resenia_del_especialista = this.resenia;
      }

      if (encuestaId) updateObj.id_encuesta = encuestaId;

      const { data, error } = await supabase
        .from('turnos')
        .update(updateObj)
        .eq('id', this.turno.id)
        .select()
        .single();

      if (error) {
        this.error = error.message;
        return;
      }

      // Notifica al componente padre
      this.saved.emit({ success: true, data });

      // Cierra el modal
      this.cerrar.emit(true);

    } catch (err: any) {
      this.error = err.message || 'Error inesperado';
    } finally {
      this.saving = false;
    }
  }
}
