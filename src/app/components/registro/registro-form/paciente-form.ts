import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';
import { Paciente } from '../../../models/user-data';
import { nombreValidator, apellidoValidator } from '../../../validators/nombre-apellido.validator';
import { emailDominioValidator } from '../../../validators/email-dominio.validator';
import { confirmarClaveValidator } from '../../../validators/confirmar-clave.validator';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { LayoutComponent } from '../../componentes/layout/layout.component';
import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';

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
  ],
  templateUrl: './paciente-form.html',
  styleUrl: './paciente-form.scss',
})
export class PacienteForm implements OnInit {
  public form!: FormGroup;
  public cargando = false;
  public verClave = false;
  public verClaveR = false;
  public mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.form = this.formBuilder.group(
      {
        nombre: ['', [Validators.required, nombreValidator()]],
        apellido: ['', [Validators.required, apellidoValidator()]],
        edad: ['', [Validators.required, Validators.min(0)]],
        dni: ['', Validators.required],
        obraSocial: ['', Validators.required],
        email: ['', [Validators.required, Validators.email, emailDominioValidator]],
        clave: ['', [Validators.required, Validators.minLength(6)]],
        repiteClave: ['', [Validators.required]],
        imagen1: [null, Validators.required],
        imagen2: [null, Validators.required],
      },
      {
        validators: [confirmarClaveValidator()],
      }
    );
  }

  public onFileChange(event: any, campo: 'imagen1' | 'imagen2'): void {
    const archivo = event.target.files[0];
    if (archivo) {
      this.form.get(campo)?.setValue(archivo);
    }
  }

  public async registrar(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.mensaje = {
        titulo: 'Formulario inválido',
        texto: 'Por favor corregí los errores antes de continuar.',
        tipo: 'error',
      };
      return;
    }

    this.cargando = true;
    const valores = this.form.value;

    const { data, error } = await this.supabaseService.registrarUsuario(valores.email, valores.clave);
    if (error || !data?.user?.id) {
      this.cargando = false;
      this.mensaje = {
        titulo: 'Registro fallido',
        texto: error?.message?.includes('already registered')
          ? 'Ya existe un usuario con ese email.'
          : 'No se pudo completar el registro. Intentá de nuevo.',
        tipo: 'error',
      };
      return;
    }

    const authId = data.user.id;
    const archivo1 = valores.imagen1 as File;
    const archivo2 = valores.imagen2 as File;
    const subida1 = await this.supabaseService.subirImagen(archivo1);
    const subida2 = await this.supabaseService.subirImagen(archivo2);

    const paciente: Paciente = {
      nombre: valores.nombre,
      apellido: valores.apellido,
      edad: valores.edad,
      dni: valores.dni,
      email: valores.email,
      pass: valores.clave,
      rol: 'paciente',
      obraSocial: valores.obraSocial,
      imagenPerfil: subida1.data,
      imagenPerfil2: subida2.data,
      authId,
      created_at: '',
    };

    await this.supabaseService.guardarPaciente(paciente, authId);

    this.cargando = false;
    this.mensaje = {
      titulo: '¡Registro exitoso!',
      texto: 'Tu cuenta fue creada correctamente 🎉',
      tipo: 'success',
    };

    this.form.markAsPristine();
    setTimeout(() => this.router.navigate(['/home']), 2000);
  }

  public toggleVerClave(): void {
    this.verClave = !this.verClave;
  }

  public toggleVerClaveR(): void {
    this.verClaveR = !this.verClaveR;
  }

  public getError(controlName: string): string | null {
    const control = this.form.get(controlName);
    if (!control || !control.touched || !control.errors) return null;

    const errors = control.errors;
    if (errors['required']) return `${this.getFieldLabel(controlName)} es obligatorio.`;
    if (controlName === 'email') {
      if (errors['email']) return 'El formato del email es inválido.';
      if (errors['dominioInvalido']) return errors['dominioInvalido'];
    }
    if (controlName === 'clave' && errors['minlength']) return 'La clave debe tener al menos 6 caracteres.';
    if (controlName === 'repiteClave' && errors['clavesNoCoinciden']) return 'Las claves no coinciden.';
    if (controlName === 'nombre' && errors['nombreInvalido']) return errors['nombreInvalido'];
    if (controlName === 'nombre' && errors['nombreCorto']) return errors['nombreCorto'];
    if (controlName === 'apellido' && errors['apellidoInvalido']) return errors['apellidoInvalido'];
    if (controlName === 'apellido' && errors['apellidoCorto']) return errors['apellidoCorto'];

    return null;
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      nombre: 'El nombre',
      apellido: 'El apellido',
      edad: 'La edad',
      dni: 'El DNI',
      obraSocial: 'La obra social',
      email: 'El email',
      clave: 'La clave',
      repiteClave: 'La confirmación de clave',
      imagen1: 'La imagen 1',
      imagen2: 'La imagen 2',
    };
    return labels[controlName] || 'Este campo';
  }
}
