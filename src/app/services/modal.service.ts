// src/app/services/modal.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalData {
  tipo: 'aceptar' | 'cancelar' | 'rechazar' | 'finalizar' | 'comentario' | 'calificar' | 'historia-clinica'; // ← AGREGAR 'historia-clinica'
  turno: any;
  titulo?: string;
  mensaje?: string;
  requiereComentario?: boolean;
  requiereCalificacion?: boolean;
  mostrarEncuesta?: boolean;
  mostrarHistoriaClinica?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalData | null>(null);
  public modal$ = this.modalSubject.asObservable();

  private resolverAccion: ((resultado: any) => void) | null = null;

  private abrir(tipo: ModalData) {
    return new Promise(resolve => {
      this.resolverAccion = resolve;
      this.modalSubject.next(tipo);
    });
  }

  abrirAceptarTurno(turno: any) {
    return this.abrir({
      tipo: 'aceptar',
      turno,
      titulo: 'Aceptar Turno',
      mensaje: `¿Confirmás que deseas aceptar el turno del paciente <strong>${turno.pacientes?.nombre} ${turno.pacientes?.apellido}</strong>?`
    });
  }

  abrirCancelarTurno(turno: any) {
    return this.abrir({
      tipo: 'cancelar',
      turno,
      titulo: 'Cancelar Turno',
      mensaje: 'Vas a cancelar el turno. Por favor contanos el motivo:',
      requiereComentario: true
    });
  }

  abrirRechazarTurno(turno: any) {
    return this.abrir({
      tipo: 'rechazar',
      turno,
      titulo: 'Rechazar Turno',
      mensaje: 'Para rechazar el turno, dejá un motivo:',
      requiereComentario: true
    });
  }

  // En modal.service.ts - REEMPLAZAR completamente
abrirFinalizarTurno(turno: any) {
  return this.abrir({
    tipo: 'historia-clinica',  // ← Ahora sí está permitido
    turno,
    titulo: 'Finalizar Turno - Historia Clínica',
    mensaje: 'Completá los datos de la consulta:',
    mostrarHistoriaClinica: true  // ← Y esta propiedad también
  });
}

  abrirComentarioTurno(turno: any) {
    return this.abrir({
      tipo: 'comentario',
      turno,
      titulo: 'Reseña / Comentarios'
    });
  }

  abrirCalificarTurno(turno: any) {
    return this.abrir({
      tipo: 'calificar',
      turno,
      titulo: 'Calificar Atención',
      requiereCalificacion: true,
      requiereComentario: true
    });
  }

  cerrarModal(resultado?: any) {
    if (this.resolverAccion) {
      this.resolverAccion(resultado);
      this.resolverAccion = null;
    }
    this.modalSubject.next(null);
  }
}
