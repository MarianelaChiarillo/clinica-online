import { Injectable } from '@angular/core';
import { UsuarioService } from './usuario.service';
import { Especialista } from '../../models/user-data';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class EspecialistaService {

  constructor(
    private usuarioService: UsuarioService,
    private supabase: SupabaseClient,
    private auth: AuthService
  ) {}

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

      await this.supabase
        .from('especialista_especialidad')
        .insert(relaciones);
    }

    return {
      usuario: usuarioRespuesta.data,
      especialista: especialistaRespuesta.data
    };
  }

  actualizarDatos(usuarioId: number, datos: any) {
    return this.usuarioService.actualizarRelacionado('especialistas', usuarioId, datos);
  }

  obtenerPorUsuarioId(usuarioId: number) {
    return this.usuarioService.obtenerRelacionado('especialistas', usuarioId);
  }

  async obtenerEspecialistaActual() {
    const authUser = await this.auth.getUsuarioActual();

    if (!authUser) {
      return null;
    }

    const respuesta = await this.supabase
      .from('especialistas')
      .select('*')
      .eq('usuario_id', authUser.id)
      .single();

    if (respuesta.error) {
      throw respuesta.error;
    }

    return respuesta.data;
  }

  async obtenerEspecialistaPorUsuario(usuarioId: number) {
    const respuesta = await this.supabase
      .from('especialistas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    if (respuesta.error) {
      throw respuesta.error;
    }

    return respuesta.data;
  }

  async obtenerEspecialidades() {
    const respuesta = await this.supabase
      .from('especialidades')
      .select('*');

    if (respuesta.error) {
      throw respuesta.error;
    }

    return respuesta.data;
  }

  async obtenerEspecialidadesDeEspecialista(especialistaId: number) {
    const relacionRespuesta = await this.supabase
      .from('especialista_especialidad')
      .select('especialidad_id')
      .eq('especialista_id', especialistaId);

    if (relacionRespuesta.error) {
      return [];
    }

    if (!relacionRespuesta.data) {
      return [];
    }

    const ids = relacionRespuesta.data.map(item => item.especialidad_id);

    const especialidadesRespuesta = await this.supabase
      .from('especialidades')
      .select('id, nombre')
      .in('id', ids);

    if (!especialidadesRespuesta.data) {
      return [];
    }

    return especialidadesRespuesta.data;
  }
}
