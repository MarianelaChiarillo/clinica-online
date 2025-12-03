import { Injectable } from '@angular/core';
import supabase from './supabase.client';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private usuarioActual = new BehaviorSubject<User | null>(null);
  usuarioActual$ = this.usuarioActual.asObservable();

  constructor() {
    this.init();
  }

  private async init() {
    const { data } = await supabase.auth.getUser();
    this.usuarioActual.next(data?.user || null);

    supabase.auth.onAuthStateChange((_event, session) => {
      this.usuarioActual.next(session?.user || null);
    });
  }

  async registrar(email: string, password: string) {
    email = email.trim();
    password = password.trim();

    const siteUrl = window.location.origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: siteUrl + '/confirm' }
    });

    return { user: data?.user || null, error };
  }

  async confirmarEmail(token: string) {
    return await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    });
  }

  async iniciarSesion(email: string, password: string) {
    email = email.trim();
    password = password.trim();

    if (!email || !password) {
      return { user: null, error: { message: 'Email o contraseña vacíos' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { user: data?.user || null, error };
  }

  async cerrarSesion() {
    await supabase.auth.signOut();
    this.usuarioActual.next(null);
  }

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
