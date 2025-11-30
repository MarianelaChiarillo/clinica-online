import { Injectable } from '@angular/core';
import supabase from './supabase.client';

@Injectable({ providedIn: 'root' })
export class TurnoService {

  async crearTurno(turno: any) {
    const resultado = await supabase
      .from('turnos')
      .insert([turno])
      .select()
      .single();

    return { data: resultado.data, error: resultado.error };
  }

  async verificarTurnoExistente(idPaciente: number, idEspecialista: number, fecha: string, hora: string) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .eq('paciente_id', idPaciente)
      .eq('especialista_id', idEspecialista)
      .eq('fecha', fecha)
      .eq('hora', hora)
      .maybeSingle();

    return { data: resultado.data, error: resultado.error };
  }

  async obtenerTurnosPorEspecialistaYFecha(idEspecialista: number, fecha: string) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .eq('especialista_id', idEspecialista)
      .eq('fecha', fecha)
      .order('hora', { ascending: true });

    return { data: resultado.data, error: resultado.error };
  }

  async obtenerTurnosDeEspecialista(idEspecialista: number) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .eq('especialista_id', idEspecialista)
      .order('fecha', { ascending: true });

    return { data: resultado.data, error: resultado.error };
  }

  async obtenerTurnosDePaciente(idPaciente: number) {
    const resultado = await supabase
      .from('turnos')
      .select('*')
      .eq('paciente_id', idPaciente)
      .order('fecha', { ascending: true });

    return { data: resultado.data, error: resultado.error };
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

  async finalizarTurno(idTurno: number, datos: any) {
    const nuevoObjeto: any = { estado: 'finalizado' };
    for (let llave in datos) {
      nuevoObjeto[llave] = datos[llave];
    }

    const resultado = await supabase
      .from('turnos')
      .update(nuevoObjeto)
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
