import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaFormato',
  standalone: true
})
export class FechaFormatoPipe implements PipeTransform {
  transform(fecha: string): string {
    if (!fecha) return '';

    const date = new Date(fecha + 'T00:00:00');

    const dia = date.getDate();
    const mes = date.toLocaleString('es-AR', { month: 'long' });

    return `${dia} de ${mes}`;
  }
}
