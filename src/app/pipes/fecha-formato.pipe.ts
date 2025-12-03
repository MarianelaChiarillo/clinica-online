import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaFormato',
  standalone: true
})
export class FechaFormatoPipe implements PipeTransform {
  transform(fecha: string | null | undefined): string {
    if (!fecha) return '';
    
    try {
      // ✅ Solución: Agregar 'T00:00:00' para forzar hora local
      // o usar Date.UTC para evitar problemas de zona horaria
      const date = new Date(fecha + 'T00:00:00');
      
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