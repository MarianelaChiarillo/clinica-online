import { Component, OnInit } from '@angular/core';
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
import { MenuComponent } from '../../componentes/menu/menu.component';
import { LayoutComponent } from '../../componentes/layout/layout.component';
import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { CaptchaComponent } from '../../componentes/captcha/captcha.component';

@Component({
  selector: 'app-paciente-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MenuComponent,
    LayoutComponent,
    MensajeComponent,
    SpinnerComponent,
    CaptchaComponent,
  ],
  templateUrl: './paciente-form.html',
  styleUrls: ['./paciente-form.scss'],
})
export class PacienteForm implements OnInit {
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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private formUtils: FormUtilsService,
    private validators: PacienteValidatorsService,
    private authSrv: AuthService,
    private storage: StorageService,
    private pacienteSrv: PacienteService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group(
      {
        nombre: ['', this.validators.getNombreValidators()],
        apellido: ['', this.validators.getApellidoValidators()],
        edad: ['', this.validators.getEdadValidators()],
        dni: ['', this.validators.getDniValidators()],
        obraSocial: ['', this.validators.getObraSocialValidators()],
        email: ['', this.validators.getEmailValidators()],
        clave: ['', this.validators.getClaveValidators()],
        repiteClave: ['', [Validators.required]],
        imagen1: [null, this.validators.getImagenValidators()],
        imagen2: [null, this.validators.getImagenValidators()],
        recaptcha: [''],
      },
      { validators: [this.validators.getConfirmarClaveValidator()] }
    );
  }



getError(controlName: string): string | null {
  const ctrl = this.form.get(controlName);
  if (!ctrl || !ctrl.errors || !ctrl.touched) return null;

  const errores = ctrl.errors;

  // Built-in Angular
  if (errores['required']) return 'Este campo es obligatorio';
  if (errores['email']) return 'Formato de email inválido';
  if (errores['minlength']) {
    return `Debe tener al menos ${errores['minlength'].requiredLength} caracteres`;
  }
  if (errores['maxlength']) {
    return `No puede superar ${errores['maxlength'].requiredLength} caracteres`;
  }

  // Validadores personalizados (ya devuelven mensajes)
  if (errores['requerido']) return errores['requerido'];
  if (errores['largoMin']) return errores['largoMin'];
  if (errores['letraNumero']) return errores['letraNumero'];
  if (errores['clavesNoCoinciden']) return errores['clavesNoCoinciden'];
  if (errores['emailInvalido']) return errores['emailInvalido'];
  if (errores['dominioInvalido']) return errores['dominioInvalido'];
  if (errores['nombreCorto']) return errores['nombreCorto'];
  if (errores['nombreLargo']) return errores['nombreLargo'];
  if (errores['nombreInvalido']) return errores['nombreInvalido'];
  if (errores['apellidoCorto']) return errores['apellidoCorto'];
  if (errores['apellidoLargo']) return errores['apellidoLargo'];
  if (errores['apellidoInvalido']) return errores['apellidoInvalido'];
  if (errores['dniInvalido']) return errores['dniInvalido'];
  if (errores['tamañoDNI']) return errores['tamañoDNI'];
  if (errores['rangoDNI']) return errores['rangoDNI'];
  if (errores['edadInvalida']) return errores['edadInvalida'];
  if (errores['edadNegativa']) return errores['edadNegativa'];
  if (errores['edadMayor']) return errores['edadMayor'];
  if (errores['edadMenor']) return errores['edadMenor'];
  if (errores['obraSocialRequerida']) return errores['obraSocialRequerida'];
  if (errores['obraSocialCorta']) return errores['obraSocialCorta'];
  if (errores['obraSocialInvalida']) return errores['obraSocialInvalida'];
  if (errores['tipoArchivoInvalido']) return errores['tipoArchivoInvalido'];
  if (errores['archivoMuyGrande']) return errores['archivoMuyGrande'];

  // Si hay varios errores, concatenamos los mensajes
  const mensajes = Object.values(errores).filter(v => typeof v === 'string');
  return mensajes.length ? mensajes.join(' · ') : null;
}

  toggleVerClave(): void { this.verClave = !this.verClave; }
  toggleVerClaveR(): void { this.verClaveR = !this.verClaveR; }

  fileName1: string | null = null;
  fileName2: string | null = null;

  onFileSelect(event: any, campo: 'imagen1' | 'imagen2') {
    const archivo = event.target.files[0];

    if (archivo) {
      if (campo === 'imagen1') this.fileName1 = archivo.name;
      if (campo === 'imagen2') this.fileName2 = archivo.name;

      this.onFileChange(event, campo);
    }
  }

  onCaptchaResolved(token: string): void {
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


  
  onFileChange(event: any, campo: 'imagen1' | 'imagen2'): void {
    const result = this.formUtils.handleFileChange(event, this.form, campo);
    if (campo === 'imagen1') {
      this.nombreArchivo1 = result.nombreArchivo;
      this.archivoSeleccionado1 = result.archivo;
    } else {
      this.nombreArchivo2 = result.nombreArchivo;
      this.archivoSeleccionado2 = result.archivo;
    }
  }

  quitarArchivo(campo: 'imagen1' | 'imagen2'): void {
    this.formUtils.quitarArchivo(this.form, campo, campo);
    if (campo === 'imagen1') {
      this.nombreArchivo1 = null;
      this.archivoSeleccionado1 = null;
    } else {
      this.nombreArchivo2 = null;
      this.archivoSeleccionado2 = null;
    }
  }

  async registrar(): Promise<void> {
    this.formUtils.markAllAsTouched(this.form);
    console.log(this.form.value);
    console.log(this.form.errors);
    console.log(this.form.status);
    console.log(this.form.invalid);
    console.log(this.form);
    if (!this.validarFormulario()) return;
    this.formUtils.markAllAsTouched(this.form);

    this.cargando = true;
    this.mensaje = null;

    try {
      await this.procesarRegistro();
      this.mostrarExito();
      setTimeout(() => this.router.navigate(['/login']), 3000);
    } catch (error: any) {
      this.mostrarError(error.message || 'No se pudo completar el registro.');
    } finally {
      this.cargando = false;
    }
  }

  private validarFormulario(): boolean {
    if (this.form.invalid) {
      const errores = Object.entries(this.form.controls)
        .filter(([_, ctrl]) => ctrl.invalid)
        .map(([nombre, ctrl]) => `${nombre}: ${JSON.stringify(ctrl.errors)}`)
        .join('\n');
      console.warn('❌ Errores detectados en formulario:\n' + errores);

      this.mostrarError('Por favor corregí los errores antes de continuar.');
      return false;
    }
    return true;
  }

  private async procesarRegistro(): Promise<void> {
    const valores = this.form.value;

    const { user, error: authError } = await this.authSrv.registrar(valores.email, valores.clave);
    if (authError || !user) {
      throw new Error(authError?.message || 'Error al registrar usuario.');
    }

    const authId = user.id;

    let imagenUrl1 = '';
    let imagenUrl2 = '';

    if (this.archivoSeleccionado1)
      imagenUrl1 = await this.storage.subirImagen(this.archivoSeleccionado1);
    if (this.archivoSeleccionado2)
      imagenUrl2 = await this.storage.subirImagen(this.archivoSeleccionado2);

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
