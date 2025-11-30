import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { EspecialistaService } from './usuarios/especialista.service';
import { TurnoService } from './turnos.service';

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {

  constructor(
    private supabase: SupabaseClient,
    private especialistaServicio: EspecialistaService,
    private turnoServicio: TurnoService
  ) {}

  async obtenerHorariosPorEspecialista(especialistaId: number) {
    const respuesta = await this.supabase
      .from('disponibilidad_especialista')
      .select('*')
      .eq('especialista_id', especialistaId)
      .order('dia_semana', { ascending: true });

    if (respuesta.error) throw respuesta.error;

    if (respuesta.data) {
      return respuesta.data;
    } else {
      return [];
    }
  }

  async obtenerMisHorarios() {
    const especialista = await this.especialistaServicio.obtenerEspecialistaActual();
    if (!especialista) return [];
    return this.obtenerHorariosPorEspecialista(especialista.id);
  }

  async agregarHorario(especialistaId: number, especialidadId: number, diaSemana: number, horaInicio: string, horaFin: string, duracionConsulta: number = 30) {
    const respuesta = await this.supabase
      .from('disponibilidad_especialista')
      .insert([{
        especialista_id: especialistaId,
        especialidad_id: especialidadId,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        duracion_consulta: duracionConsulta,
        activo: true
      }])
      .select();

    if (respuesta.error) throw respuesta.error;

    if (respuesta.data) {
      return respuesta.data;
    } else {
      return [];
    }
  }

  async eliminarHorario(id: number) {
    const respuesta = await this.supabase
      .from('disponibilidad_especialista')
      .delete()
      .eq('id', id);

    if (respuesta.error) throw respuesta.error;
  }

  async cambiarEstado(id: number, activo: boolean) {
    const respuesta = await this.supabase
      .from('disponibilidad_especialista')
      .update({ activo: activo })
      .eq('id', id);

    if (respuesta.error) throw respuesta.error;
  }

  async obtenerHorariosDisponibles(especialistaId: number, fecha: string) {
    const fechaObjeto = new Date(fecha);
    const diaDeLaSemana = fechaObjeto.getDay();

    const todosHorarios = await this.obtenerHorariosPorEspecialista(especialistaId);

    const horariosDelDia: any[] = [];
    for (let i = 0; i < todosHorarios.length; i++) {
      if (todosHorarios[i].activo === true && todosHorarios[i].dia_semana === diaDeLaSemana) {
        horariosDelDia.push(todosHorarios[i]);
      }
    }

    if (horariosDelDia.length === 0) return [];

    const turnos = await this.turnoServicio.obtenerTurnosPorEspecialistaYFecha(especialistaId, fecha);

    const horasOcupadas: string[] = [];
    if (turnos.data) {
      for (let i = 0; i < turnos.data.length; i++) {
        let hora = turnos.data[i].hora_inicio;
        if (hora) {
          horasOcupadas.push(hora.substring(0, 5));
        }
      }
    }

    const horariosDisponibles: string[] = [];
    for (let i = 0; i < horariosDelDia.length; i++) {
      const slots = this.generarSlotsBasico(
        horariosDelDia[i].hora_inicio,
        horariosDelDia[i].hora_fin,
        horariosDelDia[i].duracion_consulta
      );

      const slotsLibres = this.filtrarHorasDisponibles(slots, horasOcupadas);
      for (let j = 0; j < slotsLibres.length; j++) {
        horariosDisponibles.push(slotsLibres[j]);
      }
    }

    return horariosDisponibles;
  }

  private generarSlotsBasico(horaInicio: string, horaFin: string, duracion: number) {
    const slots: string[] = [];

    let horas = parseInt(horaInicio.substring(0, 2));
    let minutos = parseInt(horaInicio.substring(3, 5));
    const horasFin = parseInt(horaFin.substring(0, 2));
    const minutosFin = parseInt(horaFin.substring(3, 5));

    while (horas < horasFin || (horas === horasFin && minutos < minutosFin)) {
      let horasTexto = '' + horas;
      let minutosTexto = '' + minutos;

      if (horas < 10) horasTexto = '0' + horasTexto;
      if (minutos < 10) minutosTexto = '0' + minutosTexto;

      slots.push(horasTexto + ':' + minutosTexto);

      minutos = minutos + duracion;
      if (minutos >= 60) {
        horas = horas + 1;
        minutos = minutos - 60;
      }
    }

    return slots;
  }

  private filtrarHorasDisponibles(todasHoras: string[], horasOcupadas: string[]) {
    const horasLibres: string[] = [];
    for (let i = 0; i < todasHoras.length; i++) {
      let estaOcupada = false;
      for (let j = 0; j < horasOcupadas.length; j++) {
        if (todasHoras[i] === horasOcupadas[j]) {
          estaOcupada = true;
          break;
        }
      }
      if (!estaOcupada) {
        horasLibres.push(todasHoras[i]);
      }
    }
    return horasLibres;
  }

  async especialistaTrabajaDia(especialistaId: number, diaSemana: number) {
    const todosHorarios = await this.obtenerHorariosPorEspecialista(especialistaId);

    for (let i = 0; i < todosHorarios.length; i++) {
      if (todosHorarios[i].dia_semana === diaSemana && todosHorarios[i].activo === true) {
        return true;
      }
    }

    return false;
  }
}
