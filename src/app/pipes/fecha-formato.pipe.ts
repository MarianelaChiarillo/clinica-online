import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaFormato',
  standalone: true
})
export class FechaFormatoPipe implements PipeTransform {
  transform(fecha: string | Date | null | undefined): string {
    if (!fecha) {
      return '';
    }

    let fechaObjeto: Date;
    if (typeof fecha === 'string') {
      fechaObjeto = new Date(fecha + 'T00:00:00');
    } else {
      fechaObjeto = new Date(fecha);
    }

    if (isNaN(fechaObjeto.getTime())) {
      return '';
    }

    const dia = fechaObjeto.getDate();
    const mes = fechaObjeto.toLocaleDateString('es-AR', { month: 'long' });

    return dia + ' de ' + mes;
  }
}
