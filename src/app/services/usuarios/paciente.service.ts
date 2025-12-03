import { Injectable } from '@angular/core';
import { UsuarioService } from './usuario.service';
import { Paciente } from '../../models/user-data';
import { AuthService } from '../auth.service';
import supabase from '../../services/supabase.client';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  constructor(
    private usuarioService: UsuarioService,
    private auth: AuthService
  ) {}

  async guardar(paciente: Paciente) {
    const { data: usuario, error } = await this.usuarioService.crear({
      auth_id: paciente.auth_id,
      email: paciente.email,
      tipo_usuario: 'paciente',
      estado: 'activo',
      imagen_perfil: paciente.imagen_perfil
    });
    if (error || !usuario) return { data: null, error };

    const result = await this.usuarioService.crearRelacionado('pacientes', {
      usuario_id: usuario.id, // integer
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

    // Obtener usuario interno por auth_id (UUID)
    const { data: usuarioInterno, error: usuarioError } = await this.usuarioService.obtenerPorAuthId(authUser.id);
    if (usuarioError || !usuarioInterno) throw new Error('Usuario interno no encontrado');

    // Obtener paciente por usuario_id (integer)
    const { data: paciente, error: pacienteError } = await supabase
      .from('pacientes')
      .select('*')
      .eq('usuario_id', usuarioInterno.id)
      .maybeSingle();

    if (pacienteError) throw pacienteError;

    return paciente;
  }

  async obtenerPacientePorUsuario(usuarioId: number) {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single();

    if (error) throw error;
    return data;
  }

  async obtenerTodos(): Promise<any[]> {
    const { data, error } = await supabase.from('pacientes').select('*');
    if (error) throw error;
    return data || [];
  }
  // paciente.service.ts
async obtenerTodosPacientes(): Promise<any[]> {
  try {
    // 1. Obtener todos los usuarios pacientes
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('tipo_usuario', 'paciente');

    if (usuariosError) throw usuariosError;
    if (!usuarios || usuarios.length === 0) return [];

    console.log('👥 Usuarios pacientes:', usuarios);

    // 2. Obtener IDs de usuarios
    const usuarioIds = usuarios.map(u => u.id);

    // 3. Obtener datos de pacientes usando los usuario_ids
    const { data: pacientesData, error: pacientesError } = await supabase
      .from('pacientes')
      .select('*')
      .in('usuario_id', usuarioIds);

    if (pacientesError) throw pacientesError;

    console.log('🏥 Datos de pacientes:', pacientesData);

    // 4. Combinar los datos
    const pacientesCombinados = usuarios.map(usuario => {
      // Buscar los datos del paciente correspondiente
      const datosPaciente = pacientesData?.find(p => p.usuario_id === usuario.id);

      return {
        id: usuario.id,
        auth_id: usuario.auth_id,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        estado: usuario.estado,
        imagen_perfil: usuario.imagen_perfil,
        nombre: datosPaciente?.nombre || '',
        apellido: datosPaciente?.apellido || '',
        dni: datosPaciente?.dni || '',
        edad: datosPaciente?.edad || 0,
        obra_social: datosPaciente?.obra_social || ''
      };
    });

    console.log('✅ Pacientes combinados:', pacientesCombinados);
    return pacientesCombinados;

  } catch (error) {
    console.error('❌ Error obteniendo pacientes:', error);
    return [];
  }
}
}
