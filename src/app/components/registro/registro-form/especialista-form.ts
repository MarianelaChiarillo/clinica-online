import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';
import { Especialista } from '../../../models/user-data';
import { nombreValidator, apellidoValidator } from '../../../validators/nombre-apellido.validator';
import { emailDominioValidator } from '../../../validators/email-dominio.validator';
import { confirmarClaveValidator } from '../../../validators/confirmar-clave.validator';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { LayoutComponent } from '../../componentes/layout/layout.component';
import { MensajeComponent } from '../../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

@Component({
  selector: 'app-especialista-form',
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
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
  ],
  templateUrl: './especialista-form.html',
  styleUrl: './especialista-form.scss',
})
export class EspecialistaForm implements OnInit {
  public form!: FormGroup;
  public cargando = false;
  public mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;
  public especialidades = ['Cardiología', 'Pediatría', 'Dermatología', 'Neurología'];
public verClave = false;
public verClaveR = false;

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
        edad: ['', [Validators.required, Validators.min(18)]],
        dni: ['', Validators.required],
        especialidades: [[], Validators.required],
        especialidadPersonalizada: [''],
        email: ['', [Validators.required, Validators.email, emailDominioValidator]],
        clave: ['', [Validators.required, Validators.minLength(6)]],
        repiteClave: ['', [Validators.required]],
        imagen: [null, Validators.required],
      },
      {
        validators: [confirmarClaveValidator()],
      }
    );
  }
public toggleVerClave(): void {
  this.verClave = !this.verClave;
}

public toggleVerClaveR(): void {
  this.verClaveR = !this.verClaveR;
}

  public onFileChange(event: any): void {
    const archivo = event.target.files[0];
    if (archivo) {
      this.form.get('imagen')?.setValue(archivo);
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
    const archivo = valores.imagen as File;
    const subida = await this.supabaseService.subirImagen(archivo);
    const imagenUrl = subida.data;

    let especialidadesFinales = [...valores.especialidades];
    if (especialidadesFinales.includes('otra') && valores.especialidadPersonalizada) {
      especialidadesFinales = especialidadesFinales
        .filter((esp: string) => esp !== 'otra')
        .concat(valores.especialidadPersonalizada);
    }

    const especialista: Especialista = {
      nombre: valores.nombre,
      apellido: valores.apellido,
      edad: valores.edad,
      dni: valores.dni,
      email: valores.email,
      pass: valores.clave,
      rol: 'especialista',
      especialidad: especialidadesFinales[0],
      especialidades: especialidadesFinales,
      aprobado: false,
      imagenPerfil: imagenUrl,
      authId,
      created_at: '',
    };

    await this.supabaseService.guardarEspecialista(especialista, authId);

    this.cargando = false;
    this.mensaje = {
      titulo: '¡Registro exitoso!',
      texto: 'Tu cuenta fue creada correctamente 🎉',
      tipo: 'success',
    };

    this.form.markAsPristine();
    setTimeout(() => this.router.navigate(['/home']), 2000);
  }

    public getError(controlName: string): string | null {
    const control = this.form.get(controlName);
    
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    const errors = control.errors;
    
    if (errors['required']) {
      return `${this.getFieldLabel(controlName)} es obligatorio.`;
    }
    
    // Para email
    if (controlName === 'email') {
      if (errors['email']) {
        return 'El formato del email es inválido.';
      }
      if (errors['dominioInvalido']) {
        return errors['dominioInvalido'];
      }
    }
    
    // Para clave
    if (controlName === 'clave' && errors['minlength']) {
      return 'La clave debe tener al menos 6 caracteres.';
    }
    
    // Para repiteClave
    if (controlName === 'repiteClave' && errors['clavesNoCoinciden']) {
      return 'Las claves no coinciden.';
    }
    
    // Para nombre
    if (controlName === 'nombre') {
      if (errors['nombreInvalido']) {
        return errors['nombreInvalido'];
      }
      if (errors['nombreCorto']) {
        return errors['nombreCorto'];
      }
    }
    
    // Para apellido
    if (controlName === 'apellido') {
      if (errors['apellidoInvalido']) {
        return errors['apellidoInvalido'];
      }
      if (errors['apellidoCorto']) {
        return errors['apellidoCorto'];
      }
    }
    
    return null;
  }

  private getFieldLabel(controlName: string): string {
    const labels: {[key: string]: string} = {
      'nombre': 'El nombre',
      'apellido': 'El apellido', 
      'email': 'El email',
      'clave': 'La clave',
      'repiteClave': 'La confirmación de clave'
    };
    return labels[controlName] || 'Este campo';
  }

}