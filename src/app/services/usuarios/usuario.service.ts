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

// usuario.service.ts - Método obtenerTodos actualizado
async obtenerTodos(): Promise<any[]> {
  try {
    // 1. Obtener todos los usuarios
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*');

    if (usuariosError) {
      console.error('Error obteniendo usuarios:', usuariosError);
      throw usuariosError;
    }

    if (!usuarios || usuarios.length === 0) {
      return [];
    }

    const usuariosCompletos = [];

    for (const usuario of usuarios) {
      let datosExtra = {};

      // 2. Obtener datos específicos según tipo de usuario
      switch (usuario.tipo_usuario) {
        case 'paciente':
          const { data: pacienteData } = await supabase
            .from('pacientes')
            .select('*')
            .eq('usuario_id', usuario.id)
            .single();
          
          datosExtra = {
            nombre: pacienteData?.nombre || '',
            apellido: pacienteData?.apellido || '',
            edad: pacienteData?.edad || 0,
            dni: pacienteData?.dni || '',
            obra_social: pacienteData?.obra_social || '',
            segunda_imagen: pacienteData?.segunda_imagen || ''
          };
          break;

        case 'especialista':
          const { data: especialistaData } = await supabase
            .from('especialistas')
            .select('*')
            .eq('usuario_id', usuario.id)
            .single();

          // Obtener especialidades
          let especialidades = [];
          if (especialistaData) {
            const { data: relData } = await supabase
              .from('especialista_especialidad')
              .select('especialidad_id')
              .eq('especialista_id', especialistaData.id);

            if (relData && relData.length > 0) {
              const especialidadIds = relData.map(r => r.especialidad_id);
              const { data: especialidadesData } = await supabase
                .from('especialidades')
                .select('nombre')
                .in('id', especialidadIds);

              especialidades = especialidadesData?.map(e => e.nombre) || [];
            }
          }

          datosExtra = {
            nombre: especialistaData?.nombre || '',
            apellido: especialistaData?.apellido || '',
            edad: especialistaData?.edad || 0,
            dni: especialistaData?.dni || '',
            especialidades: especialidades
          };
          break;

        case 'administrador':
          const { data: adminData } = await supabase
            .from('administradores')
            .select('*')
            .eq('usuario_id', usuario.id)
            .single();

          datosExtra = {
            nombre: adminData?.nombre || '',
            apellido: adminData?.apellido || '',
            edad: adminData?.edad || 0,
            dni: adminData?.dni || ''
          };
          break;

        default:
          datosExtra = {
            nombre: '',
            apellido: '',
            edad: 0,
            dni: ''
          };
      }

      // 3. Combinar datos del usuario con datos específicos
      usuariosCompletos.push({
        id: usuario.id,
        auth_id: usuario.auth_id,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        estado: usuario.estado,
        imagen_perfil: usuario.imagen_perfil,
        ...datosExtra
      });
    }

    return usuariosCompletos;

  } catch (error) {
    console.error('Error en obtenerTodos:', error);
    return [];
  }
}

}
