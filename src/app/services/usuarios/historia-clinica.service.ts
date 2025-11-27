import { Injectable } from '@angular/core';
import supabase from '../supabase.client';
import { HistoriaClinica, DatoDinamico } from '../../models/historia-clinica';

@Injectable({
  providedIn: 'root'
})
export class HistoriaClinicaService {

  // ============================================================
  // CREAR HISTORIA CLÍNICA BASE
  // ============================================================
  async crearHistoriaClinica(
    historia: Omit<HistoriaClinica, 'id' | 'fecha_creacion' | 'datos_dinamicos'>
  ): Promise<HistoriaClinica> {

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
        presion: historia.presion,
      }])
      .select()
      .single();

    if (error) throw error;

    return { ...data, datos_dinamicos: [] } as HistoriaClinica;
  }

  // ============================================================
  // CREAR HISTORIA CLÍNICA COMPLETA (con datos dinámicos)
  // ============================================================
  async crearHistoriaClinicaCompleta(
    historiaBase: Omit<HistoriaClinica, 'id' | 'fecha_creacion' | 'datos_dinamicos'>,
    datosDinamicos: Omit<DatoDinamico, 'id' | 'historia_clinica_id'>[]
  ): Promise<HistoriaClinica> {

    if (datosDinamicos.length > 3) {
      throw new Error('Máximo 3 datos dinámicos permitidos');
    }

    const historia = await this.crearHistoriaClinica(historiaBase);

    if (datosDinamicos.length > 0) {
      await this.agregarDatosDinamicos(historia.id, datosDinamicos);
    }

    const completa = await this.obtenerPorId(historia.id);

    if (!completa) {
      throw new Error('No se pudo obtener la historia clínica creada');
    }

    return completa;
  }

  // ============================================================
  // AGREGAR DATOS DINÁMICOS
  // ============================================================
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

  // ============================================================
  // OBTENER HISTORIA POR ID
  // ============================================================
  async obtenerPorId(id: number): Promise<HistoriaClinica | null> {
    const { data: historia, error } = await supabase
      .from('historia_clinica')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;

    const { data: datosDinamicos } = await supabase
      .from('historia_clinica_datos')
      .select('*')
      .eq('historia_clinica_id', id);

    return {
      ...historia,
      datos_dinamicos: datosDinamicos ?? []
    };
  }

  


  // ============================================================
  // BUSCADOR AVANZADO
  // ============================================================
  async buscarEnHistoriaClinica(termino: string): Promise<number[]> {
    const { data: fijos } = await supabase
      .from('historia_clinica')
      .select('paciente_id')
      .or(`
        altura.ilike.%${termino}%,
        peso.ilike.%${termino}%,
        temperatura.ilike.%${termino}%,
        presion.ilike.%${termino}%
      `);

    const { data: dinamicos } = await supabase
      .from('historia_clinica_datos')
      .select('historia_clinica_id')
      .or(`
        clave.ilike.%${termino}%,
        valor.ilike.%${termino}%
      `);

    const ids = new Set<number>();

    fijos?.forEach(f => ids.add(f.paciente_id));

    if (dinamicos?.length) {
      const { data: pacientes } = await supabase
        .from('historia_clinica')
        .select('paciente_id')
        .in('id', dinamicos.map(d => d.historia_clinica_id));

      pacientes?.forEach(p => ids.add(p.paciente_id));
    }

    return [...ids];
  }

  // ============================================================
  // PACIENTES ATENDIDOS POR ESPECIALISTA
  // ============================================================
  async obtenerPacientesPorEspecialista(especialistaId: number): Promise<any[]> {
    const { data, error } = await supabase
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

    if (error) {
      console.error('Error obteniendo pacientes por especialista:', error);
      return [];
    }

    const map = new Map<number, any>();

    data.forEach(row => {
      if (row.pacientes && !map.has(row.paciente_id)) {
        map.set(row.paciente_id, row.pacientes);
      }
    });

    return [...map.values()];
  }


  // En historia-clinica.service.ts - AGREGAR método de debug
async debugEstructuraHistoriasClinicas(): Promise<void> {
  console.log('🔍 === DEBUG ESTRUCTURA HISTORIAS CLÍNICAS ===');
  
  // Ver algunas historias existentes
  const { data: historias, error } = await supabase
    .from('historia_clinica')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error obteniendo historias clínicas:', error);
    return;
  }

  console.log('📋 HISTORIAS CLÍNICAS EXISTENTES:', historias);
  
  // Ver relación con pacientes
  if (historias && historias.length > 0) {
    const pacienteIds = [...new Set(historias.map(h => h.paciente_id))];
    console.log('👤 IDs de Pacientes en historias:', pacienteIds);
    
    const { data: pacientes } = await supabase
      .from('pacientes')
      .select('id, nombre, usuario_id')
      .in('id', pacienteIds);

    console.log('📊 PACIENTES RELACIONADOS:', pacientes);
  }
}


// En historia-clinica.service.ts - CORREGIR obtenerPorPaciente
async obtenerPorPaciente(usuarioId: number): Promise<any[]> {
  console.log('🔍 Buscando historias clínicas para usuario ID:', usuarioId);
  
  try {
    // PRIMERO: Obtener el ID real del paciente
    const { data: paciente, error: errorPaciente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('usuario_id', usuarioId)
      .single();

    if (errorPaciente || !paciente) {
      console.error('❌ No se encontró paciente para usuario ID:', usuarioId, errorPaciente);
      return [];
    }

    console.log('✅ Paciente encontrado para historias - ID real:', paciente.id);

    // SEGUNDO: Buscar historias clínicas usando el ID real del paciente
    const { data: historias, error } = await supabase
      .from('historia_clinica')
      .select(`
        *,
        turno:turnos (
          fecha_turno,
          hora_inicio,
          hora_fin,
          especialista:especialistas (id, nombre, apellido),
          especialidad:especialidades (nombre)
        )
      `)
      .eq('paciente_id', paciente.id)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error obteniendo historia clínica por paciente:', error);
      return [];
    }

    console.log('✅ Historias clínicas encontradas:', historias?.length || 0);

    // Cargar datos dinámicos para cada historia
    const completas = await Promise.all(
      (historias || []).map(async (h) => {
        const { data: datosDinamicos } = await supabase
          .from('historia_clinica_datos')
          .select('*')
          .eq('historia_clinica_id', h.id);

        return {
          ...h,
          datos_dinamicos: datosDinamicos ?? []
        };
      })
    );

    console.log('✅ Historias completas con datos dinámicos:', completas.length);
    return completas;

  } catch (err) {
    console.error('Error obteniendo historia clínica por paciente:', err);
    return [];
  }
}

// En historia-clinica.service.ts - CORREGIR COMPLETAMENTE
async obtenerHistoriaClinicaDePaciente(usuarioId: number): Promise<any[]> {
  console.log('🔍 Buscando historias clínicas para usuario ID:', usuarioId);
  
  try {
    // PRIMERO: Obtener el ID real del paciente desde la tabla pacientes
    const { data: paciente, error: errorPaciente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('usuario_id', usuarioId)
      .single();

    if (errorPaciente || !paciente) {
      console.error('❌ No se encontró paciente para usuario ID:', usuarioId, errorPaciente);
      return [];
    }

    console.log('✅ Paciente encontrado - ID real:', paciente.id);

    // SEGUNDO: Buscar historias clínicas usando el ID real del paciente
    const { data: historias, error: errorHistorias } = await supabase
      .from('historia_clinica')
      .select(`
        *,
        turnos (
          id,
          fecha_turno,
          especialista_id,
          especialidades (nombre),
          especialistas (
            id,
            nombre,
            apellido
          )
        )
      `)
      .eq('paciente_id', paciente.id)
      .order('fecha_creacion', { ascending: false });

    if (errorHistorias) {
      console.error('❌ Error obteniendo historias:', errorHistorias);
      return [];
    }

    console.log('✅ Historias encontradas:', historias);

    // TERCERO: Cargar datos dinámicos para cada historia
    const historiasCompletas = await Promise.all(
      (historias || []).map(async (historia) => {
        const { data: datosDinamicos } = await supabase
          .from('historia_clinica_datos')
          .select('*')
          .eq('historia_clinica_id', historia.id);

        return {
          ...historia,
          datos_dinamicos: datosDinamicos || [],
          turno: historia.turnos?.[0] || null // Normalizar estructura
        };
      })
    );

    console.log('✅ Historias completas:', historiasCompletas);
    return historiasCompletas;

  } catch (err) {
    console.error('❌ Error general:', err);
    return [];
  }
}
}
