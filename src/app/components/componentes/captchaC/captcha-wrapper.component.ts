import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaptchaService } from '../../../services/captcha.service';
import { CaptchaDirectiva } from '../../../directives/captcha.directive';

@Component({
  selector: 'app-captcha-wrapper',
  templateUrl: './captcha-wrapper.component.html',
  styleUrls: ['./captcha-wrapper.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, CaptchaDirectiva]
})
export class CaptchaWrapperComponent implements OnInit {
  @Input() enabled = true;
  @Output() solved = new EventEmitter<boolean>();

  // 🔹 Propiedades que tu HTML usa
  captchaEnabled = true;
  captchaVisible = false;
  captchaPassed = false;
  cargando = false;

  // 🔹 Estado del captcha
  imagenes: Array<{id: string, src: string}> = [];
  seleccionadas: string[] = [];
  objetivo = '';
  token = '';
  captchaValido = false;

  private captchaTokenKey = 'captcha_token';
  private captchaValidoKey = 'captcha_valido';

  constructor(private captchaService: CaptchaService) {}

  async ngOnInit() {
    await this.cargarCaptcha();
  }

  // 🔹 Métodos que tu HTML llama
  onToggleCaptcha() {
    if (!this.captchaEnabled) {
      this.captchaPassed = true;
      this.captchaVisible = false;
    } else {
      this.captchaPassed = false;
    }
  }

  mostrarCaptcha() {
    this.captchaVisible = true;
  }

  async cargarCaptcha() {
    const tokenGuardado = localStorage.getItem(this.captchaTokenKey);
    const validoGuardado = localStorage.getItem(this.captchaValidoKey) === 'true';

    if (tokenGuardado && validoGuardado) {
      this.token = tokenGuardado;
      this.captchaValido = true;
      this.solved.emit(true);
      return;
    }
    await this.generarNuevoCaptcha();
  }

  async generarNuevoCaptcha() {
    this.cargando = true;
    try {
      const captcha = await this.captchaService.generarCaptcha();
      this.token = captcha.token;
      this.objetivo = captcha.target;
      this.imagenes = captcha.images.map(img => ({
        id: img.id.toString(),
        src: 'url' in img ? img.url : img.src
      }));
      this.seleccionadas = [];
      this.captchaValido = false;

      localStorage.setItem(this.captchaTokenKey, this.token);
      localStorage.setItem(this.captchaValidoKey, 'false');
    } finally {
      this.cargando = false;
    }
  }

  onSeleccionToggled(id: string) {
    const index = this.seleccionadas.indexOf(id);
    index > -1 ? this.seleccionadas.splice(index, 1) : this.seleccionadas.push(id);
  }

  async onVerificarSolicitado() {
    if (this.seleccionadas.length === 0) {
      alert('Selecciona al menos una imagen');
      return;
    }

    this.cargando = true;
    try {
      const esValido = await this.captchaService.verificarCaptcha(this.token, this.seleccionadas);
      this.captchaValido = esValido;
      this.captchaPassed = esValido;
      this.solved.emit(esValido);
      localStorage.setItem(this.captchaValidoKey, esValido ? 'true' : 'false');

      if (!esValido) {
        alert('Selección incorrecta. Intenta de nuevo.');
        await this.generarNuevoCaptcha();
      }
    } finally {
      this.cargando = false;
    }
  }

  async limpiarCaptchaCompleto() {
    localStorage.removeItem(this.captchaTokenKey);
    localStorage.removeItem(this.captchaValidoKey);
    this.token = '';
    this.objetivo = '';
    this.imagenes = [];
    this.seleccionadas = [];
    this.captchaValido = false;
    this.captchaPassed = false;
    await this.generarNuevoCaptcha();
  }

  toggleCaptcha() {
    this.captchaEnabled = !this.captchaEnabled;
    if (!this.captchaEnabled) {
      this.captchaPassed = true;
    } else {
      this.captchaPassed = false;
    }
  }

  async recuperarCaptcha(token: string) {
    return await this.captchaService.recuperarCaptcha(token);
  }

  async generarNuevoCaptchaWrapper() {
    await this.generarNuevoCaptcha();
    return this.imagenes;
  }
}
