import { Injectable } from '@angular/core';
import { UsuarioService } from './usuario.service';
import { Especialista } from '../../models/user-data';
import { AuthService } from '../auth.service';
import supabase from '../../services/supabase.client';

@Injectable({ providedIn: 'root' })
export class EspecialistaService {
  constructor(
    private usuarioService: UsuarioService,
    private auth: AuthService
  ) { }

  async guardar(especialista: Especialista, authId: string, especialidadesIds: number[]) {
    const usuarioRespuesta = await this.usuarioService.crear({
      auth_id: authId,
      email: especialista.email,
      tipo_usuario: 'especialista',
      estado: 'pendiente',
      imagen_perfil: especialista.imagen_perfil
    });

    if (usuarioRespuesta.error) {
      return { data: null, error: usuarioRespuesta.error };
    }

    if (!usuarioRespuesta.data) {
      return { data: null, error: usuarioRespuesta.error };
    }

    const especialistaRespuesta = await this.usuarioService.crearRelacionado(
      'especialistas',
      {
        usuario_id: usuarioRespuesta.data.id,
        nombre: especialista.nombre,
        apellido: especialista.apellido,
        edad: especialista.edad,
        dni: especialista.dni
      }
    );

    if (especialistaRespuesta.error) {
      return { data: null, error: especialistaRespuesta.error };
    }

    if (!especialistaRespuesta.data) {
      return { data: null, error: especialistaRespuesta.error };
    }

    if (especialidadesIds && especialidadesIds.length > 0) {
      const relaciones = [];
      for (const id of especialidadesIds) {
        relaciones.push({
          especialista_id: especialistaRespuesta.data.id,
          especialidad_id: id
        });
      }
      await supabase.from('especialista_especialidad').insert(relaciones);
    }

    return {
      usuario: usuarioRespuesta.data,
      especialista: especialistaRespuesta.data
    };
  }


  async obtenerEspecialistaActual() {
  // 1) Obtener sesión real de Supabase
  const { data: session } = await supabase.auth.getSession();

  const user = session?.session?.user;
  if (!user) return null;

  // 2) Buscar usuario interno
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!usuarioData) return null;

  // 3) Buscar especialista
  const { data: especialistaData } = await supabase
    .from('especialistas')
    .select('*')
    .eq('usuario_id', usuarioData.id)
    .single();

  return especialistaData || null;
}

  actualizarDatos(usuarioId: number, datos: any) {
    return this.usuarioService.actualizarRelacionado('especialistas', usuarioId, datos);
  }

  obtenerPorUsuarioId(usuarioId: number) {
    return this.usuarioService.obtenerRelacionado('especialistas', usuarioId);
  }


  async obtenerEspecialistaPorUsuario(usuarioId: number) {
    const respuesta = await supabase
      .from('especialistas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle();

    if (respuesta.error) throw respuesta.error;
    return respuesta.data;
  }

  async obtenerEspecialidades() {
    const respuesta = await supabase.from('especialidades').select('*');
    if (respuesta.error) throw respuesta.error;
    return respuesta.data;
  }

  async obtenerEspecialidadesDeEspecialista(especialistaId: number) {
    const { data: relaciones, error: relError } = await supabase
      .from('especialista_especialidad')
      .select('especialidad_id')
      .eq('especialista_id', especialistaId);

    if (relError) return [];
    if (!relaciones || relaciones.length === 0) return [];

    const ids = relaciones.map(item => item.especialidad_id);
    const { data: especialidades, error: espError } = await supabase
      .from('especialidades')
      .select('*')
      .in('id', ids);

    if (espError) return [];
    return especialidades || [];
  }



  async obtenerTodosEspecialistas(): Promise<any[]> {
    try {
      // 1. Obtener todos los especialistas
      const { data: especialistasData, error: especialistasError } = await supabase
        .from('especialistas')
        .select('*');

      if (especialistasError || !especialistasData) {
        console.error('Error obteniendo especialistas:', especialistasError);
        return [];
      }

      if (especialistasData.length === 0) {
        console.log('No hay especialistas registrados');
        return [];
      }

      // 2. Obtener usuarios correspondientes
      const usuarioIds = especialistasData.map(esp => esp.usuario_id);
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, email, imagen_perfil, estado')
        .in('id', usuarioIds);

      // 3. Combinar datos
      return especialistasData.map(esp => {
        const usuario = usuariosData?.find(u => u.id === esp.usuario_id);

        // Limpiar imagen_perfil
        let imagenPerfil = usuario?.imagen_perfil;
        if (imagenPerfil === 'undefined' || imagenPerfil === 'null') {
          imagenPerfil = null;
        }

        return {
          id: esp.id,
          usuario_id: esp.usuario_id,
          nombre: esp.nombre || '',
          apellido: esp.apellido || '',
          email: usuario?.email || '',
          imagen_perfil: imagenPerfil,
          estado: usuario?.estado || 'inactivo',
          tipo_usuario: 'especialista',
          edad: esp.edad || 0,
          dni: esp.dni || '',
        };
      });

    } catch (error) {
      console.error('Error obteniendo especialistas:', error);
      return [];
    }
  }
}