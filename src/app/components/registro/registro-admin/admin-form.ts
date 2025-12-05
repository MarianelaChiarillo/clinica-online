import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { CaptchaWrapperComponent } from '../../componentes/captchaC/captcha-wrapper.component';

import { AuthService } from '../../../services/auth.service';
import { StorageService } from '../../../services/storage.service';
import { AdministradorService } from '../../../services/usuarios/administrador.service';
import { EspecialidadService } from '../../../services/usuarios/especialidad.service';
import { RegistroValidatorsService } from '../../../validators/registro.validator';
import { UtilsService } from '../../../services/utils.service';

@Component({
  selector: 'app-administrador-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MensajeComponent,
    SpinnerComponent,
    CaptchaWrapperComponent
  ],
  templateUrl: './admin-form.html',
  styleUrls: ['./admin-form.scss'],
  providers: [EspecialidadService],
})
export class AdministradorFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;
  archivoSeleccionado: File | null = null;
  nombreArchivo: string | null = null;
  captchaPassed = false;
  captchaEnabled = true;
  verClave = false;
  verClaveR = false;

  @ViewChild('captchaWrapper') captchaWrapper!: CaptchaWrapperComponent;

  constructor(
    private fb: FormBuilder,
    private authSrv: AuthService,
    private storage: StorageService,
    private router: Router,
    private adminSrv: AdministradorService,
    private especialidadSrv: EspecialidadService,
    public registroValidators: RegistroValidatorsService,
    private formUtils: UtilsService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarCaptchaPersistente();
  }

  ngOnDestroy(): void {
    this.captchaWrapper?.limpiarCaptchaCompleto();
  }

private initForm(): void {
  this.form = this.fb.group({
    nombre: ['', this.registroValidators.getNombreValidators()],
    apellido: ['', this.registroValidators.getApellidoValidators()],
    email: ['', this.registroValidators.getEmailValidators()],
    dni: ['', this.registroValidators.getDniValidators()],  // ← Usa el del servicio
    edad: ['', this.registroValidators.getEdadEspecialistaValidators()],
    clave: ['', this.registroValidators.getClaveValidators()],
    repiteClave: ['', this.registroValidators.getConfirmarClaveValidator('clave')],
    imagen: [null, this.registroValidators.getImagenValidators()],
    recaptcha: ['']
  });
}

  toggleVerClave(): void {
    this.verClave = !this.verClave;
  }

  toggleVerClaveR(): void {
    this.verClaveR = !this.verClaveR;
  }

  onFileChange(event: any): void {
    const result = this.formUtils.handleFileChange(event, this.form, 'imagen');
    this.nombreArchivo = result.nombreArchivo;
    this.archivoSeleccionado = result.archivo;
  }
getDniValidators() {
  return [
    Validators.required,
    Validators.pattern(/^[0-9]{7,8}$/)
  ];
}

  quitarArchivo(): void {
    this.formUtils.quitarArchivo(this.form, 'imagen');
    this.nombreArchivo = null;
    this.archivoSeleccionado = null;
  }

  async registrar(): Promise<void> {
    this.formUtils.markAllAsTouched(this.form);

    // Validación del captcha
    if (this.captchaEnabled && !this.captchaPassed) {
      this.mostrarError('Por favor completa el captcha.');
      return;
    }

    if (this.form.invalid) {
      this.mostrarError('Por favor completá todos los campos requeridos.');
      return;
    }

    this.cargando = true;
    this.mensaje = null;

    try {
      const valores = this.form.value;

      const { user, error: authError } = await this.authSrv.registrar(
        valores.email,
        valores.clave
      );

      if (authError || !user)
        throw new Error(authError?.message || 'Error al registrar usuario.');

      const imagenUrl = this.archivoSeleccionado
        ? await this.storage.subirImagen(this.archivoSeleccionado)
        : undefined;

      await this.adminSrv.crearAdministrador({
        nombre: valores.nombre,
        apellido: valores.apellido,
        edad: valores.edad,
        dni: valores.dni,
        email: valores.email,
        auth_id: user.id,
        imagen_perfil: imagenUrl,
      });

      this.mostrarExito('Administrador creado correctamente.');
      this.form.reset();
      this.captchaPassed = false;
      this.cargarNuevoCaptcha();
    } catch (error: any) {
      console.error(error);
      this.mostrarError(error.message || 'No se pudo registrar el administrador.');
      // Forzar nuevo captcha en caso de error
      this.cargarNuevoCaptcha();
    } finally {
      this.cargando = false;
    }
  }

  private mostrarError(texto: string): void {
    this.mensaje = { titulo: 'Error', texto, tipo: 'error' };
  }

  private mostrarExito(texto: string): void {
    this.mensaje = { titulo: 'Éxito', texto, tipo: 'success' };
  }

onCaptchaSolved(esValido: boolean) { this.captchaPassed = esValido; }


  async cargarCaptchaPersistente(): Promise<void> {
    if (!this.captchaWrapper) {
      console.log('CaptchaWrapper no disponible aún');
      return;
    }
    
    try {
      const tokenGuardado = localStorage.getItem('captcha_token');
      if (tokenGuardado) {
        console.log('Intentando recuperar captcha persistente');
        const captchaData = await this.captchaWrapper.recuperarCaptcha(tokenGuardado);
        if (captchaData) {
          console.log('Captcha recuperado exitosamente');
          this.captchaPassed = true;
          return;
        }
      }
      
      // Si no hay token o no se pudo recuperar, generar uno nuevo
      console.log('Generando nuevo captcha');
      await this.cargarNuevoCaptcha();
    } catch (error) {
      console.error('Error al cargar captcha persistente:', error);
      await this.cargarNuevoCaptcha();
    }
  }

  async cargarNuevoCaptcha(): Promise<void> {
    if (!this.captchaWrapper) {
      console.error('CaptchaWrapper no disponible');
      return;
    }
    
    try {
      await this.captchaWrapper.generarNuevoCaptchaWrapper();
      this.captchaPassed = false;
      localStorage.removeItem('captcha_token');
    } catch (error) {
      console.error('Error al generar nuevo captcha:', error);
    }
  }

  onToggleCaptcha(): void {
    if (!this.captchaEnabled) {
      this.captchaPassed = true;
    } else {
      this.captchaPassed = false;
    }
    
    if (this.captchaWrapper) {
      this.captchaWrapper.toggleCaptcha();
    }
  }
}