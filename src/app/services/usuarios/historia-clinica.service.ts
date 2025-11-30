import { Injectable } from '@angular/core';
import supabase from '../supabase.client';
import { HistoriaClinica, DatoDinamico } from '../../models/historia-clinica';

@Injectable({
  providedIn: 'root'
})
export class HistoriaClinicaService {

  async crearHistoriaClinica(historia: Omit<HistoriaClinica, 'id' | 'fecha_creacion' | 'datos_dinamicos'>): Promise<HistoriaClinica> {
    const { data, error } = await supabase
      .from('historia_clinica')
      .insert([{
        turno_id: historia.turno_id,
        paciente_id: historia.paciente_id,
        especialista_id: historia.especialista_id,
        especialidad_id: historia.especialidad_id,
        altura: historia.altura,
        peso: historia.peso,
        temperatura: historia.temperatura,
        presion: historia.presion
      }])
      .select()
      .single();

    if (error) throw error;

    return { ...data, datos_dinamicos: [] } as HistoriaClinica;
  }

  async crearHistoriaClinicaCompleta(
    historiaBase: Omit<HistoriaClinica, 'id' | 'fecha_creacion' | 'datos_dinamicos'>,
    datosDinamicos: Omit<DatoDinamico, 'id' | 'historia_clinica_id'>[]
  ): Promise<HistoriaClinica> {

    if (datosDinamicos.length > 3) throw new Error('Máximo 3 datos dinámicos permitidos');

    const historia = await this.crearHistoriaClinica(historiaBase);

    if (datosDinamicos.length) {
      await this.agregarDatosDinamicos(historia.id, datosDinamicos);
    }

    const completa = await this.obtenerPorId(historia.id);
    if (!completa) throw new Error('No se pudo obtener la historia clínica');

    return completa;
  }

  async agregarDatosDinamicos(
    historiaClinicaId: number,
    datos: Omit<DatoDinamico, 'id' | 'historia_clinica_id'>[]
  ): Promise<void> {

    if (!datos.length) return;

    const payload = datos.map(d => ({
      historia_clinica_id: historiaClinicaId,
      clave: d.clave,
      valor: d.valor
    }));

    const { error } = await supabase
      .from('historia_clinica_datos')
      .insert(payload);

    if (error) throw error;
  }

  async obtenerPorId(id: number): Promise<HistoriaClinica | null> {
    const { data: historia, error } = await supabase
      .from('historia_clinica')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !historia) return null;

    const { data: dinamicos } = await supabase
      .from('historia_clinica_datos')
      .select('*')
      .eq('historia_clinica_id', id);

    return { ...historia, datos_dinamicos: dinamicos ?? [] };
  }

  async obtenerHistoriaClinicaPorTurno(turnoId: number): Promise<any> {
    const { data: historia, error } = await supabase
      .from('historia_clinica')
      .select(`
        *,
        datos_dinamicos:historia_clinica_datos(*)
      `)
      .eq('turno_id', turnoId)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) return null;

    return historia;
  }

  async obtenerPorPaciente(usuarioId: number): Promise<any[]> {
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('usuario_id', usuarioId)
      .single();

    if (!paciente) return [];

    const { data: historias } = await supabase
      .from('historia_clinica')
      .select(`
        *,
        turnos!inner (
          id,
          fecha_turno,
          hora_inicio,
          especialista_id,
          especialidad_id,
          especialidades!inner ( nombre ),
          especialistas!inner ( id, nombre, apellido )
        )
      `)
      .eq('paciente_id', paciente.id)
      .order('fecha_creacion', { ascending: false });

    if (!historias) return [];

    const completas = await Promise.all(
      historias.map(async h => {
        const { data: dinamicos } = await supabase
          .from('historia_clinica_datos')
          .select('*')
          .eq('historia_clinica_id', h.id);

        return {
          id: h.id,
          altura: h.altura,
          peso: h.peso,
          temperatura: h.temperatura,
          presion: h.presion,
          fecha_creacion: h.fecha_creacion,
          datos_dinamicos: dinamicos || [],
          turno: {
            id: h.turnos.id,
            fecha_turno: h.turnos.fecha_turno,
            hora_inicio: h.turnos.hora_inicio,
            especialista: {
              id: h.turnos.especialistas.id,
              nombre: h.turnos.especialistas.nombre,
              apellido: h.turnos.especialistas.apellido
            },
            especialidad: {
              nombre: h.turnos.especialidades.nombre
            }
          }
        };
      })
    );

    return completas;
  }

  async buscarEnHistoriaClinica(termino: string): Promise<number[]> {
    const t = termino.toLowerCase().trim();
    if (!t) return [];

    const ids = new Set<number>();

    const { data: fijos } = await supabase
      .from('historia_clinica')
      .select('paciente_id')
      .or(`
        altura.ilike.%${t}%,
        peso.ilike.%${t}%,
        temperatura.ilike.%${t}%,
        presion.ilike.%${t}%
      `);

    fijos?.forEach(f => ids.add(f.paciente_id));

    const { data: dinamicos } = await supabase
      .from('historia_clinica_datos')
      .select('historia_clinica_id')
      .or(`clave.ilike.%${t}%,valor.ilike.%${t}%`);

    if (dinamicos?.length) {
      const { data: historias } = await supabase
        .from('historia_clinica')
        .select('paciente_id')
        .in('id', dinamicos.map(d => d.historia_clinica_id));

      historias?.forEach(h => ids.add(h.paciente_id));
    }

    return [...ids];
  }

  async turnoTieneHistoriaClinicaCoincidente(turnoId: number, termino: string): Promise<boolean> {
    const h = await this.obtenerHistoriaClinicaPorTurno(turnoId);
    if (!h) return false;

    const t = termino.toLowerCase();

    const fijos = [
      h.altura?.toString() || '',
      h.peso?.toString() || '',
      h.temperatura?.toString() || '',
      h.presion?.toString() || ''
    ];

    if (fijos.some(v => v.toLowerCase().includes(t))) return true;

    return h.datos_dinamicos?.some((d: any) =>
      d.clave.toLowerCase().includes(t) ||
      d.valor.toLowerCase().includes(t)
    ) || false;
  }

  async obtenerPacientesPorEspecialista(especialistaId: number): Promise<any[]> {
    const { data } = await supabase
      .from('historia_clinica')
      .select(`
        paciente_id,
        pacientes (
          id,
          nombre,
          apellido,
          dni,
          usuario_id
        )
      `)
      .eq('especialista_id', especialistaId);

    const map = new Map<number, any>();

    data?.forEach(columna => {
      if (columna.pacientes && !map.has(columna.paciente_id)) {
        map.set(columna.paciente_id, columna.pacientes);
      }
    });

    return [...map.values()];
  }
}
