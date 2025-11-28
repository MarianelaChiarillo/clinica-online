import { Injectable } from '@angular/core';
import supabase from './supabase.client';
import { TurnosService } from './turnos.service';

@Injectable({ providedIn: 'root' })
export class HorariosService {

  constructor(private turnoSrv: TurnosService) {}

  // ============================================================
  // OBTENER HORARIOS DEL ESPECIALISTA
  // ============================================================
  async obtenerHorariosPorEspecialista(especialistaId: number) {
    const { data, error } = await supabase
      .from('disponibilidad_especialista')
      .select('*')
      .eq('especialista_id', especialistaId)
      .order('dia_semana', { ascending: true });

    if (error) {
      console.error('Error al obtener horarios:', error);
      throw error;
    }

    return data || [];
  }

  // ============================================================
  // AGREGAR HORARIO
  // ============================================================
  async agregarHorario(
    especialistaId: number,
    especialidadId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    duracionConsulta: number = 30
  ) {
    const { data, error } = await supabase
      .from('disponibilidad_especialista')
      .insert([{
        especialista_id: especialistaId,
        especialidad_id: especialidadId,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        duracion_consulta: duracionConsulta,
        activo: true,
      }])
      .select();

    if (error) throw error;
    return data;
  }

  // ============================================================
  // ELIMINAR HORARIO
  // ============================================================
  async eliminarHorario(id: number) {
    const { error } = await supabase
      .from('disponibilidad_especialista')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar horario:', error);
      throw error;
    }
  }

  // ============================================================
  // CAMBIAR ESTADO (ACTIVO / INACTIVO)
  // ============================================================
  async cambiarEstado(id: number, activo: boolean) {
    const { error } = await supabase
      .from('disponibilidad_especialista')
      .update({ activo })
      .eq('id', id);

    if (error) {
      console.error('Error al cambiar estado:', error);
      throw error;
    }
  }

  // ============================================================
  // OBTENER HORARIOS DISPONIBLES POR FECHA
  // ============================================================
  async obtenerHorariosDisponibles(especialistaId: number, fecha: string) {
    // 1. Convertir fecha → díaSemana
    const diaSemana = new Date(fecha).getDay(); // 0=Domingo

    // 2. Obtener disponibilidad del especialista
    const horarios = await this.obtenerHorariosPorEspecialista(especialistaId);

    // Filtrar HORARIOS ACTIVOS del día correspondiente
    const horariosDelDia = horarios.filter(h =>
      h.activo &&
      h.dia_semana === diaSemana
    );

    if (!horariosDelDia.length) return [];

    // 3. Obtener turnos ya ocupados
const turnos = await this.turnoSrv.obtenerTurnosPorEspecialistaYFecha(especialistaId, fecha);

    // Normalizamos "09:00:00" → "09:00"
   // Y agregar el tipo al parámetro t (línea 108):
const horasOcupadas = turnos.map((t: any) =>
  String(t.hora_inicio || '').substring(0, 5)
);

    // 4. Generar slots disponibles
    const horariosDisponibles: string[] = [];

    for (const horario of horariosDelDia) {
      const slots = this.generarSlots(
        horario.hora_inicio,
        horario.hora_fin,
        horario.duracion_consulta
      );

      const libres = slots.filter(s => !horasOcupadas.includes(s));
      horariosDisponibles.push(...libres);
    }

    return horariosDisponibles;
  }

  // ============================================================
  // GENERAR SLOTS (intervalos horarios)
  // ============================================================
  private generarSlots(horaInicio: string, horaFin: string, duracion: number): string[] {
    const slots: string[] = [];

    let [h, m] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);

    while (h < hFin || (h === hFin && m < mFin)) {
      const slot = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push(slot);

      m += duracion;
      if (m >= 60) {
        h++;
        m = 0;
      }
    }

    return slots;
  }

  // ============================================================
  // VER SI TRABAJA UN DÍA
  // ============================================================
  async especialistaTrabajaDia(especialistaId: number, diaSemana: number) {
    const horarios = await this.obtenerHorariosPorEspecialista(especialistaId);
    return horarios.some(h => h.dia_semana === diaSemana && h.activo);
  }

   async obtenerUsuarioActual(): Promise<any> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
      }
      
      console.log('👤 Usuario de Auth:', user);
      return user;
      
    } catch (err) {
      console.error('Error en obtenerUsuarioActual:', err);
      return null;
    }
  }

  async obtenerPerfilCompleto(): Promise<any> {
    try {
      const user = await this.obtenerUsuarioActual();
      if (!user) return null;

      // Buscar en la tabla de especialistas
      const { data: especialista, error } = await supabase
        .from('especialistas')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

      if (!error && especialista) {
        return { ...user, rol: 'especialista', perfil: especialista };
      }

      // Buscar en la tabla de pacientes
      const { data: paciente, error: errorPaciente } = await supabase
        .from('pacientes')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

      if (!errorPaciente && paciente) {
        return { ...user, rol: 'paciente', perfil: paciente };
      }

      console.log('ℹ️ Usuario no encontrado en especialistas ni pacientes');
      return user;

    } catch (err) {
      console.error('Error obteniendo perfil completo:', err);
      return null;
    }
  }

}
