import { Injectable } from '@angular/core';
import supabase from '../supabase.client';
import { Usuario } from '../../models/user-data';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  // 🔹 Crear un usuario base
  async crear(usuario: Partial<Usuario>) {
    const { data, error } = await supabase.from('usuarios').insert([usuario]).select().single();

    return { data, error };
  }

  // 🔹 Obtener usuario por email
  async obtenerPacientes() {
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id,
      email,
      pacientes (
        nombre,
        apellido
      )
    `)
    .eq('tipo_usuario', 'paciente');

  if (error) {
    console.error('❌ Error obteniendo pacientes:', error);
    return [];
  }

  // Mapeo simple
  return data.map(u => ({
    id: u.id,
    email: u.email,
    nombre: u.pacientes?.[0]?.nombre || '',
    apellido: u.pacientes?.[0]?.apellido || ''
  }));
}

  async obtenerPorEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('❌ Error al obtener usuario:', error.message);
      return null;
    }

    return data as Usuario | null;
  }

  // 🔹 Obtener usuario por Auth ID
  obtenerPorAuthId(authId: string) {
    return supabase.from('usuarios').select('*').eq('auth_id', authId).single();
  }

  // 🔹 Obtener todos los usuarios con sus datos asociados
  async obtenerTodos(): Promise<any[]> {
    const { data, error } = await supabase.from('usuarios').select(`
        id,
        auth_id,
        email,
        estado,
        tipo_usuario,
        pacientes (
          nombre,
          apellido
        ),
        especialistas (
          nombre,
          apellido,
          especialista_especialidad (
            especialidades (nombre)
          )
        ),
        administradores (
          nombre,
          apellido
        )
      `);

    if (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      return [];
    }

    // 🔹 Mapeo simple y seguro
    return data.map((u) => {
      const paciente = u.pacientes?.[0];
      const especialista = u.especialistas?.[0];
      const admin = u.administradores?.[0];

      return {
        id: u.id,
        auth_id: u.auth_id,
        email: u.email,
        estado: u.estado,
        tipo_usuario: u.tipo_usuario,
        nombre: paciente?.nombre || especialista?.nombre || admin?.nombre || '',
        apellido: paciente?.apellido || especialista?.apellido || admin?.apellido || '',
        especialidades:
          especialista?.especialista_especialidad?.map((rel: any) => rel.especialidades?.nombre) ||
          [],
      };
    });
  }
  async obtenerPacientePorUsuarioId(usuarioId: number) {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    return { data, error };
  }

  async obtenerTodosPacientes() {
    const { data, error } = await supabase.from('pacientes').select('*');

    return { data, error };
  }

  async obtenerTodosUsuarios() {
    const { data, error } = await supabase.from('usuarios').select('*');

    return { data, error };
  }
  async actualizarEstado(authId: string, nuevoEstado: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ estado: nuevoEstado })
      .eq('auth_id', authId);

    if (error) throw error;
  }


}
