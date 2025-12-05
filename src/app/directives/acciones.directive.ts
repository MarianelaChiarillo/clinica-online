import { Directive, Input, Output, EventEmitter, ElementRef, Renderer2, OnChanges } from '@angular/core';

@Directive({
  selector: '[appAccionesTurno]',
  standalone: true
})
export class AccionesTurnoDirective implements OnChanges {
  @Input('appAccionesTurno') acciones: string[] = [];
  @Output() accionEjecutada = new EventEmitter<string>();

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges() {
    this.el.nativeElement.innerHTML = '';

    if (!this.acciones || this.acciones.length === 0) {
      const span = this.renderer.createElement('span');
      this.renderer.addClass(span, 'text-muted');
      span.innerText = 'Sin acciones disponibles';
      this.renderer.appendChild(this.el.nativeElement, span);
      return;
    }

    for (const accion of this.acciones) {
      const btn = this.renderer.createElement('button');
     this.renderer.addClass(btn, 'boton');
this.renderer.addClass(btn, 'boton-chico');

if (accion === 'aceptar') {
  this.renderer.addClass(btn, 'boton-exito');
} else if (accion === 'rechazar') {
  this.renderer.addClass(btn, 'boton-advertencia');
} else if (accion === 'cancelar') {
  this.renderer.addClass(btn, 'boton-peligro');
} else if (accion === 'finalizar') {
  this.renderer.addClass(btn, 'boton-primario');
} else if (accion === 'ver_resena') {
  this.renderer.addClass(btn, 'boton-info');
} else if (accion === 'completar_encuesta') {
  this.renderer.addClass(btn, 'boton-secundario');
} else if (accion === 'calificar') {
  this.renderer.addClass(btn, 'boton-oscuro');
}


      btn.innerText = this.getTextoAccion(accion);

      this.renderer.listen(btn, 'click', () => {
        this.accionEjecutada.emit(accion);
      });

      this.renderer.appendChild(this.el.nativeElement, btn);
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
