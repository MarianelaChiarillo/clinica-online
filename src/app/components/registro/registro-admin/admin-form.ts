import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';

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

  especialidades: any[] = [];

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
  }

  private initForm(): void {
    this.form = this.fb.group({
      nombre: ['', this.registroValidators.getNombreValidators()],
      apellido: ['', this.registroValidators.getApellidoValidators()],
      email: ['', this.registroValidators.getEmailValidators()],
      dni: ['', this.registroValidators.getDniValidators()],
      edad: ['', this.registroValidators.getEdadEspecialistaValidators()],
      clave: ['', this.registroValidators.getClaveValidators()],
      repiteClave: ['', this.registroValidators.getConfirmarClaveValidator('clave')],
      imagen: [null, this.registroValidators.getImagenValidators()],
      recaptcha: ['']
    });
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
    this.formUtils.quitarArchivo(this.form, 'imagen');
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
