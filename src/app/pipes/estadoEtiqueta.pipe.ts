import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estadoEtiqueta',
  standalone: true
})
export class EstadoEtiquetaPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    const estado = value.toLowerCase().trim();

    if (estado === 'solicitado') return 'Solicitado';
    if (estado === 'aceptado') return 'Aceptado';
    if (estado === 'realizado') return 'Realizado';
    if (estado === 'cancelado') return 'Cancelado';
    if (estado === 'rechazado') return 'Rechazado';
    return value;
  }
}
