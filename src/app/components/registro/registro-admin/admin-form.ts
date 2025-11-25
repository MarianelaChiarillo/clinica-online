import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { MenuComponent } from '../../componentes/menu/menu.component';
import { LayoutComponent } from '../../componentes/layout/layout.component';
import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { CaptchaComponent } from '../../componentes/captcha/captcha.component';

import { FormUtilsService } from '../../../services/forms.utils.service';
import { AuthService } from '../../../services/auth.service';
import { StorageService } from '../../../services/storage.service';
import { AdministradorService } from '../../../services/usuarios/administrador.service';
import { EspecialidadService } from '../../../services/usuarios/especialidad.service';

@Component({
  selector: 'app-administrador-form',
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
  captchaResuelto = false;
  verClave = false;
  verClaveR = false;

  // ✅ Lista de especialidades (aunque los admins no las usan, evita errores en el template)
  especialidades: any[] = [];

  constructor(
    private fb: FormBuilder,
    private formUtils: FormUtilsService,
    private authSrv: AuthService,
    private storage: StorageService,
    private router: Router,
    private adminSrv: AdministradorService,
    private especialidadSrv: EspecialidadService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group(
      {
        nombre: ['', [Validators.required, Validators.minLength(2)]],
        apellido: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        dni: ['', [Validators.required, Validators.minLength(7)]],
        edad: ['', [Validators.required, Validators.min(18)]],
        clave: ['', [Validators.required, Validators.minLength(6)]],
        repiteClave: ['', Validators.required],
        imagen: [null],
        recaptcha: [''],
      },
      { validators: this.confirmarClaveValidator }
    );
  }

  private confirmarClaveValidator(form: FormGroup) {
    const clave = form.get('clave')?.value;
    const repite = form.get('repiteClave')?.value;
    return clave === repite ? null : { clavesNoCoinciden: true };
  }




  onCaptchaResolved(event: any): void {
    const token = typeof event === 'string' ? event : event?.token;
    if (!token) return;

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

  quitarArchivo(): void {
    this.formUtils.quitarArchivo(this.form, 'imagen', 'imagen');
    this.nombreArchivo = null;
    this.archivoSeleccionado = null;
  }

  async registrar(): Promise<void> {
    this.formUtils.markAllAsTouched(this.form);

    if (this.form.invalid) {
      this.mostrarError('Por favor completá todos los campos requeridos.');
      return;
    }

    this.cargando = true;
    this.mensaje = null;

    try {
      const valores = this.form.value;

      // ✅ Registrar en Supabase Auth
      const { user, error: authError } = await this.authSrv.registrar(
        valores.email,
        valores.clave
      );

      if (authError || !user)
        throw new Error(authError?.message || 'Error al registrar usuario.');

      // ✅ Subir imagen (si hay)
      const imagenUrl = this.archivoSeleccionado
        ? await this.storage.subirImagen(this.archivoSeleccionado)
        : undefined;

      // ✅ Crear registro en la tabla administradores
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
    } catch (error: any) {
      console.error(error);
      this.mostrarError(error.message || 'No se pudo registrar el administrador.');
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
}
