import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaFormato',
  standalone: true
})
export class FechaFormatoPipe implements PipeTransform {
  transform(fecha: string | null | undefined): string {
    if (!fecha) return '';
    
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  }
}