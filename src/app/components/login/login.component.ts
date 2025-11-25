import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import supabase from '../../services/supabase.client';

import { MensajeComponent } from '../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../componentes/spinner/spinner.component';
import { MenuComponent } from '../componentes/menu/menu.component';
import { LayoutComponent } from '../componentes/layout/layout.component';

import { claveSeguraValidator } from '../../validators/clave.validator';
import { emailDominioValidator } from '../../validators/email-dominio.validator';

import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { StorageService } from '../../services/storage.service';

import { Usuario } from '../../models/user-data';

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

  form!: FormGroup;

  cargando = false;
  verClave = false;

  Object = Object;

  mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;

  accesos = [
    { src: '', alt: 'Paciente Alexia', email: 'alexach@gmail.com', pass: 'alexita1', rol: 'paciente' },
    { src: '', alt: 'Paciente Juan', email: 'juanperez@gmail.com', pass: 'juani123', rol: 'paciente' },
    { src: '', alt: 'Paciente María', email: 'mariag@gmail.com', pass: 'maria456', rol: 'paciente' },
    { src: '', alt: 'Especialista Dr. López', email: 'drlopez@gmail.com', pass: 'doctor123', rol: 'especialista' },
    { src: '', alt: 'Especialista Dra. García', email: 'dragarcia@gmail.com', pass: 'dra456', rol: 'especialista' },
    { src: '', alt: 'Administrador', email: 'admin@gmail.com', pass: 'admin789', rol: 'administrador' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authSrv: AuthService,
    private usuarioSrv: UsuarioService,
    private storageSrv: StorageService
  ) {}

  async ngOnInit(): Promise<void> {
    this.inicializarFormulario();
    await this.cargarImagenesAccesos();
  }

  get usuario() {
    return this.form.controls['usuario'];
  }

  get clave() {
    return this.form.controls['clave'];
  }

  get erroresClave(): string {
    const errors = this.clave?.errors;
    if (!errors) return '';
    return Object.values(errors).join(' · ');
  }

  get erroresUsuario(): string {
  const errors = this.usuario?.errors;
  if (!errors) return '';

  return Object.values(errors).join(' · ');
}

private inicializarFormulario(): void {
  this.form = this.fb.group({
    usuario: ['', [emailDominioValidator]],
    clave: ['', [claveSeguraValidator]]
  });
}



  private async cargarImagenesAccesos(): Promise<void> {
    try {
      for (const acceso of this.accesos) {
        const usuario = await this.usuarioSrv.obtenerPorEmail(acceso.email);

        if (usuario?.imagen_perfil) {
          const img = await this.storageSrv.obtenerImagen(usuario.imagen_perfil);
          acceso.src = img;
        }
      }
    } catch (error) {
      this.mensaje = {
        titulo: 'Error',
        texto: 'No se pudieron cargar las imágenes de los accesos.',
        tipo: 'error'
      };
      console.error(error);
    }
  }

  async iniciarSesion(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.mensaje = {
        titulo: 'Datos inválidos',
        texto: 'Verificá usuario y contraseña.',
        tipo: 'error'
      };
      return;
    }

    this.cargando = true;
    this.mensaje = null;

    const { usuario, clave } = this.form.value;

    try {
      const { user, error } = await this.authSrv.iniciarSesion(usuario, clave);

      if (error || !user) {
        this.manejarErrorAuth(error);
        return;
      }

      if (!user.email_confirmed_at) {
        this.mostrarError('Email no confirmado', 'Revisá tu correo y confirmá tu cuenta.');
        await this.authSrv.cerrarSesion();
        return;
      }

      const usuarioDB = await this.usuarioSrv.obtenerPorEmail(usuario);

      if (!usuarioDB) {
        this.mostrarError('Usuario no encontrado', 'Contactá al administrador.');
        await this.authSrv.cerrarSesion();
        return;
      }

      const mensajeEstado = this.verificarEstadoUsuario(usuarioDB);
      if (mensajeEstado) {
        this.mostrarError('Cuenta pendiente', mensajeEstado);
        await this.authSrv.cerrarSesion();
        return;
      }

      await this.manejarLoginExitoso(usuarioDB);

    } catch {
      this.mostrarError('Error de conexión', 'Ocurrió un problema al intentar iniciar sesión.');
    } finally {
      this.cargando = false;
    }
  }

  private manejarErrorAuth(error: any): void {
    if (error?.message?.includes('Email not confirmed')) {
      this.mostrarError('Email no confirmado', 'Confirmá tu cuenta antes de iniciar sesión.');
    } else if (error?.message?.includes('Invalid login credentials')) {
      this.mostrarError('Credenciales inválidas', 'Verificá usuario y contraseña.');
    } else {
      this.mostrarError('Error de acceso', error?.message || 'Error desconocido.');
    }
  }

  private verificarEstadoUsuario(usuario: Usuario): string | null {
    if (usuario.tipo_usuario === 'especialista' && usuario.estado !== 'activo') {
      return 'Tu cuenta está pendiente de aprobación del administrador.';
    }
    if (usuario.tipo_usuario !== 'especialista' && usuario.estado !== 'activo') {
      return 'Tu cuenta no está activa. Contactá al administrador.';
    }
    return null;
  }

  private async manejarLoginExitoso(usuario: Usuario): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const authId = data.session?.user?.id;

    localStorage.setItem('usuario', JSON.stringify({
      id: usuario.id,
      auth_id: authId,
      email: usuario.email,
      tipo_usuario: usuario.tipo_usuario,
      estado: usuario.estado
    }));

    this.mensaje = {
      titulo: '¡Bienvenido!',
      texto: 'Acceso exitoso',
      tipo: 'success'
    };

    setTimeout(() => this.redirigirSegunRol(usuario), 1500);
  }

  private redirigirSegunRol(usuario: Usuario): void {
    const rutas: Record<string, string> = {
      paciente: '/home/paciente',
      especialista: '/home/especialista',
      administrador: '/home/administrador'
    };

    this.router.navigate([rutas[usuario.tipo_usuario] || '/home/paciente']);
  }

  completarYAcceder(email: string, pass: string): void {
    this.form.patchValue({ usuario: email, clave: pass });
    this.form.markAsTouched();
    this.mensaje = null;
  }

  limpiarFormulario(): void {
    this.form.reset();
    this.mensaje = null;
  }

  private mostrarError(titulo: string, texto: string): void {
    this.mensaje = { titulo, texto, tipo: 'error' };
  }
}
