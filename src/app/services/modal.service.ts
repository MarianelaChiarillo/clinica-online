// src/app/services/modal.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalData {
  tipo: 'aceptar' | 'cancelar' | 'rechazar' | 'finalizar' | 'comentario' | 'calificar';
  turno: any;
  titulo?: string;
  mensaje?: string;
  requiereComentario?: boolean;
  requiereCalificacion?: boolean;
  mostrarEncuesta?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalData | null>(null);
  public modal$ = this.modalSubject.asObservable();

  // Métodos para abrir cada tipo de modal
  abrirAceptarTurno(turno: any) {
    this.modalSubject.next({
      tipo: 'aceptar',
      turno: turno,
      titulo: 'Aceptar Turno',
      mensaje: `¿Confirmás que deseas aceptar el turno del paciente <strong>${turno.pacientes?.nombre} ${turno.pacientes?.apellido}</strong>?`
    });
  }

  abrirCancelarTurno(turno: any) {
    this.modalSubject.next({
      tipo: 'cancelar',
      turno: turno,
      titulo: 'Cancelar Turno',
      mensaje: 'Vas a cancelar el turno. Por favor contanos el motivo:',
      requiereComentario: true
    });
  }

  abrirRechazarTurno(turno: any) {
    this.modalSubject.next({
      tipo: 'rechazar',
      turno: turno,
      titulo: 'Rechazar Turno',
      mensaje: 'Para rechazar el turno, dejá un motivo:',
      requiereComentario: true
    });
  }

  abrirFinalizarTurno(turno: any) {
    this.modalSubject.next({
      tipo: 'finalizar',
      turno: turno,
      titulo: 'Finalizar Turno',
      mensaje: 'Completá los detalles de la consulta:',
      requiereComentario: true,
      mostrarEncuesta: true
    });
  }

  abrirComentarioTurno(turno: any) {
    this.modalSubject.next({
      tipo: 'comentario',
      turno: turno,
      titulo: 'Reseña / Comentarios'
    });
  }

  abrirCalificarTurno(turno: any) {
    this.modalSubject.next({
      tipo: 'calificar',
      turno: turno,
      titulo: 'Calificar Atención',
      requiereCalificacion: true,
      requiereComentario: true
    });
  }

  cerrarModal() {
    this.modalSubject.next(null);
  }
}