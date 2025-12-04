import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'historiaResumen',
  standalone: true
})
export class HistoriaResumenPipe implements PipeTransform {
  transform(historia: any): string {
    if (!historia) {
      return '';
    }

    let resultado = '';

    if (historia.altura) {
      if (resultado !== '') {
        resultado = resultado + ' | ';
      }
      resultado = resultado + 'Altura: ' + historia.altura + ' cm';
    }

    if (historia.peso) {
      if (resultado !== '') {
        resultado = resultado + ' | ';
      }
      resultado = resultado + 'Peso: ' + historia.peso + ' kg';
    }

    if (historia.temperatura) {
      if (resultado !== '') {
        resultado = resultado + ' | ';
      }
      resultado = resultado + 'Temp: ' + historia.temperatura + ' °C';
    }

    if (historia.presion) {
      if (resultado !== '') {
        resultado = resultado + ' | ';
      }
      resultado = resultado + 'Presión: ' + historia.presion;
    }

    return resultado;
  }
}
