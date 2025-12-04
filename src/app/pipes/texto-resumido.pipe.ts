import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'resumen',
  standalone: true
})
export class ResumenPipe implements PipeTransform {
  transform(value: string, limit?: number, ellipsis?: string): string {
    if (!value) {
      return '';
    }

    let limite = 50;
    if (typeof limit === 'number') {
      limite = limit;
    }

    let puntos = '...';
    if (typeof ellipsis === 'string') {
      puntos = ellipsis;
    }

    if (value.length > limite) {
      return value.substring(0, limite) + puntos;
    }

    return value;
  }
}
