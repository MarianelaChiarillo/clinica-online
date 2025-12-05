import { Injectable } from '@angular/core';
import supabase from './supabase.client';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { UsuarioService } from './usuarios/usuario.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private usuarioActual = new BehaviorSubject<User | null>(null);
  usuarioActual$ = this.usuarioActual.asObservable();

  constructor(private usuarioService: UsuarioService) {
    this.init();
  }

  private async init() {
    // Cargar sesión al iniciar la app
    const { data } = await supabase.auth.getUser();
    this.usuarioActual.next(data?.user || null);

    // Mantener usuario actual si cambia la sesión
    supabase.auth.onAuthStateChange((_event, session) => {
      this.usuarioActual.next(session?.user || null);
    });
  }

  /** Registro de login: solo se llama en iniciarSesion */
  private async registrarLogIngreso(user: User) {
    const { id, email } = user;

    // Evitar duplicados: solo uno por día
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data: logs } = await supabase
      .from('logs_ingresos')
      .select('*')
      .eq('usuario_id', id)
      .gte('fecha_hora', hoy);

    if (logs && logs.length > 0) return; // Ya registrado hoy

    const usuarioCompleto = await this.usuarioService.obtenerPerfilCompleto(id);

    await supabase.from('logs_ingresos').insert({
      usuario_id: id,
      email,
      nombre: usuarioCompleto?.nombre || '',
      apellido: usuarioCompleto?.apellido || '',
      fecha_hora: new Date(),
    });
  }

  /** Registrar un usuario nuevo */
  async registrar(email: string, password: string) {
    const siteUrl = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: { emailRedirectTo: siteUrl + '/confirm' }
    });

    return { user: data?.user || null, error };
  }

  /** Confirmar email */
  async confirmarEmail(token: string) {
    return supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    });
  }

  /** Iniciar sesión */
  async iniciarSesion(email: string, password: string) {
    if (!email || !password) {
      return { user: null, error: { message: 'Email o contraseña vacíos' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (data?.user) {
      this.usuarioActual.next(data.user);
      await this.registrarLogIngreso(data.user); // Log solo aquí
    }

    return { user: data?.user || null, error };
  }

  /** Cerrar sesión */
  async cerrarSesion() {
    await supabase.auth.signOut();
    this.usuarioActual.next(null);
  }

  /** Obtener usuario actual */
  async getUsuarioActual() {
    const actual = this.usuarioActual.getValue();
    if (actual) return actual;

    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      this.usuarioActual.next(data.session.user);
      return data.session.user;
    }

    return new Promise<User | null>(resolve => {
      supabase.auth.onAuthStateChange((_event, session) => {
        resolve(session?.user || null);
      });
    });
  }
}
