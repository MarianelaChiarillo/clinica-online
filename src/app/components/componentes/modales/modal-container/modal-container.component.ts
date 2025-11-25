import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnosService } from '../../../../services/turnos.service';
import supabase from '../../../../services/supabase.client';
import { ModalService } from '../../../../services/modal.service';
@Component({
  selector: 'app-modal-container',
  standalone: true,  // ← Asegúrate de que esto esté en true
  imports: [CommonModule, FormsModule],  // ← Solo imports de Angular
  templateUrl: './modal-container.html',
})
export class ModalContainerComponent implements OnInit {
  modalData: any = null;
  isOpen = false;

  // Datos del formulario
  comentario: string = '';
  calificacion: number | null = null;
  crearEncuesta = false;
  encuestaRespuestas = { p1: '', p2: '', p3: '', observaciones: '' };
  
  saving = false;
  error: string | null = null;

  constructor(
    private modalService: ModalService,
    private turnosService: TurnosService,

  ) {}

  ngOnInit() {
    this.modalService.modal$.subscribe(data => {
      this.modalData = data;
      this.isOpen = !!data;
      this.resetForm();
    });
  }

  private resetForm() {
    this.comentario = '';
    this.calificacion = null;
    this.crearEncuesta = false;
    this.encuestaRespuestas = { p1: '', p2: '', p3: '', observaciones: '' };
    this.saving = false;
    this.error = null;
  }

  cerrarModal() {
    this.modalService.cerrarModal();
  }

  async confirmarAccion() {
    if (!this.modalData) return;

    try {
      this.saving = true;
      this.error = null;

      switch (this.modalData.tipo) {
        case 'aceptar':
          await this.turnosService.aceptarTurno(this.modalData.turno.id);
          break;
        case 'cancelar':
          if (!this.validarComentario()) return;
          await this.turnosService.cancelarTurno(this.modalData.turno.id, this.comentario);
          break;
        case 'rechazar':
          if (!this.validarComentario()) return;
          await this.turnosService.rechazarTurno(this.modalData.turno.id, this.comentario);
          break;
        case 'finalizar':
          await this.finalizarTurno();
          break;
        case 'calificar':
          if (!this.validarCalificacion()) return;
          await this.turnosService.calificarAtencion(this.modalData.turno.id, this.calificacion!, this.comentario);
          break;
      }

      this.cerrarModal();
      
    } catch (error: any) {
      this.error = error.message || 'Error inesperado';
    } finally {
      this.saving = false;
    }
  }

  private async finalizarTurno() {
    if (!this.validarFinalizacion()) return;
    
    // Si hay encuesta, crearla primero
    if (this.crearEncuesta) {
      const { data: encData, error: encErr } = await supabase
        .from('encuestas')
        .insert([{
          turno_id: this.modalData.turno.id,
          pregunta_1: this.encuestaRespuestas.p1,
          pregunta_2: this.encuestaRespuestas.p2,
          pregunta_3: this.encuestaRespuestas.p3,
          observaciones: this.encuestaRespuestas.observaciones
        }])
        .select()
        .single();

      if (encErr) throw new Error(encErr.message);
      
      // Actualizar turno con ID de encuesta
      await this.turnosService.finalizarTurnoConEncuesta(
        this.modalData.turno.id, 
        this.comentario,
        encData.id
      );
    } else {
      // Finalizar sin encuesta
      await this.turnosService.finalizarTurno(this.modalData.turno.id, this.comentario);
    }
  }

  private validarComentario(): boolean {
    if (!this.comentario.trim()) {
      this.error = 'Por favor ingresá el motivo.';
      return false;
    }
    return true;
  }

  private validarCalificacion(): boolean {
    if (!this.calificacion || this.calificacion < 1 || this.calificacion > 5) {
      this.error = 'Ingresá una calificación entre 1 y 5.';
      return false;
    }
    return true;
  }

  private validarFinalizacion(): boolean {
    if (!this.comentario.trim() && !this.crearEncuesta) {
      this.error = 'Agregá una reseña o marcá que crearás encuesta.';
      return false;
    }
    return true;
  }

  // Métodos para el template
  getButtonClass(): string {
    const classes: any = {
      'aceptar': 'primary',
      'cancelar': 'danger', 
      'rechazar': 'warn',
      'finalizar': 'primary',
      'calificar': 'primary'
    };
    return classes[this.modalData?.tipo] || 'primary';
  }

  getButtonText(): string {
    const textos: any = {
      'aceptar': 'Aceptar',
      'cancelar': 'Confirmar cancelación',
      'rechazar': 'Rechazar turno',
      'finalizar': 'Finalizar turno',
      'calificar': 'Enviar calificación'
    };
    return textos[this.modalData?.tipo] || 'Confirmar';
  }

  validarBoton(): boolean {
    if (!this.modalData) return false;
    
    switch (this.modalData.tipo) {
      case 'cancelar':
      case 'rechazar':
        return !!this.comentario.trim();
      case 'calificar':
        return !!this.calificacion;
      case 'finalizar':
        return !!this.comentario.trim() || this.crearEncuesta;
      default:
        return true;
    }
  }
}