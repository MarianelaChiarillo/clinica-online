import { Directive, Input, Output, EventEmitter, ElementRef, Renderer2, OnChanges } from '@angular/core';
import { TurnoExtendido } from '../models/turno';

@Directive({
  selector: '[appAccionesTurno]',
  standalone: true
})
export class AccionesTurnoDirective implements OnChanges {
  @Input('appAccionesTurno') turno!: TurnoExtendido;
  @Output() accionEjecutada = new EventEmitter<string>();

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges() {
    // Limpiar botones previos
    this.el.nativeElement.innerHTML = '';

    if (!this.turno || !this.turno.estado) {
      return;
    }

    const estado = this.turno.estado.toLowerCase().trim();

    // Lista de acciones según estado
    const acciones: string[] = [];

    // Lógica explícita con if/else
    if (estado === 'solicitado') {
      acciones.push('aceptar');
      acciones.push('rechazar');
      acciones.push('cancelar');
    } else if (estado === 'aceptado') {
      acciones.push('finalizar');
    } else if (estado === 'realizado') {
      if (Array.isArray(this.turno.encuestas) && this.turno.encuestas.length === 0) {
        acciones.push('completar_encuesta');
      }
      if (!this.turno.calificacion_atencion) {
        acciones.push('calificar');
      }
      if (this.turno.comentario_especialista && this.turno.comentario_especialista.trim() !== '') {
        acciones.push('ver_resena');
      }
    } else {
      // Otros estados: sin acciones
    }

    // Crear botones
    for (const accion of acciones) {
      const btn = this.renderer.createElement('button');
      this.renderer.addClass(btn, 'btn');
      this.renderer.addClass(btn, 'btn-sm');

      // Estilo explícito según acción
      if (accion === 'aceptar') {
        this.renderer.addClass(btn, 'btn-success');
      } else if (accion === 'rechazar') {
        this.renderer.addClass(btn, 'btn-warning');
      } else if (accion === 'cancelar') {
        this.renderer.addClass(btn, 'btn-danger');
      } else if (accion === 'finalizar') {
        this.renderer.addClass(btn, 'btn-primary');
      } else if (accion === 'ver_resena') {
        this.renderer.addClass(btn, 'btn-info');
      } else if (accion === 'completar_encuesta') {
        this.renderer.addClass(btn, 'btn-secondary');
      } else if (accion === 'calificar') {
        this.renderer.addClass(btn, 'btn-dark');
      }

      // Texto del botón
      btn.innerText = this.getTextoAccion(accion);

      // Evento click
      this.renderer.listen(btn, 'click', () => {
        this.accionEjecutada.emit(accion);
      });

      // Agregar al contenedor
      this.renderer.appendChild(this.el.nativeElement, btn);
    }

    // Si no hay acciones, mostrar texto
    if (acciones.length === 0) {
      const span = this.renderer.createElement('span');
      this.renderer.addClass(span, 'text-muted');
      span.innerText = 'Sin acciones disponibles';
      this.renderer.appendChild(this.el.nativeElement, span);
    }
  }

  private getTextoAccion(accion: string): string {
    if (accion === 'aceptar') return 'Aceptar';
    if (accion === 'rechazar') return 'Rechazar';
    if (accion === 'cancelar') return 'Cancelar';
    if (accion === 'finalizar') return 'Finalizar';
    if (accion === 'ver_resena') return 'Ver Reseña';
    if (accion === 'completar_encuesta') return 'Completar Encuesta';
    if (accion === 'calificar') return 'Calificar';
    return accion;
  }
}
