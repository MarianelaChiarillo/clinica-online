import { Injectable } from '@angular/core';
import supabase from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class UsuarioService {

  async crear(usuario: any) {
    const { data, error } = await supabase
      .from('usuarios')
      .insert([usuario])
      .select()
      .single();

    return { data, error };
  }

  async crearRelacionado(tabla: string, payload: any) {
    const { data, error } = await supabase
      .from(tabla)
      .insert([payload])
      .select()
      .single();

    return { data, error };
  }

  async actualizarRelacionado(tabla: string, usuarioId: number, datos: any) {
    const { error } = await supabase
      .from(tabla)
      .update(datos)
      .eq('usuario_id', usuarioId);

    return { error };
  }

  async obtenerRelacionado(tabla: string, usuarioId: number) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    return { data, error };
  }

  async obtenerPorAuthId(authId: string) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', authId)
      .single();

    return { data, error };
  }

  async obtenerPerfilCompleto(authId: string) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', authId)
      .single();

    if (!usuario) return null;

    if (usuario.tipo_usuario === 'paciente') {
      const { data: p } = await supabase
        .from('pacientes')
        .select('*')
        .eq('usuario_id', usuario.id)
        .single();

      return { ...usuario, ...p };
    }

    if (usuario.tipo_usuario === 'especialista') {
      const { data: esp } = await supabase
        .from('especialistas')
        .select('*')
        .eq('usuario_id', usuario.id)
        .single();

      const { data: rel } = await supabase
        .from('especialista_especialidad')
        .select('especialidad_id')
        .eq('especialista_id', esp.id);

      let especialidades = [];
      if (rel?.length) {
        const ids = rel.map(r => r.especialidad_id);
        const { data: espDatas } = await supabase
          .from('especialidades')
          .select('*')
          .in('id', ids);
        especialidades = espDatas || [];
      }

      return { ...usuario, ...esp, especialidades };
    }

    if (usuario.tipo_usuario === 'administrador') {
      const { data: admin } = await supabase
        .from('administradores')
        .select('*')
        .eq('usuario_id', usuario.id)
        .single();

      return { ...usuario, ...admin };
    }

    return usuario;
  }


  async obtenerPorEmail(email: string) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    return { data, error };
  }

    async obtenerTodos(): Promise<any[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*');
  if (error) throw error;
  return data || [];
}


}
