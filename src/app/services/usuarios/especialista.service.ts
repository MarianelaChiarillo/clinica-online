import { Injectable } from '@angular/core';
import supabase from '../supabase.client';
import { UsuarioService } from './usuario.service';
import { Especialista, Especialidad } from '../../models/user-data';

@Injectable({ providedIn: 'root' })
export class EspecialistaService {
  constructor(private usuarioSrv: UsuarioService) {}

  async guardar(especialista: Especialista, authId: string, especialidadesIds: number[]) {
    const usuario = await this.usuarioSrv.crear({
      auth_id: authId,
      email: especialista.email,
      tipo_usuario: 'especialista',
      estado: 'pendiente', 
      imagen_perfil: especialista.imagen_perfil,
    });

    if (usuario.error || !usuario.data) {
      throw usuario.error;
    }

    const especialistaInsert = await supabase
      .from('especialistas')
      .insert([{
        usuario_id: usuario.data.id,
        nombre: especialista.nombre,
        apellido: especialista.apellido,
        edad: especialista.edad,
        dni: especialista.dni,
      }])
      .select()
      .single();

    if (especialistaInsert.error || !especialistaInsert.data) {
      throw especialistaInsert.error;
    }

    if (especialidadesIds?.length > 0) {
      const relaciones = especialidadesIds.map(id => ({
        especialista_id: especialistaInsert.data.id,
        especialidad_id: id,
      }));

      const { error } = await supabase
        .from('especialista_especialidad')
        .insert(relaciones);

      if (error) throw error;
    }

    return { usuario: usuario.data, especialista: especialistaInsert.data };
  }

  async obtenerPorId(especialistaId: number): Promise<Especialista | null> {
    const especialista = await supabase
      .from('especialistas')
      .select('*')
      .eq('id', especialistaId)
      .single();

    if (especialista.error || !especialista.data) return null;

    const usuario = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', especialista.data.usuario_id)
      .single();

    const especialidades = await this.obtenerEspecialidades(especialistaId);

    return { 
      ...especialista.data, 
      especialidades,
      usuario: usuario.data
    } as Especialista;
  }

  async obtenerPorUsuarioId(usuarioId: number): Promise<Especialista | null> {
    const especialista = await supabase
      .from('especialistas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    if (especialista.error || !especialista.data) return null;

    const usuario = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuarioId)
      .single();

    const especialidades = await this.obtenerEspecialidades(especialista.data.id);

    return { 
      ...especialista.data, 
      especialidades,
      usuario: usuario.data
    } as Especialista;
  }

  private async obtenerEspecialidades(especialistaId: number): Promise<any[]> {
    const relaciones = await supabase
      .from('especialista_especialidad')
      .select('especialidad_id')
      .eq('especialista_id', especialistaId)
      .eq('activo', true);

    if (relaciones.error || !relaciones.data?.length) return [];

    const ids = relaciones.data.map(rel => rel.especialidad_id);
    
    const especialidades = await supabase
      .from('especialidades')
      .select('id, nombre')
      .in('id', ids);

    if (especialidades.error) return [];

    return especialidades.data.map(esp => ({
      id: esp.id,
      nombre: esp.nombre,
      activo: true
    }));
  }

  async obtenerTodos(): Promise<any[]> {
    const especialistas = await supabase
      .from('especialistas')
      .select(`
        id,
        nombre,
        apellido,
        edad,
        dni,
        usuario:usuario_id (id, email, estado, tipo_usuario)
      `);

    if (especialistas.error) return [];

    const completos = await Promise.all(
      especialistas.data.map(async (esp) => {
        const especialidades = await this.obtenerEspecialidades(esp.id);
        const usuario = Array.isArray(esp.usuario) ? esp.usuario[0] : esp.usuario;

        return {
          id: esp.id,
          nombre: esp.nombre,
          apellido: esp.apellido,
          email: usuario?.email || '',
          estado: usuario?.estado || 'pendiente',
          tipo_usuario: usuario?.tipo_usuario || 'especialista',
          especialidades: especialidades.map(e => e.nombre),
        };
      })
    );

    return completos;
  }

  async actualizarEstadoYEspecialidades(authId: string, nuevoEstado: 'activo' | 'pendiente' | 'inactivo'): Promise<void> {
    const usuario = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', authId)
      .single();

    if (usuario.error || !usuario.data) {
      throw usuario.error;
    }

    const updateUser = await supabase
      .from('usuarios')
      .update({ estado: nuevoEstado })
      .eq('auth_id', authId);

    if (updateUser.error) throw updateUser.error;

    const especialista = await supabase
      .from('especialistas')
      .select('id')
      .eq('usuario_id', usuario.data.id)
      .single();

    if (!especialista.data) return;

    const updateEsp = await supabase
      .from('especialista_especialidad')
      .update({ activo: nuevoEstado === 'activo' })
      .eq('especialista_id', especialista.data.id);

    if (updateEsp.error) throw updateEsp.error;
  }

async obtenerPorEspecialidad(especialidadId: number): Promise<any[]> {
  // 1) Buscar relaciones en la tabla puente
  const { data: relaciones, error: relError } = await supabase
    .from('especialista_especialidad')
    .select('especialista_id')
    .eq('especialidad_id', especialidadId)
    .eq('activo', true);

  if (relError) {
    console.error('❌ Error obteniendo relaciones especialista-especialidad', relError);
    return [];
  }

  if (!relaciones?.length) return [];

  const ids = relaciones.map(r => r.especialista_id);

  // 2) Obtener especialistas
  const { data: especialistas, error: espError } = await supabase
    .from('especialistas')
    .select(`
      id,
      nombre,
      apellido,
      usuario:usuario_id ( email, estado )
    `)
    .in('id', ids);

  if (espError) {
    console.error('❌ Error obteniendo especialistas:', espError);
    return [];
  }

  // 3) Normalizar usuario[] => usuario
  return especialistas.map(e => {
    const usuario = Array.isArray(e.usuario) ? e.usuario[0] : e.usuario;

    return {
      id: e.id,
      nombre: e.nombre,
      apellido: e.apellido,
      email: usuario?.email || '',
      estado: usuario?.estado || 'pendiente',
    };
  });
}



}