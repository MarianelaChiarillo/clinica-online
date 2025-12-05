import { Injectable } from '@angular/core';
import supabase from '../supabase.client';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  
  // ==================== FUNCIONES DE AJUSTE DE HORA ====================
  
  /**
   * Convierte fecha/hora UTC a hora Argentina (UTC-3)
   */
  private utcToArgentinaHora(fechaUTC: string): string {
    if (!fechaUTC) return '';
    
    const fecha = new Date(fechaUTC);
    // Argentina está en UTC-3, restamos 3 horas
    fecha.setHours(fecha.getHours() - 3);
    
    return fecha.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  
  /**
   * Convierte fecha/hora UTC a fecha Argentina (UTC-3)
   */
  private utcToArgentinaFecha(fechaUTC: string): string {
    if (!fechaUTC) return '';
    
    const fecha = new Date(fechaUTC);
    // Argentina está en UTC-3, restamos 3 horas
    fecha.setHours(fecha.getHours() - 3);
    
    return fecha.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
  
  /**
   * Convierte fecha/hora UTC a fecha y hora Argentina completas
   */
  private utcToArgentinaCompleto(fechaUTC: string): string {
    if (!fechaUTC) return '';
    
    const fecha = new Date(fechaUTC);
    // Argentina está en UTC-3, restamos 3 horas
    fecha.setHours(fecha.getHours() - 3);
    
    return fecha.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  
  /**
   * Obtiene el día de la semana en español desde una fecha UTC
   */
  private obtenerDiaSemanaArgentina(fechaUTC: string): string {
    if (!fechaUTC) return '';
    
    const fecha = new Date(fechaUTC);
    // Ajustar a hora Argentina
    fecha.setHours(fecha.getHours() - 3);
    
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[fecha.getDay()];
  }
  
  // ==================== MÉTODOS DEL SERVICIO ====================

  async obtenerLogIngresos(): Promise<any[]> {
    const { data, error } = await supabase
      .from('logs_ingresos')
      .select('usuario_id, email, nombre, apellido, fecha_hora')
      .order('fecha_hora', { ascending: false });

    if(error) {
      console.error('Error al obtener logs de ingresos:', error);
      return [];
    }

    if (!data) return [];

    // Ajustar todas las fechas a hora Argentina
    return data.map(log => ({
      ...log,
      fecha_hora_argentina: this.utcToArgentinaCompleto(log.fecha_hora),
      fecha_argentina: this.utcToArgentinaFecha(log.fecha_hora),
      hora_argentina: this.utcToArgentinaHora(log.fecha_hora),
      // Mantener la fecha original también
      fecha_hora_original: log.fecha_hora
    }));
  }

  async obtenerTurnosPorEspecialidadConNombre() {
    // 1. Traer todas las especialidades activas
    const { data: especialidades, error: espError } = await supabase
      .from('especialidades')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (espError || !especialidades) return [];

    // 2. Traer todos los turnos
    const { data: turnos, error: turnosError } = await supabase
      .from('turnos')
      .select('especialidad_id, fecha_turno, hora_inicio, hora_fin');

    if (turnosError || !turnos) return [];

    // 3. Contar turnos por especialidad_id
    const conteo: Record<number, number> = {};
    turnos.forEach(t => {
      if (t.especialidad_id) {
        conteo[t.especialidad_id] = (conteo[t.especialidad_id] || 0) + 1;
      }
    });

    // 4. Combinar nombre con cantidad (0 si no tiene turnos)
    return especialidades.map(e => ({
      especialidad: e.nombre,
      cantidad: conteo[e.id] || 0,
      id: e.id
    }));
  }

  async obtenerTurnosPorDiaSemana() {
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    // Inicializamos conteo en 0 para todos los días
    const conteo: Record<string, number> = {};
    diasSemana.forEach(d => conteo[d] = 0);

    // Traemos todos los turnos
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('fecha_turno, hora_inicio, hora_fin');

    if (error || !turnos) {
      return diasSemana.map(d => ({ 
        dia: d, 
        cantidad: 0 
      }));
    }

    // Contamos los turnos por día de la semana EN ARGENTINA
    turnos.forEach(t => {
      if (!t.fecha_turno) return;
      
      // Obtener el día de la semana en Argentina
      const diaArgentina = this.obtenerDiaSemanaArgentina(t.fecha_turno);
      
      if (diaArgentina && diaArgentina !== 'Domingo') { // Si no quieres domingos
        conteo[diaArgentina]++;
      } else if (diaArgentina === 'Domingo') {
        conteo['Domingo']++;
      }
    });

    // Ordenar según los días de la semana
    return diasSemana.map(d => ({ 
      dia: d, 
      cantidad: conteo[d] 
    }));
  }

  // ==================== NUEVOS MÉTODOS ====================

  /**
   * Obtiene turnos con fechas ajustadas a Argentina
   */
  async obtenerTurnosConHoraArgentina() {
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('*')
      .order('fecha_turno', { ascending: false });

    if (error || !turnos) return [];

    // Ajustar todas las fechas a hora Argentina
    return turnos.map(turno => ({
      ...turno,
      // Fechas ajustadas a Argentina
      fecha_turno_argentina: this.utcToArgentinaFecha(turno.fecha_turno),
      hora_inicio_argentina: this.utcToArgentinaHora(turno.hora_inicio),
      hora_fin_argentina: this.utcToArgentinaHora(turno.hora_fin),
      // Para mostrar completo
      fecha_hora_completa_argentina: `${this.utcToArgentinaFecha(turno.fecha_turno)} ${this.utcToArgentinaHora(turno.hora_inicio)}`,
      // Mantener los originales por si acaso
      fecha_turno_original: turno.fecha_turno,
      hora_inicio_original: turno.hora_inicio,
      hora_fin_original: turno.hora_fin
    }));
  }

  /**
   * Obtiene estadísticas de turnos por mes
   */
  async obtenerTurnosPorMes() {
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('fecha_turno');

    if (error || !turnos) return [];

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const conteo: Record<number, number> = {};

    turnos.forEach(t => {
      if (!t.fecha_turno) return;
      
      const fecha = new Date(t.fecha_turno);
      // Ajustar a hora Argentina
      fecha.setHours(fecha.getHours() - 3);
      
      const mes = fecha.getMonth(); // 0 = Enero, 11 = Diciembre
      conteo[mes] = (conteo[mes] || 0) + 1;
    });

    return meses.map((nombreMes, index) => ({
      mes: nombreMes,
      cantidad: conteo[index] || 0
    }));
  }

  /**
   * Obtiene cantidad de turnos por estado
   */
  async obtenerTurnosPorEstado() {
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('estado');

    if (error || !turnos) return [];

    const conteo: Record<string, number> = {};

    turnos.forEach(t => {
      const estado = t.estado || 'sin_estado';
      conteo[estado] = (conteo[estado] || 0) + 1;
    });

    // Convertir a array y ordenar por cantidad
    return Object.entries(conteo)
      .map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  /**
   * Obtiene los últimos ingresos (últimos 7 días)
   */
  async obtenerUltimosIngresos(dias: number = 7) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    const { data, error } = await supabase
      .from('logs_ingresos')
      .select('*')
      .gte('fecha_hora', fechaLimite.toISOString())
      .order('fecha_hora', { ascending: false });

    if (error || !data) return [];

    return data.map(log => ({
      ...log,
      fecha_hora_argentina: this.utcToArgentinaCompleto(log.fecha_hora),
      fecha_argentina: this.utcToArgentinaFecha(log.fecha_hora),
      hora_argentina: this.utcToArgentinaHora(log.fecha_hora)
    }));
  }
}