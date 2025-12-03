import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

import supabase from '../../services/supabase.client';

import { MensajeComponent } from '../componentes/mensaje/mensaje.component';
import { SpinnerComponent } from '../componentes/spinner/spinner.component';

import { LoginValidatorsService } from '../../validators/login.validator';

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
  { src: 'assets/perfiles/alexia.png', alt: 'Paciente Alexia', email: 'alexach@gmail.com', pass: 'alexita1', rol: 'paciente' },
  { src: 'assets/perfiles/juan.png', alt: 'Paciente Juan', email: 'juanperez@gmail.com', pass: 'juani123', rol: 'paciente' },
  { src: 'assets/perfiles/maria2.png', alt: 'Paciente María', email: 'mariag@gmail.com', pass: 'maria456', rol: 'paciente' },
  { src: 'assets/perfiles/jose.png', alt: 'Especialista Dr. López', email: 'drlopez@gmail.com', pass: 'doctor123', rol: 'especialista' },
  { src: 'assets/perfiles/nadia2.png', alt: 'Especialista Dra. García', email: 'dragarcia@gmail.com', pass: 'dra456', rol: 'especialista' },
  { src: 'assets/perfiles/admin2.png', alt: 'Administrador', email: 'admin@gmail.com', pass: 'admin789', rol: 'administrador' }
];


  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authSrv: AuthService,
    private usuarioSrv: UsuarioService,
    private storageSrv: StorageService,
    private loginValidators: LoginValidatorsService
  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    this.inicializarFormulario();
    this.cargando = false;
  }

  get usuario() {
    return this.form.controls['usuario'];
  }

  get clave() {
    return this.form.controls['clave'];
  }

  get erroresUsuario(): string | null {
    return this.loginValidators.getLoginError('usuario', this.form, { usuario: 'Email' });
  }

  get erroresClave(): string | null {
    return this.loginValidators.getLoginError('clave', this.form, { clave: 'Contraseña' });
  }

  private inicializarFormulario(): void {
    this.form = this.fb.group({
      usuario: ['', this.loginValidators.getEmailValidators()],
      clave: ['', this.loginValidators.getClaveValidators()]
    });
  }

  userTrackBy(index: number, item: any) {
  return item?.id || index;
}

  async iniciarSesion(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.mostrarError('Datos inválidos', 'Verificá usuario y contraseña.');
      return;
    }

    this.cargando = true;
    this.mensaje = null;

    const { usuario, clave } = this.form.value;

    try {
      const { user, error } = await this.authSrv.iniciarSesion(usuario, clave);
      if (error || !user) return this.manejarErrorAuth(error);
      if (!user.email_confirmed_at) {
        this.mostrarError('Email no confirmado', 'Revisá tu correo y confirmá tu cuenta.');
        await this.authSrv.cerrarSesion();
        return;
      }

      const { data: usuarioDB, error: usuarioError } = await this.usuarioSrv.obtenerPorEmail(usuario);
      if (usuarioError || !usuarioDB) {
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

    } catch (err) {
      this.mostrarError('Error de conexión', 'Ocurrió un problema al intentar iniciar sesión.');
      console.error(err);
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

    this.mensaje = { titulo: '¡Bienvenido!', texto: 'Acceso exitoso', tipo: 'success' };
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
