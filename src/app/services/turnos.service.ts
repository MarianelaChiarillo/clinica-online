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

  async obtenerTurnosPorPaciente(pacienteId: number): Promise<Turno[]> {
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        *,
        especialistas(id, nombre, apellido),
        especialidades(id, nombre)
      `)
      .eq('paciente_id', pacienteId)
      .order('fecha_turno', { ascending: true });

    if (error) {
      console.error('Error obteniendo turnos del paciente:', error);
      return [];
    }

    return data as Turno[];
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



  async completarEncuesta(turnoId: number, comentario: string) {
    const { error } = await supabase
      .from('turnos')
      .update({ reseña_paciente: comentario })
      .eq('id', turnoId);

    if (error) throw error;
  }
// En tu turnos.service.ts - agregar estos métodos
async finalizarTurnoConEncuesta(turnoId: number, resena: string, encuestaId: number) {
  const updateData: any = { 
    estado: 'realizado'
  };

  if (resena.trim()) {
    updateData.comentario_especialista = resena;
  }

  if (encuestaId) {
    updateData.id_encuesta = encuestaId;
  }

  const { data, error } = await supabase
    .from('turnos')
    .update(updateData)
    .eq('id', turnoId)
    .select();

  if (error) throw error;
  return data?.[0];
}

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
}