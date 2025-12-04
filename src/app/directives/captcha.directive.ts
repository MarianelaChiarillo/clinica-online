import { Directive, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CaptchaService } from '../services/captcha.service';


@Directive({
  selector: '[appCaptcha]',
  exportAs: 'appCaptcha',
  standalone: true,
})
export class CaptchaDirectiva {
  @Input() enabled = true;
  @Input() captchaValido = false;
  @Input() imagenes: Array<{id: string, src: string}> = [];

  @Output() seleccionToggled = new EventEmitter<string>();
  @Output() verificarSolicitado = new EventEmitter<void>();

  toggleSeleccion(id: string) {
    this.seleccionToggled.emit(id);
  }

  solicitarVerificacion() {
    this.verificarSolicitado.emit();
  }
}
