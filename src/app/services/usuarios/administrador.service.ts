import { Injectable } from '@angular/core';
import  supabase  from '../supabase.client';
import { UsuarioService } from './usuario.service';
import { Usuario } from '../../models/user-data';

@Injectable({
  providedIn: 'root',
})
export class AdministradorService {
  constructor(private usuarioSrv: UsuarioService) {}

  /**
   * Crea un nuevo administrador en Supabase.
   * 1️⃣ Inserta en "usuarios"
   * 2️⃣ Inserta en "administradores" vinculado al usuario
   */
  async crearAdministrador(admin: {
    nombre: string;
    apellido: string;
    edad: number;
    dni: string;
    email: string;
    auth_id: string;
    imagen_perfil?: string;
  }) {
    // Paso 1 — crear el registro en la tabla usuarios
    const { data: usuarioData, error: usuarioError } = await this.usuarioSrv.crear({
      auth_id: admin.auth_id,
      email: admin.email,
      tipo_usuario: 'administrador',
      estado: 'activo',
      imagen_perfil: admin.imagen_perfil || undefined,
    });

    if (usuarioError) throw usuarioError;
    if (!usuarioData) throw new Error('No se pudo crear el usuario.');

    // Paso 2 — crear el registro en la tabla administradores
    const { data, error } = await supabase
      .from('administradores')
      .insert([
        {
          usuario_id: usuarioData.id,
          nombre: admin.nombre,
          apellido: admin.apellido,
          edad: admin.edad,
          dni: admin.dni,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /** Obtener todos los administradores con su usuario */
  async obtenerTodos() {
    const { data, error } = await supabase
      .from('administradores')
      .select('*, usuarios(email, tipo_usuario, estado, imagen_perfil)');
    if (error) throw error;
    return data;
  }

  /** Obtener un administrador por auth_id */
  async obtenerPorAuthId(authId: string) {
    const { data, error } = await supabase
      .from('administradores')
      .select('*, usuarios!inner(email, auth_id)')
      .eq('usuarios.auth_id', authId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
