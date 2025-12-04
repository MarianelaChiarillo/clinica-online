import { Directive, Input, ElementRef, Renderer2, OnChanges } from '@angular/core';

@Directive({
  selector: '[appHighlightCoincidencia]',
  standalone: true
})
export class HighlightCoincidenciaDirective implements OnChanges {
  @Input('appHighlightCoincidencia') texto: string = '';
  @Input() termino: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges() {
    // Si no hay texto o término, mostramos el texto tal cual
    if (!this.texto || !this.termino) {
      this.el.nativeElement.innerHTML = this.texto || '';
      return;
    }

    const terminoNormalizado = this.termino.toLowerCase();
    const textoOriginal = this.texto;

    // Creamos una expresión regular para buscar coincidencias
    const regex = new RegExp(`(${terminoNormalizado})`, 'gi');

    // Reemplazamos coincidencias por <mark>
    const textoResaltado = textoOriginal.replace(regex, `<mark class="highlighted">$1</mark>`);

    // Insertamos el HTML resultante
    this.el.nativeElement.innerHTML = textoResaltado;
  }
}
