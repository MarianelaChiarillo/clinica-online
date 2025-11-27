import { Injectable } from '@angular/core';
import supabase from '../supabase.client';
import { UsuarioService } from './usuario.service';
import { Usuario } from '../../models/user-data';

@Injectable({ providedIn: 'root' })
export class AdministradorService {
  constructor(private usuarioSrv: UsuarioService) {}

  async crearAdministrador(admin: {
    nombre: string;
    apellido: string;
    edad: number;
    dni: string;
    email: string;
    auth_id: string;
    imagen_perfil?: string;
  }) {
    const { data: usuarioData, error: usuarioError } = await this.usuarioSrv.crear({
      auth_id: admin.auth_id,
      email: admin.email,
      tipo_usuario: 'administrador',
      estado: 'activo',
      imagen_perfil: admin.imagen_perfil || undefined,
    });

    if (usuarioError) throw usuarioError;
    if (!usuarioData) throw new Error('No se pudo crear el usuario.');

    const { data, error } = await supabase
      .from('administradores')
      .insert([{
        usuario_id: usuarioData.id,
        nombre: admin.nombre,
        apellido: admin.apellido,
        edad: admin.edad,
        dni: admin.dni,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarDatos(usuarioId: number, datos: any) {
    const { error } = await supabase
      .from('administradores')
      .update(datos)
      .eq('usuario_id', usuarioId);

    if (error) throw error;
  }

  async obtenerTodos() {
    const { data, error } = await supabase
      .from('administradores')
      .select('*, usuarios(email, tipo_usuario, estado, imagen_perfil)');
    if (error) throw error;
    return data;
  }

  async obtenerPorAuthId(authId: string) {
    const { data, error } = await supabase
      .from('administradores')
      .select('*, usuarios!inner(email, auth_id)')
      .eq('usuarios.auth_id', authId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async obtenerPorUsuarioId(usuarioId: number) {
    const { data, error } = await supabase
      .from('administradores')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    return { data, error };
  }
}