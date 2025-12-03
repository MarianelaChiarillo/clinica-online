import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../services/auth.service';
import { EspecialidadService } from '../../../services/usuarios/especialidad.service';
import { EspecialistaService } from '../../../services/usuarios/especialista.service';
import { StorageService } from '../../../services/storage.service';
import { RegistroValidatorsService } from '../../../validators/registro.validator';
import { UtilsService } from '../../../services/utils.service';

import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { CaptchaComponent } from '../../componentes/captcha/captcha.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import supabase from '../../../services/supabase.client';

@Component({
  selector: 'app-especialista-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MensajeComponent,
    SpinnerComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    CaptchaComponent
  ],
  templateUrl: './especialista-form.html',
  styleUrls: ['./especialista-form.scss'],
})
export class EspecialistaForm implements OnInit {
  public form!: FormGroup;
  public cargando = false;
  public mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;
  public especialidades: any[] = [];
  public cargandoEspecialidades = true;
  public verClave = false;
  public verClaveR = false;
  public archivoSeleccionado: File | null = null;
  public fileName1: string = '';
  public captchaResuelto = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private formUtils: UtilsService,
    private authSrv: AuthService,
    private storage: StorageService,
    private especialistaSrv: EspecialistaService,
    private especialidadSrv: EspecialidadService,
    private validators: RegistroValidatorsService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarEspecialidades();
  }

  private initForm(): void {
    this.form = this.fb.group({
      nombre: ['', this.validators.getNombreValidators()],
      apellido: ['', this.validators.getApellidoValidators()],
      edad: ['', this.validators.getEdadEspecialistaValidators()],
      dni: ['', this.validators.getDniValidators()],
      especialidades: [[], this.validators.getEspecialidadesValidators()],
      especialidadesPersonalizadas: this.fb.array([]),
      email: ['', this.validators.getEmailValidators()],
      clave: ['', this.validators.getClaveValidators()],
      repiteClave: ['', this.validators.getConfirmarClaveValidator('clave')],
      imagen: [null, this.validators.getImagenValidators()],
      recaptcha: ['']
    });
  }

  get especialidadesPersonalizadas(): FormArray {
    return this.form.get('especialidadesPersonalizadas') as FormArray;
  }

  get especialidadesPersonalizadasControls(): FormControl[] {
    return this.especialidadesPersonalizadas.controls as FormControl[];
  }

  agregarEspecialidadPersonalizada(): void {
    this.especialidadesPersonalizadas.push(this.fb.control('', Validators.required));
  }

  eliminarEspecialidadPersonalizada(index: number): void {
    this.especialidadesPersonalizadas.removeAt(index);
  }

  getError(campo: string): string | null {
    const etiquetas: { [key: string]: string } = {
      nombre: 'Nombre',
      apellido: 'Apellido',
      edad: 'Edad',
      dni: 'DNI',
      especialidades: 'Especialidades',
      email: 'Email',
      clave: 'Contraseña',
      repiteClave: 'Repetir contraseña',
      imagen: 'Imagen',
      recaptcha: 'Captcha'
    };
    return this.validators.getRegistroError(campo, this.form, etiquetas);
  }

  private async cargarEspecialidades(): Promise<void> {
    try {
      this.cargandoEspecialidades = true;
      this.especialidades = await this.especialidadSrv.obtenerTodas();
    } catch {
      this.mostrarError('Error al cargar especialidades');
    } finally {
      this.cargandoEspecialidades = false;
    }
  }

  toggleVerClave(): void { this.verClave = !this.verClave; }
  toggleVerClaveR(): void { this.verClaveR = !this.verClaveR; }

  // --- Archivos ---
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileName1 = input.files[0].name;
      this.archivoSeleccionado = input.files[0];
      this.form.patchValue({ imagen: this.archivoSeleccionado });
    }
  }

  quitarArchivo(): void {
    this.fileName1 = '';
    this.archivoSeleccionado = null;
    this.form.patchValue({ imagen: null });
  }

  // --- Registro ---
  async registrar(): Promise<void> {
    this.formUtils.markAllAsTouched(this.form);

    if (this.form.invalid) {
      this.mostrarError('Por favor corregí los errores antes de continuar.');
      return;
    }

    this.cargando = true;
    this.mensaje = null;

    try {
      const valores = this.form.value;

      const { user, error: authError } = await this.authSrv.registrar(valores.email, valores.clave);
      if (authError || !user) throw new Error(authError?.message || 'Error al registrar usuario');

      let imagenUrl = '';
      if (this.archivoSeleccionado) {
        imagenUrl = await this.storage.subirImagen(this.archivoSeleccionado);
      }

      const seleccionadasIds = valores.especialidades.filter((id: any) => typeof id === 'number');
      let nuevasEspecialidadesIds: number[] = [];
      if (valores.especialidades.includes('otra') && valores.especialidadesPersonalizadas.length) {
        nuevasEspecialidadesIds = await this.crearEspecialidadesPersonalizadas(valores.especialidadesPersonalizadas);
      }
      const todasLasEspecialidades = [...seleccionadasIds, ...nuevasEspecialidadesIds];
      if (todasLasEspecialidades.length === 0) throw new Error('Debés seleccionar al menos una especialidad');

      await this.especialistaSrv.guardar({
        auth_id: user.id,
        nombre: valores.nombre,
        apellido: valores.apellido,
        edad: valores.edad,
        dni: valores.dni,
        email: valores.email,
        tipo_usuario: 'especialista',
        imagen_perfil: imagenUrl,
        estado: 'pendiente',
        aprobado: false
      }, user.id, todasLasEspecialidades);

      this.mostrarExito();
      setTimeout(() => this.router.navigate(['/login']), 3000);

    } catch (error: any) {
      this.mostrarError(error.message || 'No se pudo completar el registro.');
    } finally {
      this.cargando = false;
    }
  }

  private async crearEspecialidadesPersonalizadas(especialidades: string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const nombre of especialidades) {
      if (!nombre.trim()) continue;
      const nueva = await this.especialidadSrv.crear(nombre.trim());
      if (nueva?.id) ids.push(nueva.id);
    }
    return ids;
  }

  private mostrarError(texto: string): void {
    this.mensaje = { titulo: 'Error', texto, tipo: 'error' };
  }

  private mostrarExito(): void {
    this.mensaje = {
      titulo: '¡Registro exitoso!',
      texto: 'Tu cuenta fue creada correctamente. Esperá la aprobación de un administrador.',
      tipo: 'success',
    };
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
}
