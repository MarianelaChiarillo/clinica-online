import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Paciente } from '../../../models/user-data';
import { AuthService } from '../../../services/auth.service';
import { StorageService } from '../../../services/storage.service';
import { PacienteService } from '../../../services/usuarios/paciente.service';
import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { CaptchaComponent } from '../../componentes/captcha/captcha.component';
import { RegistroValidatorsService } from '../../../validators/registro.validator';
import { UtilsService } from '../../../services/utils.service';
import { CaptchaWrapperComponent } from '../../componentes/captchaC/captcha-wrapper.component';
import { CaptchaDirectiva } from '../../../directives/captcha.directive';
@Component({
  selector: 'app-paciente-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MensajeComponent,
    SpinnerComponent,
    CaptchaComponent,
    CaptchaWrapperComponent,
       CaptchaDirectiva
  ],
  templateUrl: './paciente-form.html',
  styleUrls: ['./paciente-form.scss'],
})

export class PacienteForm implements OnInit {
    @ViewChild('captchaWrapper') captchaWrapper!: CaptchaWrapperComponent;

  form!: FormGroup;
  cargando = false;
  verClave = false;
  verClaveR = false;
  mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;
  nombreArchivo1: string | null = null;
  nombreArchivo2: string | null = null;
  archivoSeleccionado1: File | null = null;
  archivoSeleccionado2: File | null = null;
  captchaResuelto = false;
captchaPassed = false;
captchaEnabled = true;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private formUtils: UtilsService,
    private validators: RegistroValidatorsService,
    private authSrv: AuthService,
    private storage: StorageService,
    private pacienteSrv: PacienteService
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
      nombre: ['', this.validators.getNombreValidators()],
      apellido: ['', this.validators.getApellidoValidators()],
      edad: ['', this.validators.getEdadPacienteValidators()],
      dni: ['', this.validators.getDniValidators()],
      obraSocial: ['', this.validators.getObraSocialValidators()],
      email: ['', this.validators.getEmailValidators()],
      clave: ['', this.validators.getClaveValidators()],
      repiteClave: ['', this.validators.getConfirmarClaveValidator('clave')],
      imagen1: [null, this.validators.getImagenValidators()],
      imagen2: [null, this.validators.getImagenValidators()],
      recaptcha: [''],
    });
  }

  getError(campo: string): string | null {
    const etiquetas = {
      nombre: 'Nombre',
      apellido: 'Apellido',
      edad: 'Edad',
      dni: 'DNI',
      obraSocial: 'Obra social',
      email: 'Email',
      clave: 'Contraseña',
      repiteClave: 'Repetir contraseña',
      imagen1: 'Imagen 1',
      imagen2: 'Imagen 2',
    };
    return this.validators.getRegistroError(campo, this.form, etiquetas);
  }

onToggleCaptcha() {
  if (!this.captchaEnabled) {
    this.captchaPassed = true;
  } else {
    this.captchaPassed = false;
  }
  this.captchaWrapper?.toggleCaptcha();
}

  toggleVerClave(): void { this.verClave = !this.verClave; }
  toggleVerClaveR(): void { this.verClaveR = !this.verClaveR; }

  onFileSelect(event: any, campo: 'imagen1' | 'imagen2') {
    const result = this.formUtils.handleFileChange(event, this.form, campo);
    if (campo === 'imagen1') {
      this.nombreArchivo1 = result.nombreArchivo;
      this.archivoSeleccionado1 = result.archivo;
    } else {
      this.nombreArchivo2 = result.nombreArchivo;
      this.archivoSeleccionado2 = result.archivo;
    }
  }






async cargarCaptchaPersistente() {
  if (!this.captchaWrapper) return;
  const tokenGuardado = localStorage.getItem('captcha_token');
  if (tokenGuardado) {
    const captchaData = await this.captchaWrapper.recuperarCaptcha(tokenGuardado);
    if (captchaData) return;
  }
  await this.captchaWrapper.generarNuevoCaptchaWrapper();
}

onCaptchaSolved(esValido: boolean) { this.captchaPassed = esValido; }



async registrar() {
  this.formUtils.markAllAsTouched(this.form);
  if (this.form.invalid) return;
  if (this.captchaEnabled && !this.captchaPassed) return alert('Captcha requerido');

  this.cargando = true;
  try {
    await this.procesarRegistro();
    this.mostrarExito();
    setTimeout(() => this.router.navigate(['/login']), 3000);
  } catch (error: any) {
    this.mostrarError(error.message || 'No se pudo completar el registro.');
  } finally { this.cargando = false; }
}






  quitarArchivo(campo: 'imagen1' | 'imagen2'): void {
    this.formUtils.quitarArchivo(this.form, campo);
    if (campo === 'imagen1') {
      this.nombreArchivo1 = null;
      this.archivoSeleccionado1 = null;
    } else {
      this.nombreArchivo2 = null;
      this.archivoSeleccionado2 = null;
    }
  



  }  onCaptchaResolved(token: string): void {
    this.captchaResuelto = true;
    this.form.patchValue({ recaptcha: token });
    this.form.get('recaptcha')?.setErrors(null);
  }

  onCaptchaError(): void {
    this.captchaResuelto = false;
    this.form.get('recaptcha')?.setErrors({ captchaError: true });
  }

  onCaptchaExpired(): void {
    this.captchaResuelto = false;
    this.form.patchValue({ recaptcha: '' });
    this.form.get('recaptcha')?.setErrors({ required: true });
  }

  


  private async procesarRegistro(): Promise<void> {
    const valores = this.form.value;

    const { user, error: authError } = await this.authSrv.registrar(valores.email, valores.clave);
    if (authError || !user) throw new Error(authError?.message || 'Error al registrar usuario.');

    const authId = user.id;

    let imagenUrl1 = '';
    let imagenUrl2 = '';

    if (this.archivoSeleccionado1) imagenUrl1 = await this.storage.subirImagen(this.archivoSeleccionado1);
    if (this.archivoSeleccionado2) imagenUrl2 = await this.storage.subirImagen(this.archivoSeleccionado2);

    const paciente: Paciente = {
      auth_id: authId,
      nombre: valores.nombre,
      apellido: valores.apellido,
      edad: valores.edad,
      dni: valores.dni,
      email: valores.email,
      tipo_usuario: 'paciente',
      estado: 'pendiente',
      imagen_perfil: imagenUrl1,
      obra_social: valores.obraSocial,
      segunda_imagen: imagenUrl2,
    };

    await this.pacienteSrv.guardar(paciente);
  }

  private mostrarError(texto: string): void {
    this.mensaje = { titulo: 'Error', texto, tipo: 'error' };
  }

  private mostrarExito(): void {
    this.mensaje = {
      titulo: '¡Registro exitoso!',
      texto:
        'Tu cuenta fue creada correctamente. Podés iniciar sesión una vez que se verifique tu email. 🎉',
      tipo: 'success',
    };
  }
}
