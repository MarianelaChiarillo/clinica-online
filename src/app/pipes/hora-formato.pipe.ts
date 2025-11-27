import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'horaFormato',
  standalone: true
})
export class HoraFormatoPipe implements PipeTransform {
  transform(hora: string): string {
    return hora; 
  }
}