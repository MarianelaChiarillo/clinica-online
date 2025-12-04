import { Pipe, PipeTransform } from '@angular/core';
import { TurnoExtendido } from '../models/turno';

@Pipe({
  name: 'accionesTurno',
  standalone: true
})
export class AccionesTurnoPipe implements PipeTransform {
  transform(turno: TurnoExtendido): string[] {
    const acciones: string[] = [];

    if (!turno || !turno.estado) {
      return acciones;
    }

    const estado = turno.estado.toLowerCase().trim();

    if (estado === 'solicitado') {
      acciones.push('aceptar');
      acciones.push('rechazar');
      acciones.push('cancelar');
    } else if (estado === 'aceptado') {
      acciones.push('finalizar');
    } else if (estado === 'realizado') {
      if (Array.isArray(turno.encuestas)) {
        if (turno.encuestas.length === 0) {
          acciones.push('completar_encuesta');
        }
      }
      if (!turno.calificacion_atencion) {
        acciones.push('calificar');
      }
      if (turno.comentario_especialista) {
        if (turno.comentario_especialista.trim() !== '') {
          acciones.push('ver_resena');
        }
      }
    }

    return acciones;
  }
}
