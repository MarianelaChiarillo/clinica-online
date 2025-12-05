import { Directive, Input, ElementRef, Renderer2, OnChanges } from '@angular/core';

@Directive({
  selector: '[appEstadoTurno]',
  standalone: true
})
export class EstadoTurnoDirectiva implements OnChanges {
  @Input('appEstadoTurno') estado: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

ngOnChanges() {
  // Limpio clases previas (opcional, evita acumulación)
  const clasesPrevias = ['etiqueta-solicitado','etiqueta-aceptado','etiqueta-realizado','etiqueta-cancelado','etiqueta-rechazado','etiqueta'];
  clasesPrevias.forEach(c => this.renderer.removeClass(this.el.nativeElement, c));

  this.renderer.addClass(this.el.nativeElement, 'etiqueta');

  let clase = '';
  let texto = '';
  const estadoNormalizado = this.estado ? this.estado.toLowerCase().trim() : '';

  if (estadoNormalizado === 'solicitado') {
    clase = 'etiqueta-solicitado';
    texto = 'Solicitado';
  } else if (estadoNormalizado === 'aceptado') {
    clase = 'etiqueta-aceptado';
    texto = 'Aceptado';
  } else if (estadoNormalizado === 'realizado') {
    clase = 'etiqueta-realizado';
    texto = 'Realizado';
  } else if (estadoNormalizado === 'cancelado') {
    clase = 'etiqueta-cancelado';
    texto = 'Cancelado';
  } else if (estadoNormalizado === 'rechazado') {
    clase = 'etiqueta-rechazado';
    texto = 'Rechazado';
  } else {
    clase = 'etiqueta-rechazado';
    texto = this.estado || 'Desconocido';
  }

  this.renderer.addClass(this.el.nativeElement, clase);
  this.el.nativeElement.innerText = texto;
}
}