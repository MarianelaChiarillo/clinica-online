// turnos.service.ts
import { Injectable } from '@angular/core';
import supabase from './supabase.client';
import { AuthService } from './auth.service';
import { Turno } from '../models/turno';

@Injectable({ providedIn: 'root' })
export class TurnosService {
  constructor(private authService: AuthService) {}

  // ==================== MÉTODOS PRIVADOS REUTILIZABLES ====================

  private async obtenerEspecialistaIdActual(): Promise<number | null> {
    try {
      const usuario = await this.authService.getUsuarioActualP();
      if (!usuario) return null;

      const { data: especialista } = await supabase
        .from('especialistas')
        .select('id')
        .eq('usuario_id', usuario.id)
        .single();

      return especialista?.id || null;
    } catch (error) {
      console.error('Error obteniendo especialista:', error);
      return null;
    }
  }

  private async obtenerPacienteIdActual(): Promise<number | null> {
    try {
      const usuario = await this.authService.getUsuarioActualP();
      if (!usuario) return null;

      const { data: paciente } = await supabase
        .from('pacientes')
        .select('id')
        .eq('usuario_id', usuario.id)
        .single();

      return paciente?.id || null;
    } catch (error) {
      console.error('Error obteniendo paciente:', error);
      return null;
    }
  }

  // ==================== CONSULTAS PRINCIPALES ====================

  async obtenerTurnosDelEspecialistaActual(): Promise<Turno[]> {
    const especialistaId = await this.obtenerEspecialistaIdActual();
    if (!especialistaId) return [];

    return this.obtenerTurnosPorEspecialista(especialistaId);
  }

  async obtenerTurnosDelPacienteActual(): Promise<Turno[]> {
    const pacienteId = await this.obtenerPacienteIdActual();
    if (!pacienteId) return [];

    return this.obtenerTurnosPorPaciente(pacienteId);
  }

  async obtenerTurnosPorEspecialista(especialistaId: number): Promise<Turno[]> {
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        *,
        pacientes(id, nombre, apellido),
        especialidades(id, nombre)
      `)
      .eq('especialista_id', especialistaId)
      .order('fecha_turno', { ascending: true });

    if (error) {
      console.error('Error obteniendo turnos del especialista:', error);
      return [];
    }

    return data as Turno[];
  }

  async obtenerTurnosPorPaciente(pacienteId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        *,
        pacientes(*),
        especialistas(*),
        especialidades(*),
        encuestas!left(*)
      `)
      .eq('paciente_id', pacienteId)
      .order('fecha_turno', { ascending: true });

    if (error) {
      console.error('Error obteniendo turnos del paciente:', error);
      return [];
    }

    console.log('TURNOS CON ENCUESTAS →', data);
    return data;
  }

  
  // ==================== GESTIÓN DE TURNOS ====================

  async crearTurno(turnoData: {
    pacienteId: number;
    especialistaId: number;
    especialidadId: number;
    fecha: string;
    horaInicio: string;
    horaFin: string;
  }) {
    // Verificar disponibilidad
    const existe = await this.verificarTurnoExistente(
      turnoData.especialistaId, 
      turnoData.fecha, 
      turnoData.horaInicio
    );

    if (existe) {
      throw new Error('El turno ya fue tomado por otra persona');
    }

    const { data, error } = await supabase
      .from('turnos')
      .insert([{
        paciente_id: turnoData.pacienteId,
        especialista_id: turnoData.especialistaId,
        especialidad_id: turnoData.especialidadId,
        fecha_turno: turnoData.fecha,
        hora_inicio: turnoData.horaInicio,
        hora_fin: turnoData.horaFin,
        estado: 'solicitado',
        fecha_solicitud: new Date(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarEstado(turnoId: number, nuevoEstado: string, comentario?: string) {
    const updateData: any = { estado: nuevoEstado };
    
    if (comentario) {
      // Asignar comentario según el estado
      const campoComentario = this.obtenerCampoComentario(nuevoEstado);
      if (campoComentario) updateData[campoComentario] = comentario;
    }

    const { data, error } = await supabase
      .from('turnos')
      .update(updateData)
      .eq('id', turnoId)
      .select();

    if (error) throw error;
    return data?.[0];
  }

  private obtenerCampoComentario(estado: string): string | null {
    const map: { [key: string]: string } = {
      'cancelado': 'comentario_cancelacion',
      'rechazado': 'comentario_rechazo',
      'realizado': 'comentario_especialista'
    };
    return map[estado] || null;
  }

  // ==================== MÉTODOS ESPECÍFICOS POR ACCIÓN ====================

  async aceptarTurno(turnoId: number) {
    return this.actualizarEstado(turnoId, 'aceptado');
  }

  async rechazarTurno(turnoId: number, motivo: string) {
    return this.actualizarEstado(turnoId, 'rechazado', motivo);
  }

  async cancelarTurno(turnoId: number, motivo: string) {
    return this.actualizarEstado(turnoId, 'cancelado', motivo);
  }

  async finalizarTurno(turnoId: number, reseña: string) {
    return this.actualizarEstado(turnoId, 'realizado', reseña);
  }

  // ==================== MÉTODOS DE VALIDACIÓN ====================

  async verificarTurnoExistente(especialistaId: number, fecha: string, hora: string): Promise<boolean> {
    const { data } = await supabase
      .from('turnos')
      .select('id')
      .eq('especialista_id', especialistaId)
      .eq('fecha_turno', fecha)
      .eq('hora_inicio', hora)
      .in('estado', ['solicitado', 'aceptado'])
      .maybeSingle();

    return !!data;
  }

  async obtenerTurnosPorEspecialistaYFecha(especialistaId: number, fecha: string) {
    const { data, error } = await supabase
      .from('turnos')
      .select('hora_inicio')
      .eq('especialista_id', especialistaId)
      .eq('fecha_turno', fecha)
      .in('estado', ['solicitado', 'aceptado']);

    if (error) {
      console.error('Error obteniendo turnos:', error);
      return [];
    }

    return data || [];
  }

  // ==================== CALIFICACIONES Y ENCUESTAS ====================

  async calificarAtencion(turnoId: number, calificacion: number, comentario?: string) {
    const updateData: any = { 
      calificacion_atencion: calificacion 
    };

    if (comentario) {
      updateData.comentario_calificacion = comentario;
    }

    const { error } = await supabase
      .from('turnos')
      .update(updateData)
      .eq('id', turnoId);

    if (error) throw error;
  }

  // ==================== MÉTODOS PARA ENCUESTAS ====================
// Y en completarEncuesta, quita la llamada a marcarTurnoConEncuesta:
async completarEncuesta(turnoId: number, encuestaData: {
  instalaciones: number;
  atencion: number;
  tiempo_espera: number;
  general: number;
  comentarios?: string;
}) {
  const { data, error } = await supabase
    .from('encuestas')
    .insert([{
      turno_id: turnoId,
      instalaciones: encuestaData.instalaciones,
      atencion: encuestaData.atencion,
      tiempo_espera: encuestaData.tiempo_espera,
      general: encuestaData.general,
      comentarios: encuestaData.comentarios
    }])
    .select()
    .single();

  if (error) {
    console.error('Error completando encuesta:', error);
    throw error;
  }

  // NO marcar el turno con encuesta - la relación encuestas!left ya lo maneja
  return data;
}

  async obtenerEncuestaPorTurno(turnoId: number) {
    const { data, error } = await supabase
      .from('encuestas')
      .select('*')
      .eq('turno_id', turnoId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo encuesta:', error);
      throw error;
    }
    return data;
  }

  // En tu turnos.service.ts - AGREGAR ESTOS MÉTODOS

// ==================== MÉTODOS PARA CUALQUIER USUARIO ====================

/**
 * Obtener turnos por ID de paciente (para administradores)
 */

/**
 * Obtener turnos por ID de especialista (para administradores)
 */


// En turnos.service.ts - AGREGAR ESTE MÉTODO DE DEBUG
async debugEstructuraTurnos(): Promise<void> {
  console.log('🔍 === DEBUG ESTRUCTURA DE TURNOS ===');
  
  // Ver algunos turnos existentes
  const { data: turnos, error } = await supabase
    .from('turnos')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error obteniendo turnos:', error);
    return;
  }

  console.log('📋 TURNOS EXISTENTES:', turnos);
  
  // Ver estructura de pacientes
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id, nombre, usuario_id')
    .limit(5);

  console.log('👤 PACIENTES EXISTENTES:', pacientes);
  
  // Ver estructura de especialistas  
  const { data: especialistas } = await supabase
    .from('especialistas')
    .select('id, nombre, usuario_id')
    .limit(5);

  console.log('🩺 ESPECIALISTAS EXISTENTES:', especialistas);
}
// En turnos.service.ts - REEMPLAZAR los métodos problemáticos

async obtenerTurnosPorPacienteId(usuarioId: number): Promise<any[]> {
  console.log('🔍 Buscando turnos para usuario ID:', usuarioId);
  
  // PRIMERO: Obtener el ID del paciente desde la tabla pacientes
  const { data: paciente, error: errorPaciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', usuarioId)
    .single();

  if (errorPaciente || !paciente) {
    console.error('❌ No se encontró paciente para usuario ID:', usuarioId, errorPaciente);
    return [];
  }

  console.log('✅ Paciente encontrado - ID real:', paciente.id, 'para usuario:', usuarioId);

  // SEGUNDO: Buscar turnos usando el ID real del paciente
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      pacientes(*),
      especialistas(*),
      especialidades(*),
      encuestas!left(*)
    `)
    .eq('paciente_id', paciente.id)
    .order('fecha_turno', { ascending: true });

  if (error) {
    console.error('❌ Error obteniendo turnos:', error);
    return [];
  }

  console.log('✅ Turnos encontrados para paciente', paciente.id, ':', data.length, 'turnos');
  return data;
}

async obtenerTurnosPorEspecialistaId(usuarioId: number): Promise<any[]> {
  console.log('🔍 Buscando turnos para especialista usuario ID:', usuarioId);
  
  // PRIMERO: Obtener el ID del especialista desde la tabla especialistas
  const { data: especialista, error: errorEspecialista } = await supabase
    .from('especialistas')
    .select('id')
    .eq('usuario_id', usuarioId)
    .single();

  if (errorEspecialista || !especialista) {
    console.error('❌ No se encontró especialista para usuario ID:', usuarioId, errorEspecialista);
    return [];
  }

  console.log('✅ Especialista encontrado - ID real:', especialista.id, 'para usuario:', usuarioId);

  // SEGUNDO: Buscar turnos usando el ID real del especialista
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      pacientes(*),
      especialistas(*),
      especialidades(*),
      encuestas!left(*)
    `)
    .eq('especialista_id', especialista.id)
    .order('fecha_turno', { ascending: true });

  if (error) {
    console.error('❌ Error obteniendo turnos:', error);
    return [];
  }

  console.log('✅ Turnos encontrados para especialista', especialista.id, ':', data.length, 'turnos');
  return data;
}


}


