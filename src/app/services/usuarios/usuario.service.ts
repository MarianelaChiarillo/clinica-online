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
async crearAdministradorCompleto(form: any) {
  try {
    // 1) Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true
    });

    if (authError) throw new Error(authError.message);
    const authId = authData.user?.id;
    if (!authId) throw new Error("No se pudo obtener auth_id.");

    // 2) Insertar en tabla usuarios
    const usuarioPayload = {
      auth_id: authId,
      email: form.email,
      tipo_usuario: 'administrador',
      estado: 'activo',
      imagen_perfil: form.imagen_perfil || null,
    };

    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert([usuarioPayload])
      .select()
      .single();

    if (usuarioError) {
      await supabase.auth.admin.deleteUser(authId);
      throw new Error(usuarioError.message);
    }

    // 3) Insertar datos administrativos
    const adminPayload = {
      usuario_id: usuarioData.id,
      nombre: form.nombre,
      apellido: form.apellido,
      edad: form.edad,
      dni: form.dni,
    };

    const { error: adminError } = await supabase
      .from('administradores')
      .insert([adminPayload]);

    if (adminError) {
      await supabase.from('usuarios').delete().eq('id', usuarioData.id);
      await supabase.auth.admin.deleteUser(authId);
      throw new Error(adminError.message);
    }

    return { ok: true };

  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

}
