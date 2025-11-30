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
    return this.usuarioActual.getValue();
  }
}
