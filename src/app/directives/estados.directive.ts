import { Directive, Input, ElementRef, Renderer2, OnChanges } from '@angular/core';

@Directive({
  selector: '[appEstadoTurno]',
  standalone: true
})
export class EstadoTurnoDirectiva implements OnChanges {
  @Input('appEstadoTurno') estado: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges() {
    let clase = '';
    let texto = '';
    const estadoNormalizado = this.estado ? this.estado.toLowerCase() : '';

    if (estadoNormalizado === 'solicitado') {
      clase = 'badge-warning';
      texto = 'Solicitado';
    } else if (estadoNormalizado === 'aceptado') {
      clase = 'badge-info';
      texto = 'Aceptado';
    } else if (estadoNormalizado === 'realizado') {
      clase = 'badge-success';
      texto = 'Realizado';
    } else if (estadoNormalizado === 'cancelado') {
      clase = 'badge-danger';
      texto = 'Cancelado';
    } else if (estadoNormalizado === 'rechazado') {
      clase = 'badge-secondary';
      texto = 'Rechazado';
    } else {
      clase = 'badge-secondary';
      texto = this.estado;
    }

    this.el.nativeElement.innerText = texto;
    this.renderer.addClass(this.el.nativeElement, clase);
  }
}
