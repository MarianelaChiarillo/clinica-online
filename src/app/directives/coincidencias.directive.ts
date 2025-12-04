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
    if (!this.texto || !this.termino) {
      this.el.nativeElement.innerHTML = this.texto || '';
      return;
    }

    const terminoNormalizado = this.termino.toLowerCase();
    const textoOriginal = this.texto;
    const regex = new RegExp('(' + terminoNormalizado + ')', 'gi');
    const textoResaltado = textoOriginal.replace(regex, '<mark class="highlighted">$1</mark>');

    this.el.nativeElement.innerHTML = textoResaltado;
  }
}
