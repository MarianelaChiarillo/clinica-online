// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import supabase from './supabase.client';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private usuarioActual = new BehaviorSubject<User | null>(null);
  usuarioActual$ = this.usuarioActual.asObservable();
  private userS: any = null;

  constructor() {
    this.init();
     supabase.auth.onAuthStateChange((event, session) => {
      this.userS = session?.user ?? null;
    });
  }

private async init() {
  try {
    const { data } = await supabase.auth.getUser();
    this.usuarioActual.next(data?.user ?? null);
  } catch (err: any) {
    console.warn('⚠️ No hay sesión activa todavía:', err.message);
    this.usuarioActual.next(null);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    this.usuarioActual.next(session?.user ?? null);
  });
}

  /** 🔹 Registro de nuevo usuario */
  async registrar(email: string, password: string) {
    const siteUrl = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl}/confirm` },
    });
    return { user: data?.user || null, error };
  }

  /** 🔹 Confirmar email desde el link */
async confirmarEmail(token: string) {
  return await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'signup'
  });
}


  /** 🔹 Iniciar sesión */
  async iniciarSesion(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data?.user || null, error };
  }

  /** 🔹 Cerrar sesión */
  async cerrarSesion() {
    await supabase.auth.signOut();
    this.usuarioActual.next(null);
  }

  async obtenerPorAuthId(authId: string): Promise<{ data: any | null; error: any }> {
  console.log('🔍 Buscando usuario con auth_id:', authId);
  
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error) {
    console.error('❌ Error obteniendo usuario por auth_id:', error);
    
    if (error.code === 'PGRST116') {
      console.warn('⚠️ No se encontró usuario para auth_id:', authId);
      return { data: null, error: new Error('Usuario no encontrado en la base de datos') };
    }
    return { data: null, error };
  }

  console.log('✅ Usuario encontrado:', data);
  return { data, error: null };
}

  /** 🔹 Obtener usuario actual */
  async getUsuarioActual() {
     if (this.userS) return this.userS;

    const { data } = await supabase.auth.getSession();
    this.userS = data.session?.user ?? null;

    return this.userS;
  }

  async getUsuarioActualP() {
  const authUser = await this.getUsuarioActual();
  
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();

  return data; // <-- ESTE ES EL BUENO
}

}
