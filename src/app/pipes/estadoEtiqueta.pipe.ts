import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estadoEtiqueta',
  standalone: true
})
export class EstadoEtiquetaPipe implements PipeTransform {
  transform(estado: string, idioma: 'es' | 'en' = 'es'): string {
    if (!estado) return '';
    const es: Record<string, string> = {
      pendiente: 'Pendiente',
      aceptado: 'Aceptado',
      realizado: 'Realizado',
      cancelado: 'Cancelado',
      rechazado: 'Rechazado'
    };
    const en: Record<string, string> = {
      pendiente: 'Pending',
      aceptado: 'Accepted',
      realizado: 'Completed',
      cancelado: 'Canceled',
      rechazado: 'Rejected'
    };
    const map = idioma === 'en' ? en : es;
    return map[estado?.toLowerCase()] ?? estado;
  }
}
