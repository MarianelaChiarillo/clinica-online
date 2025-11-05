import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SupabaseService } from '../../services/supabase.service';
import { MensajeComponent } from '../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../componentes/spinner/spinner.component';
import { MenuComponent } from '../componentes/menu/menu.component';
import { claveSeguraValidator } from '../../validators/clave.validator';
import { emailDominioValidator } from '../../validators/email-dominio.validator';
import { LayoutComponent } from '../componentes/layout/layout.component';

interface MensajeAlerta {
  titulo: string;
  texto: string;
  tipo: 'error' | 'success' | 'info';
}

interface UsuarioAcceso {
  src: string;
  alt: string;
  email: string;
  pass: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MensajeComponent,
    SpinnerComponent,
    MenuComponent,
    LayoutComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public form!: FormGroup;
  public cargando: boolean = false;
  public verClave: boolean = false;
  public mensaje: MensajeAlerta | null = null;

  // En tu componente TypeScript
public accesos: Array<{
  src: string;
  alt: string;
  email: string;
  pass: string;
  rol: string;
}> = [
  // 3 Pacientes
  {
    src: 'assets/images/blobs.png',
    alt: 'Paciente Alexia',
    email: 'alexach@gmail.com',
    pass: 'alexita1',
    rol: 'Paciente'
  },
  {
    src: 'assets/images/blobs.png',
    alt: 'Paciente Juan',
    email: 'juanperez@gmail.com',
    pass: 'juani123',
    rol: 'Paciente'
  },
  {
    src: 'assets/images/blobs.png',
    alt: 'Paciente María',
    email: 'mariag@gmail.com',
    pass: 'maria456',
    rol: 'Paciente'
  },
  // 2 Especialistas
  {
    src: 'assets/images/blobs.png',
    alt: 'Especialista Dr. López',
    email: 'drlopez@clinica.com',
    pass: 'doctor123',
    rol: 'Especialista'
  },
  {
    src: 'assets/images/blobs.png',
    alt: 'Especialista Dra. García',
    email: 'dragarcia@clinica.com',
    pass: 'dra456',
    rol: 'Especialista'
  },
  // 1 Admin
  {
    src: 'assets/images/blobs.png',
    alt: 'Administrador',
    email: 'admin@clinica.com',
    pass: 'admin789',
    rol: 'Admin'
  }
];

// Y actualiza el método completarYAcceder si es necesario
public completarYAcceder(email: string, pass: string): void {
  this.form.patchValue({ 
    usuario: email, 
    clave: pass 
  });
  this.form.markAsTouched();
  
  // Opcional: auto-login después de completar
  setTimeout(() => {
    this.iniciarSesion();
  }, 500);
}

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  public ngOnInit(): void {
    this.inicializarFormulario();
  }

  private inicializarFormulario(): void {
    this.form = this.formBuilder.group({
      usuario: ['', [Validators.required, emailDominioValidator]],
      clave: ['', [Validators.required, claveSeguraValidator]],
    });
  }

  public get usuario() {
    return this.form.get('usuario');
  }

  public get clave() {
    return this.form.get('clave');
  }

  public async iniciarSesion(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.mostrarMensajeError('Datos inválidos', 'Verificá usuario y contraseña antes de continuar.');
      this.limpiarFormulario();
      return;
    }

    this.cargando = true;
    const valores = this.form.value;

    try {
      const { data, error } = await this.supabaseService.iniciarSesion(valores.usuario, valores.clave);
      
      this.cargando = false;

      if (error || !data?.user) {
        this.mostrarMensajeError('Acceso denegado', 'Verificá tus datos e intentá de nuevo');
        setTimeout(() => this.limpiarFormulario(), 100);
        return;
      }

      this.mostrarMensajeExito('¡Bienvenido!', 'Acceso exitoso. Redirigiendo a la Sala de Juegos 🎮');
      this.limpiarFormulario();
      
      // Redirigir después de un breve delay para que el usuario vea el mensaje
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1500);

    } catch (error) {
      this.cargando = false;
      this.mostrarMensajeError('Error de conexión', 'Ocurrió un problema al intentar iniciar sesión');
    }
  }



  public limpiarFormulario(): void {
    this.form.reset();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.mensaje = null;
  }

  private mostrarMensajeError(titulo: string, texto: string): void {
    this.mensaje = { titulo, texto, tipo: 'error' };
  }

  private mostrarMensajeExito(titulo: string, texto: string): void {
    this.mensaje = { titulo, texto, tipo: 'success' };
  }
}