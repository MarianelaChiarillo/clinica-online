import { Component, Output, EventEmitter, Input, OnDestroy, OnInit } from '@angular/core';

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
    onRecaptchaSuccess: (token: string) => void;
    onRecaptchaError: () => void;
    onRecaptchaExpired: () => void;
  }
}

@Component({
  selector: 'app-captcha',
  standalone: true,
  templateUrl: './captcha.component.html',
  styleUrls: ['./captcha.component.scss']
})
export class CaptchaComponent implements OnInit, OnDestroy {
  @Input() siteKey: string = '6LdcjwQsAAAAAHss6FjFtMwfks-G4I3LTB-LA_dF';
  @Output() captchaResuelto = new EventEmitter<string>();
  @Output() captchaError = new EventEmitter<void>();
  @Output() captchaExpirado = new EventEmitter<void>();

  // Cambiar a público para que el template pueda acceder
  public uniqueId: string;
  public captchaCargado = false;
  public error: string | null = null;
  
  private captchaWidgetId: number | null = null;

  constructor() {
    this.uniqueId = Math.random().toString(36).substring(2, 9);
  }

  ngOnInit(): void {
    this.setupRecaptchaCallbacks();
    this.loadRecaptchaScript();
  }

  ngOnDestroy(): void {
    this.cleanupRecaptchaCallbacks();
    this.resetCaptcha();
  }

  private setupRecaptchaCallbacks(): void {
    window.onRecaptchaLoad = () => this.onRecaptchaLoaded();
    window.onRecaptchaSuccess = (token: string) => this.onCaptchaResolved(token);
    window.onRecaptchaError = () => this.onCaptchaError();
    window.onRecaptchaExpired = () => this.onCaptchaExpired();
  }

  private cleanupRecaptchaCallbacks(): void {
    window.onRecaptchaLoad = () => {};
    window.onRecaptchaSuccess = () => {};
    window.onRecaptchaError = () => {};
    window.onRecaptchaExpired = () => {};
  }

  private loadRecaptchaScript(): void {
    if (window.grecaptcha) {
      this.onRecaptchaLoaded();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      this.error = 'No se pudo cargar la verificación de seguridad. Recargá la página.';
    };

    document.head.appendChild(script);
  }

  private onRecaptchaLoaded(): void {
    this.captchaCargado = true;
    setTimeout(() => this.renderRecaptcha(), 100);
  }

  private renderRecaptcha(): void {
    if (!window.grecaptcha?.render) {
      setTimeout(() => this.renderRecaptcha(), 1000);
      return;
    }

    try {
      const container = document.getElementById(`recaptcha-container-${this.uniqueId}`);
      if (!container) {
        setTimeout(() => this.renderRecaptcha(), 500);
        return;
      }

      container.innerHTML = '';

      this.captchaWidgetId = window.grecaptcha.render(`recaptcha-container-${this.uniqueId}`, {
        sitekey: this.siteKey,
        callback: (token: string) => window.onRecaptchaSuccess(token),
        'error-callback': () => window.onRecaptchaError(),
        'expired-callback': () => window.onRecaptchaExpired(),
        theme: 'light',
        size: 'normal'
      });
    } catch (error) {
      console.error('Error renderizando reCAPTCHA:', error);
    }
  }

  private onCaptchaResolved(token: string): void {
    this.captchaResuelto.emit(token);
    this.error = null;
  }

  private onCaptchaError(): void {
    this.captchaError.emit();
    this.error = 'Ocurrió un error con la verificación de seguridad.';
  }

  private onCaptchaExpired(): void {
    this.captchaExpirado.emit();
    this.error = 'La verificación de seguridad expiró.';
  }

  public recargarCaptcha(): void {
    this.resetCaptcha();
    setTimeout(() => this.renderRecaptcha(), 300);
  }

  private resetCaptcha(): void {
    if (this.captchaWidgetId !== null && window.grecaptcha) {
      try {
        window.grecaptcha.reset(this.captchaWidgetId);
      } catch (error) {
        console.warn('Error reseteando reCAPTCHA:', error);
      }
    }
  }
}