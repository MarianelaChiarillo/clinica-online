import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaFormato',
  standalone: true
})
export class FechaFormatoPipe implements PipeTransform {
  transform(fecha: string | Date | null | undefined): string {
    if (!fecha) return '';

    const fechaObj = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : new Date(fecha);
    if (isNaN(fechaObj.getTime())) return '';

    const dia = fechaObj.getDate();
    const mes = fechaObj.toLocaleDateString('es-AR', { month: 'long' });

    return dia + ' de ' + mes;
  }
}
