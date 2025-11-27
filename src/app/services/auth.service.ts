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
    this.usuarioActual.next(data?.user ?? null);

    supabase.auth.onAuthStateChange((_event, session) => {
      this.usuarioActual.next(session?.user ?? null);
    });
  }

  async registrar(email: string, password: string) {
    const siteUrl = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl}/confirm` }
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

  async obtenerPorAuthId(authId: string) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', authId)
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  }

  async getUsuarioActual() {
    const current = this.usuarioActual.getValue();
    if (current) return current;

    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  }

  async getUsuarioActualP() {
    const authUser = await this.getUsuarioActual();
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', authUser?.id)
      .single();
    return data;
  }

   private async obtenerDatosEspecialista(usuarioId: number) {
    const { data: especialista } = await supabase
      .from('especialistas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    if (!especialista) return null;

    const especialidades = await this.obtenerEspecialidades(especialista.id);
    return { ...especialista, especialidades };
  }

  private async obtenerDatosAdministrador(usuarioId: number) {
    const { data } = await supabase
      .from('administradores')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();
    return data;
  }

  private async obtenerEspecialidades(especialistaId: number) {
    const { data: relaciones } = await supabase
      .from('especialista_especialidad')
      .select('especialidad_id')
      .eq('especialista_id', especialistaId)
      .eq('activo', true);

    if (!relaciones?.length) return [];

    const ids = relaciones.map(rel => rel.especialidad_id);
    const { data: especialidades } = await supabase
      .from('especialidades')
      .select('id, nombre')
      .in('id', ids);

    return especialidades || [];
  }

  async actualizarImagenPerfil(archivo: File) {
    const authUser = await this.getUsuarioActual();
    if (!authUser) throw new Error('Usuario no autenticado');

    const nombreArchivo = Date.now() + '_' + archivo.name;
    const ruta = 'perfiles/' + nombreArchivo;

    const { error } = await supabase.storage.from('imagenes').upload(ruta, archivo);
    if (error) throw error;

    const { data } = supabase.storage.from('imagenes').getPublicUrl(ruta);

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ imagen_perfil: data.publicUrl })
      .eq('auth_id', authUser.id);

    if (updateError) throw updateError;

    return data.publicUrl;
  }


  // En auth.service.ts - actualizar el método obtenerPerfilCompleto
// En auth.service.ts - corregir el método obtenerPerfilCompleto
async obtenerPerfilCompleto() {
  const authUser = await this.getUsuarioActual();
  if (!authUser) return null;

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();

  if (!usuario) return null;

  let datosEspecificos = null;

  switch (usuario.tipo_usuario) {
    case 'paciente':
      datosEspecificos = await this.obtenerDatosPaciente(usuario.id);
      break;
    case 'especialista':
      datosEspecificos = await this.obtenerDatosEspecialista(usuario.id);
      break;
    case 'administrador':
      datosEspecificos = await this.obtenerDatosAdministrador(usuario.id);
      break;
  }

  // Para pacientes, combinar datos específicos incluyendo segunda_imagen
  if (usuario.tipo_usuario === 'paciente' && datosEspecificos) {
    return {
      ...usuario,
      ...datosEspecificos, // Esto incluye segunda_imagen
      nombre: datosEspecificos.nombre,
      apellido: datosEspecificos.apellido,
      edad: datosEspecificos.edad,
      dni: datosEspecificos.dni,
      obra_social: datosEspecificos.obra_social,
      segunda_imagen: datosEspecificos.segunda_imagen // Asegurar que viene
    };
  }

  // Para otros tipos de usuario
  return { 
    ...usuario, 
    ...datosEspecificos 
  };
}

private async obtenerDatosPaciente(usuarioId: number) {
  const { data } = await supabase
    .from('pacientes')
    .select('*')
    .eq('usuario_id', usuarioId)
    .single();
  
  console.log('Datos paciente desde BD:', data); // Debug
  return data;
} 


// En auth.service.ts
async obtenerPorEmail(email: string): Promise<any> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error verificando email:', error);
    return null;
  }

  return data;
}
// Agregar método para actualizar la segunda imagen del paciente
async actualizarSegundaImagenPaciente(archivo: File) {
  const authUser = await this.getUsuarioActual();
  if (!authUser) throw new Error('Usuario no autenticado');

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  if (!usuario) throw new Error('Usuario no encontrado');

  const nombreArchivo = Date.now() + '_' + archivo.name;
  const ruta = 'pacientes/' + nombreArchivo;

  const { error } = await supabase.storage.from('imagenes').upload(ruta, archivo);
  if (error) throw error;

  const { data } = supabase.storage.from('imagenes').getPublicUrl(ruta);

  const { error: updateError } = await supabase
    .from('pacientes')
    .update({ segunda_imagen: data.publicUrl })
    .eq('usuario_id', usuario.id);

  if (updateError) throw updateError;

  return data.publicUrl;
}
}