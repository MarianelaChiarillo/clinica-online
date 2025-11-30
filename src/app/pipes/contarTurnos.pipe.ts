import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'contarTurnos',
  standalone: true
})
export class ContarTurnosPipe implements PipeTransform {
  transform(turnos: any[], especialidad: string): number {
    if (!turnos || !especialidad) return 0;
    return turnos.filter(t => t.especialidades?.nombre?.toLowerCase() === especialidad.toLowerCase()).length;
  }
}
