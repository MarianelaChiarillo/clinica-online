import { Injectable } from '@angular/core';
import { UsuarioService } from './usuario.service';
import { Paciente } from '../../models/user-data';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class PacienteService {

  constructor(
    private usuarioService: UsuarioService,
    private auth: AuthService,
    private supabase: SupabaseClient
  ) {}

  async guardar(paciente: Paciente) {
    const { data, error } = await this.usuarioService.crear({
      auth_id: paciente.auth_id,
      email: paciente.email,
      tipo_usuario: 'paciente',
      estado: 'activo',
      imagen_perfil: paciente.imagen_perfil
    });

    if (error) return { data: null, error };
    if (!data) return { data: null, error: new Error('No se pudo crear usuario') };

    const result = await this.usuarioService.crearRelacionado('pacientes', {
      usuario_id: data.id,
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      edad: paciente.edad,
      dni: paciente.dni,
      obra_social: paciente.obra_social,
      segunda_imagen: paciente.segunda_imagen
    });

    return result;
  }

  actualizarDatos(usuarioId: number, datos: any) {
    return this.usuarioService.actualizarRelacionado('pacientes', usuarioId, datos);
  }

  obtenerPorUsuarioId(usuarioId: number) {
    return this.usuarioService.obtenerRelacionado('pacientes', usuarioId);
  }

  async obtenerPacienteActual() {
    const authUser = await this.auth.getUsuarioActual();
    if (!authUser) return null;

    const { data, error } = await this.supabase
      .from('pacientes')
      .select('*')
      .eq('usuario_id', authUser.id)
      .single();

    if (error) throw error;

    return data;
  }

  async obtenerPacientePorUsuario(usuarioId: number) {
    const { data, error } = await this.supabase
      .from('pacientes')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    if (error) throw error;

    return data;
  }
}
