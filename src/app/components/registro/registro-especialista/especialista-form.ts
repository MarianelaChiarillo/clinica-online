import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormUtilsService } from '../../../services/forms.utils.service';
import { EspecialistaValidatorsService } from '../../../validators/especialista.validator';
import { Especialista } from '../../../models/user-data';

import { AuthService } from '../../../services/auth.service';
import { EspecialidadService } from '../../../services/usuarios/especialidad.service';
import { EspecialistaService } from '../../../services/usuarios/especialista.service';
import {StorageService} from '../../../services/storage.service';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { LayoutComponent } from '../../componentes/layout/layout.component';
import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { CaptchaComponent } from '../../componentes/captcha/captcha.component';

@Component({
  selector: 'app-especialista-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MenuComponent,
    LayoutComponent,
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
  public nombreArchivo1: string | null = null;
  public archivoSeleccionado: File | null = null;
  public captchaResuelto = false;
  public archivoSeleccionado1: File | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private formUtils: FormUtilsService,
    private validators: EspecialistaValidatorsService,
    private authSrv: AuthService,
    private storage: StorageService,
    private especialistaSrv: EspecialistaService,
    private especialidadSrv: EspecialidadService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarEspecialidades();
  }

  private initForm(): void {
    this.form = this.fb.group(
      {
        nombre: ['', this.validators.getNombreValidators()],
        apellido: ['', this.validators.getApellidoValidators()],
        edad: ['', this.validators.getEdadValidators()],
        dni: ['', this.validators.getDniValidators()],
        especialidades: [[], this.validators.getEspecialidadesValidators()],
        especialidadesPersonalizadas: this.fb.array([]),
        email: ['', this.validators.getEmailValidators()],
        clave: ['', this.validators.getClaveValidators()],
        repiteClave: ['', [Validators.required]],
        imagen: [null, this.validators.getImagenValidators()],
        recaptcha: [''],
      },
      { validators: [this.validators.getConfirmarClaveValidator()] }
    );
  }

  // 🧩 Captcha
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

 
  toggleVerClave(): void { this.verClave = !this.verClave; }
  toggleVerClaveR(): void { this.verClaveR = !this.verClaveR; }



  fileName1: string | null = null;
  fileName2: string | null = null;


onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;

  if (input.files && input.files.length > 0) {
    const file = input.files[0];

    this.archivoSeleccionado1 = file;

    // Guardamos solo el FILE en el form
    this.form.get('imagen')?.setValue(file);

    this.fileName1 = file.name;
  } else {
    this.form.get('imagen')?.setValue(null);
    this.fileName1 = null;
  }
}

getError(campo: string): string | null {
  const control = this.form.get(campo);
  if (control?.hasError('required')) {
    return 'Este campo es obligatorio';
  }
  if (control?.hasError('email')) {
    return 'El formato del email no es válido';
  }
  if (control?.hasError('minlength')) {
    return `Debe tener al menos ${control.errors?.['minlength'].requiredLength} caracteres`;
  }
  if (control?.hasError('maxlength')) {
    return `No puede superar ${control.errors?.['maxlength'].requiredLength} caracteres`;
  }
  if (campo === 'repiteClave' && control?.hasError('mismatch')) {
    return 'Las contraseñas no coinciden';
  }
  return null;
}

  // 🧩 Especialidades personalizadas
  get especialidadesPersonalizadas(): FormArray<FormControl> {
    return this.form.get('especialidadesPersonalizadas') as FormArray<FormControl>;
  }

  agregarEspecialidadPersonalizada(): void {
    this.especialidadesPersonalizadas.push(this.fb.control('', Validators.required));
  }

  eliminarEspecialidadPersonalizada(index: number): void {
    this.especialidadesPersonalizadas.removeAt(index);
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

  // 🧩 Registro principal
  async registrar(): Promise<void> {
    this.formUtils.markAllAsTouched(this.form);

    if (!this.validarFormulario()) return;

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

    // 1️⃣ Crear usuario en Auth
    const { user, error: authError } = await this.authSrv.registrar(valores.email, valores.clave);
    if (authError || !user) {
      throw new Error(authError?.message || 'Error al registrar usuario');
    }

    const authId = user.id;

    // 2️⃣ Subir imagen
    let imagenUrl = '';
    if (this.archivoSeleccionado) {
      imagenUrl = await this.storage.subirImagen(this.archivoSeleccionado);
    }

    // 3️⃣ Procesar especialidades
    const seleccionadasIds = valores.especialidades.filter((id: any) => typeof id === 'number');

    // 4️⃣ Especialidades personalizadas
    let nuevasEspecialidadesIds: number[] = [];
    if (valores.especialidades.includes('otra') && valores.especialidadesPersonalizadas.length > 0) {
      nuevasEspecialidadesIds = await this.crearEspecialidadesPersonalizadas(valores.especialidadesPersonalizadas);
    }

    const todasLasEspecialidades = [...seleccionadasIds, ...nuevasEspecialidadesIds];
    if (todasLasEspecialidades.length === 0) {
      throw new Error('Debés seleccionar al menos una especialidad');
    }

    // 5️⃣ Crear perfil especialista
    const especialista: Especialista = {
      auth_id: authId,
      nombre: valores.nombre,
      apellido: valores.apellido,
      edad: valores.edad,
      dni: valores.dni,
      email: valores.email,
      tipo_usuario: 'especialista',
      imagen_perfil: imagenUrl,
      estado: 'pendiente',
      aprobado: false
    };

    await this.especialistaSrv.guardar(especialista, authId, todasLasEspecialidades);
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
      texto: 'Tu cuenta fue creada correctamente. Esperá la aprobación de un administrador para poder ingresar.',
      tipo: 'success',
    };
  }
}
