import { Injectable } from '@angular/core';
import supabase from './../services/supabase.client';
import { EspecialistaService } from './usuarios/especialista.service';
import { TurnoService } from './turnos.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {

  // Subject único para emitir horarios libres
  private _horarios$ = new BehaviorSubject<string[] | null>(null);
  public horariosDisponibles$ = this._horarios$.asObservable();

  private canalTurnos: any = null;

  constructor(
    private especialistaSrv: EspecialistaService,
    private turnoSrv: TurnoService
  ) {}

  // --------------------------------------------------------------------
  // 📌 CARGA DE HORARIOS
  // --------------------------------------------------------------------

  async obtenerHorariosPorEspecialista(id: number) {
    const { data, error } = await supabase
      .from('disponibilidad_especialista')
      .select('*')
      .eq('especialista_id', id)
      .order('dia_semana', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async obtenerMisHorarios() {
    const esp = await this.especialistaSrv.obtenerEspecialistaActual();
    return esp ? this.obtenerHorariosPorEspecialista(esp.id) : [];
  }

  
  // --------------------------------------------------------------------
  // 🔄 REALTIME
  // --------------------------------------------------------------------

  async actualizarHorariosRealtime(espId: number, fecha: string) {
    const nuevos = await this.generarHorariosDisponibles(espId, fecha);
    this._horarios$.next(nuevos);
  }

  suscribirseATurnos(espId: number, fecha: string) {
    if (this.canalTurnos) supabase.removeChannel(this.canalTurnos);

    this.canalTurnos = supabase
      .channel(`rt-turnos-${espId}-${fecha}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'turnos', filter: `especialista_id=eq.${espId}` },
        async () => this.actualizarHorariosRealtime(espId, fecha)
      )
      .subscribe();
  }

  limpiarSuscripcion() {
    if (this.canalTurnos) supabase.removeChannel(this.canalTurnos);
    this.canalTurnos = null;
    this._horarios$.next(null);
  }

  // --------------------------------------------------------------------
  // 🧱 CRUD HORARIOS
  // --------------------------------------------------------------------

  async agregarHorarioSimple(h: any) {
    return this.agregarHorario(
      h.especialistaId,
      h.especialidadId,
      h.diaSemana,
      h.horaInicio,
      h.horaFin,
      h.duracionConsulta ?? 30
    );
  }

  async agregarHorario(
    espId: number,
    espCid: number,
    dia: number,
    ini: string,
    fin: string,
    dur: number
  ) {
    const { data, error } = await supabase
      .from('disponibilidad_especialista')
      .insert([{
        especialista_id: espId,
        especialidad_id: espCid,
        dia_semana: dia,
        hora_inicio: ini,
        hora_fin: fin,
        duracion_consulta: dur,
        activo: true
      }])
      .select();

    if (error) throw error;
    return data ?? [];
  }

  async eliminarHorario(id: number) {
    const { error } = await supabase
      .from('disponibilidad_especialista')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async cambiarEstado(id: number, activo: boolean) {
    const { error } = await supabase
      .from('disponibilidad_especialista')
      .update({ activo })
      .eq('id', id);

    if (error) throw error;
  }

  // --------------------------------------------------------------------
  // ⛏ UTILIDADES
  // --------------------------------------------------------------------

  private obtenerDiaDeFecha(f: string) {
    const [y, m, d] = f.split('-').map(Number);
    return new Date(y, m - 1, d, 12).getDay();
  }

  private filtrarDuplicados(horarios: any[]) {
    const map = new Map();
    for (const h of horarios) {
      const k = `${h.dia_semana}-${h.hora_inicio}-${h.hora_fin}`;
      if (!map.has(k)) map.set(k, h);
    }
    return Array.from(map.values());
  }

  private generarSlots(ini: string, fin: string, dur: number) {
    const res: string[] = [];

    let h = parseInt(ini.slice(0, 2));
    let m = parseInt(ini.slice(3));
    const hf = parseInt(fin.slice(0, 2));
    const mf = parseInt(fin.slice(3));

    while (h < hf || (h === hf && m < mf)) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      res.push(`${hh}:${mm}`);

      m += dur;
      if (m >= 60) {
        h++;
        m -= 60;
      }
    }

    return res;
  }

  private filtrarLibres(todas: string[], ocupadas: string[]) {
    return todas.filter(h => !ocupadas.includes(h));
  }



  async generarHorariosDisponibles(especialistaId: number, fecha: string) {
  try {
    const diaJs = this.obtenerDiaDeFecha(fecha);
    const diaBd = diaJs === 0 ? 7 : diaJs;

    const horarios = await this.obtenerHorariosPorEspecialista(especialistaId);
    const unicos = this.filtrarDuplicados(horarios);

    const delDia = unicos.filter(h => h.activo && h.dia_semana === diaBd);
    if (delDia.length === 0) return [];

    const turnos = await this.turnoSrv.obtenerTurnosPorEspecialistaYFecha(especialistaId, fecha);
    const ocupadas = turnos.data?.map(t => t.hora_inicio?.substring(0, 5)) ?? [];

    const slots = new Set<string>();
    const hoy = new Date();
    const esHoy = this.esFechaHoy(fecha);

    for (const h of delDia) {
      const bloques = this.generarSlots(h.hora_inicio, h.hora_fin, h.duracion_consulta);
      
      // Si es hoy, filtrar horas pasadas
      let libres = this.filtrarLibres(bloques, ocupadas);
      
      if (esHoy) {
        libres = this.filtrarHorasPasadas(libres, hoy);
      }
      
      libres.forEach(s => slots.add(s));
    }

    return Array.from(slots).sort();

  } catch (e) {
    console.error('Error generando horarios:', e);
    return [];
  }
}

// --------------------------------------------------------------------
// 🕐 NUEVO: FILTRAR HORAS PASADAS
// --------------------------------------------------------------------

private esFechaHoy(fecha: string): boolean {
  const hoy = new Date();
  const hoyStr = hoy.toISOString().split('T')[0];
  return fecha === hoyStr;
}

private filtrarHorasPasadas(horarios: string[], horaActual: Date): string[] {
  const horaActualStr = this.formatearHoraActual(horaActual);
  
  return horarios.filter(horario => {
    // Comparar HH:MM
    return horario > horaActualStr;
  });
}

private formatearHoraActual(fecha: Date): string {
  const horas = fecha.getHours().toString().padStart(2, '0');
  const minutos = fecha.getMinutes().toString().padStart(2, '0');
  return `${horas}:${minutos}`;
}
}
