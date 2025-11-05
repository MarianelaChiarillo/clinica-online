import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Paciente, Especialista, Usuario } from '../models/user-data';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  public usuarioActual = new BehaviorSubject<User | null>(null);
  public datosUsuario = new BehaviorSubject<Usuario | null>(null);

  constructor() {
    this.supabase = createClient(environment.apiUrl, environment.publicAnonKey);
    this.inicializarAuth();
  }

  private async inicializarAuth(): Promise<void> {
    // Obtener usuario actual al iniciar
    const { data: { user } } = await this.supabase.auth.getUser();
    this.usuarioActual.next(user);
    
    if (user) {
      await this.cargarDatosUsuario(user.id);
    }

    // Escuchar cambios de autenticación
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      this.usuarioActual.next(user);
      
      if (user) {
        await this.cargarDatosUsuario(user.id);
      } else {
        this.datosUsuario.next(null);
      }
    });
  }

  // ============ AUTHENTICATION ============
  public async registrarUsuario(email: string, clave: string): Promise<{ data: any; error: any }> {
    return await this.supabase.auth.signUp({ 
      email, 
      password: clave,
      options: {
        data: {
          email_verified: false
        }
      }
    });
  }

  public async iniciarSesion(email: string, contraseña: string): Promise<{ data: any; error: any }> {
    return await this.supabase.auth.signInWithPassword({ email, password: contraseña });
  }

  public async cerrarSesion(): Promise<{ error: any }> {
    return await this.supabase.auth.signOut();
  }

  public obtenerUsuarioActual(): User | null {
    return this.usuarioActual.value;
  }

  // ============ MANEJO DE USUARIOS ============
  public async guardarPaciente(paciente: Paciente, authId: string): Promise<{ data: any; error: any }> {
    const datosPaciente = {
      auth_id: authId,
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      edad: paciente.edad,
      dni: paciente.dni,
      email: paciente.email,
      rol: paciente.rol,
      obra_social: paciente.obraSocial,
      imagen_perfil: paciente.imagenPerfil,
      imagen_perfil_2: paciente.imagenPerfil2,
      creado_en: new Date().toISOString()
    };

    return await this.supabase
      .from('usuarios')
      .insert([datosPaciente]);
  }

  public async guardarEspecialista(especialista: Especialista, authId: string): Promise<{ data: any; error: any }> {
    const datosEspecialista = {
      auth_id: authId,
      nombre: especialista.nombre,
      apellido: especialista.apellido,
      edad: especialista.edad,
      dni: especialista.dni,
      email: especialista.email,
      rol: especialista.rol,
      especialidad: especialista.especialidad,
      aprobado: false, // Por defecto no aprobado
      imagen_perfil: especialista.imagenPerfil,
      creado_en: new Date().toISOString()
    };

    return await this.supabase
      .from('usuarios')
      .insert([datosEspecialista]);
  }

  public async obtenerUsuarioPorAuthId(authId: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', authId)
      .single();

    if (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }

    return this.mapearUsuarioDesdeBD(data);
  }

  public async obtenerUsuarioPorId(id: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error al obtener usuario por ID:', error);
      return null;
    }

    return this.mapearUsuarioDesdeBD(data);
  }

  public async obtenerUsuarioPorEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error al obtener usuario por email:', error);
      return null;
    }

    return this.mapearUsuarioDesdeBD(data);
  }

  private async cargarDatosUsuario(authId: string): Promise<void> {
    const usuario = await this.obtenerUsuarioPorAuthId(authId);
    this.datosUsuario.next(usuario);
  }

  // ============ MÉTODOS ESPECÍFICOS ============
  public async obtenerPacientes(): Promise<Paciente[]> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('rol', 'paciente');

    if (error) {
      console.error('Error al obtener pacientes:', error);
      return [];
    }

    return data.map(item => this.mapearUsuarioDesdeBD(item) as Paciente);
  }

  public async obtenerEspecialistas(aprobados: boolean = true): Promise<Especialista[]> {
    let query = this.supabase
      .from('usuarios')
      .select('*')
      .eq('rol', 'especialista');

    if (aprobados) {
      query = query.eq('aprobado', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener especialistas:', error);
      return [];
    }

    return data.map(item => this.mapearUsuarioDesdeBD(item) as Especialista);
  }

  public async aprobarEspecialista(id: string): Promise<{ data: any; error: any }> {
    return await this.supabase
      .from('usuarios')
      .update({ aprobado: true })
      .eq('id', id);
  }

  // ============ MANEJO DE ARCHIVOS ============
  public async subirImagen(archivo: File, carpeta: string = 'perfiles'): Promise<{ data: any; error: any }> {
    const nombreArchivo = `${Date.now()}_${archivo.name}`;
    const rutaCompleta = `${carpeta}/${nombreArchivo}`;

    const { data, error } = await this.supabase.storage
      .from('imagenes')
      .upload(rutaCompleta, archivo);

    if (error) {
      console.error('Error al subir imagen:', error);
      return { data: null, error };
    }

    // Obtener URL pública
    const { data: urlData } = this.supabase.storage
      .from('imagenes')
      .getPublicUrl(rutaCompleta);

    return { data: urlData.publicUrl, error: null };
  }

  // ============ UTILIDADES ============
  private mapearUsuarioDesdeBD(datos: any): Usuario {
    const base = {
      id: datos.id,
      nombre: datos.nombre,
      apellido: datos.apellido,
      edad: datos.edad,
      dni: datos.dni,
      email: datos.email,
      imagenPerfil: datos.imagen_perfil,
      authId: datos.auth_id,
      created_at: datos.creado_en,
      rol: datos.rol
    };

    if (datos.rol === 'paciente') {
      return {
        ...base,
        obraSocial: datos.obra_social,
        imagenPerfil2: datos.imagen_perfil_2,
        rol: 'paciente'
      } as Paciente;
    } else {
      return {
        ...base,
        especialidad: datos.especialidad,
        aprobado: datos.aprobado,
        rol: 'especialista'
      } as Especialista;
    }
  }

  public getClient(): SupabaseClient {
    return this.supabase;
  }

  // ============ VERIFICACIONES ============
  public async verificarEmailDisponible(email: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('usuarios')
      .select('email')
      .eq('email', email)
      .single();

    return !data; // Disponible si no existe
  }

  public async verificarDNIDisponible(dni: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('usuarios')
      .select('dni')
      .eq('dni', dni)
      .single();

    return !data; // Disponible si no existe
  }
}