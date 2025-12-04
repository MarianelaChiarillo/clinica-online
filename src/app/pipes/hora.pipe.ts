import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'horaFormato',
  standalone: true
})
export class HoraFormatoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const partes = value.split(':');
    if (partes.length !== 2) {
      return value; 
    }

    const horas = partes[0];
    const minutos = partes[1];

    const horasFormateadas = horas.padStart(2, '0');
    const minutosFormateados = minutos.padStart(2, '0');

    return horasFormateadas + ':' + minutosFormateados;
  }
}
