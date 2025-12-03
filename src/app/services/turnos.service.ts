import { Injectable } from '@angular/core';
import supabase from './supabase.client';

@Injectable({ providedIn: 'root' })
export class TurnoService {

  async crearTurno(turnoData: any) {
    try {
      const payload = {
        paciente_id: turnoData.paciente_id,
        especialista_id: turnoData.especialista_id,
        especialidad_id: turnoData.especialidad_id,
        fecha_turno: turnoData.fecha_turno,
        hora_inicio: turnoData.hora_inicio,
        hora_fin: turnoData.hora_fin,
        estado: turnoData.estado || 'pendiente'
      };

      const { data, error } = await supabase
        .from('turnos')
        .insert([payload])
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  suscripcionTurnos: any = null;

suscribirseATurnos(especialistaId: number, fecha: string, callback: (evento: any) => void) {
  if (this.suscripcionTurnos) {
    supabase.removeChannel(this.suscripcionTurnos);
    this.suscripcionTurnos = null;
  }

  this.suscripcionTurnos = supabase
    .channel('turnos-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',          // insert, update, delete
        schema: 'public',
        table: 'turnos',
        filter: `especialista_id=eq.${especialistaId},fecha_turno=eq.${fecha}`
      },
      payload => callback(payload)
    )
    .subscribe();
}

limpiarSuscripcion() {
  if (this.suscripcionTurnos) {
    supabase.removeChannel(this.suscripcionTurnos);
    this.suscripcionTurnos = null;
  }
}

  async obtenerTurnosPorEspecialistaYFecha(especialistaId: number, fecha: string) {
    try {
      const { data, error } = await supabase
        .from('turnos')
        .select('*')
        .eq('especialista_id', especialistaId)
        .eq('fecha_turno', fecha) // <- CAMBIADO: fecha_turno en lugar de fecha
        .eq('estado', 'solicitado');

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }
  async verificarTurnoExistente(idPaciente: number, idEspecialista: number, fecha: string, hora: string) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .eq('paciente_id', idPaciente)
      .eq('especialista_id', idEspecialista)
      .eq('fecha_turno', fecha)
      .eq('hora', hora)
      .maybeSingle();

    return { data: resultado.data, error: resultado.error };
  }

async obtenerTurnosDeEspecialista(idEspecialista: number) {
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      pacientes:paciente_id (
        id,
        nombre,
        apellido
      ),
      especialidades:especialidad_id (
        id,
        nombre
      )
    `)
    .eq('especialista_id', idEspecialista)
    .order('fecha_turno', { ascending: true });

  return { data, error };
}

  async obtenerTurnosDePaciente(idPaciente: number) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .eq('paciente_id', idPaciente)
      .order('fecha_turno', { ascending: true });

    return { data: resultado.data, error: resultado.error };
  }


  async obtenerTurnosDePacienteConDatos(pacienteId: number) {
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select(`
      *,
      especialistas(id, nombre, apellido),
      especialidades(id, nombre)
    `)
      .eq('paciente_id', pacienteId)
      .order('fecha_turno', { ascending: true });

    // Mapear para que coincida con TurnoExtendido
    const turnosExtendidos = (turnos || []).map(turno => ({
      ...turno,
      especialista: turno.especialistas ?? null,
      especialidad: turno.especialidades ?? null,
      historia_clinica: undefined,
      coincidencias: []
    }));

    return { data: turnosExtendidos, error };
  }


  async obtenerTurno(idTurno: number) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .eq('id', idTurno)
      .single();

    return { data: resultado.data, error: resultado.error };
  }



  async cancelarTurno(idTurno: number, motivo: string) {
    const resultado = await supabase
      .from('turnos')
      .update({ estado: 'cancelado', motivo_cancelacion: motivo })
      .eq('id', idTurno)
      .select()
      .single();

    return { data: resultado.data, error: resultado.error };
  }

async finalizarTurno(idTurno: number, comentario: string) {
  console.log('FINALIZAR ENVIANDO:', {
    estado: 'realizado',
    comentario_especialista: comentario,
  });

  const resultado = await supabase
    .from('turnos')
    .update({
      estado: 'realizado',
      comentario_especialista: comentario,
    })
    .eq('id', idTurno)
    .select()
    .single();

  console.log('FINALIZAR RESPUESTA:', resultado);

  return { data: resultado.data, error: resultado.error };
}



  async aceptarTurno(idTurno: number) {
    const resultado = await supabase
      .from('turnos')
      .update({ estado: 'aceptado' })
      .eq('id', idTurno)
      .select()
      .single();

    return { data: resultado.data, error: resultado.error };
  }

  async rechazarTurno(idTurno: number, motivo: string) {
    const resultado = await supabase
      .from('turnos')
      .update({ estado: 'rechazado', motivo_cancelacion: motivo })
      .eq('id', idTurno)
      .select()
      .single();

    return { data: resultado.data, error: resultado.error };
  }


  async actualizarTurnoEstado(idTurno: number, estado: string) {
    const resultado = await supabase
      .from('turnos')
      .update({ estado })
      .eq('id', idTurno)
      .select()
      .single();

    return { data: resultado.data, error: resultado.error };
  }
  async calificarAtencion(idTurno: number, puntuacion: number) {
    const resultado = await supabase
      .from('turnos')
      .update({ calificacion: puntuacion })
      .eq('id', idTurno)
      .select()
      .single();

    return { data: resultado.data, error: resultado.error };
  }

  async completarEncuesta(idTurno: number, respuestas: any) {
    const objetoEncuesta: any = { turno_id: idTurno };
    for (let llave in respuestas) {
      objetoEncuesta[llave] = respuestas[llave];
    }

    const resultado = await supabase
      .from('encuestas')
      .insert([objetoEncuesta])
      .select()
      .single();

    return { data: resultado.data, error: resultado.error };
  }

  async obtenerEncuestaPorTurno(idTurno: number) {
    const resultado = await supabase
      .from('encuestas')
      .select('*')
      .eq('turno_id', idTurno)
      .maybeSingle();

    return { data: resultado.data, error: resultado.error };
  }

  async obtenerTurnosEntreFechas(fechaDesde: string, fechaHasta: string) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .order('fecha', { ascending: true });

    return { data: resultado.data, error: resultado.error };
  }

  async obtenerTurnosPorFecha(fecha: string) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .eq('fecha', fecha)
      .order('hora', { ascending: true });

    return { data: resultado.data, error: resultado.error };
  }
}
