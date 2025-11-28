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
// En historia-clinica.service.ts - AGREGAR ESTE MÉTODO PARA DEBUG
async debugHistoriaClinicaEstructura(usuarioId: number): Promise<void> {
  console.log('🔍 === DEBUG COMPLETO DE HISTORIA CLÍNICA ===');
  
  // 1. Obtener paciente
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', usuarioId)
    .single();
  
  console.log('👤 Paciente:', paciente);

  if (paciente) {
    // 2. Ver historias sin joins
    const { data: historiasSimples } = await supabase
      .from('historia_clinica')
      .select('*')
      .eq('paciente_id', paciente.id);
    
    console.log('📋 Historias simples:', historiasSimples);

    // 3. Ver turnos relacionados
    if (historiasSimples && historiasSimples.length > 0) {
      const turnoIds = historiasSimples.map(h => h.turno_id);
      const { data: turnos } = await supabase
        .from('turnos')
        .select('*')
        .in('id', turnoIds);
      
      console.log('📅 Turnos relacionados:', turnos);
    }
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
// En historia-clinica.service.ts - MÉTODO CORREGIDO
async obtenerHistoriaClinicaDePaciente(usuarioId: number): Promise<any[]> {
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

    console.log('✅ Paciente encontrado - ID real:', paciente.id);

    // SEGUNDO: Buscar historias clínicas con joins CORREGIDOS
    const { data: historias, error: errorHistorias } = await supabase
      .from('historia_clinica')
      .select(`
        *,
        turnos!inner (
          id,
          fecha_turno,
          hora_inicio,
          especialista_id,
          especialidad_id,
          especialidades!inner (
            nombre
          ),
          especialistas!inner (
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
      console.error('Detalles del error:', errorHistorias.details);
      return [];
    }

    console.log('✅ Historias encontradas:', historias);

    // TERCERO: Cargar datos dinámicos y normalizar estructura
    const historiasCompletas = await Promise.all(
      (historias || []).map(async (historia) => {
        const { data: datosDinamicos } = await supabase
          .from('historia_clinica_datos')
          .select('*')
          .eq('historia_clinica_id', historia.id);

        // Normalizar la estructura para que sea más fácil de usar
        return {
          id: historia.id,
          altura: historia.altura,
          peso: historia.peso,
          temperatura: historia.temperatura,
          presion: historia.presion,
          fecha_creacion: historia.fecha_creacion,
          datos_dinamicos: datosDinamicos || [],
          turno: {
            id: historia.turnos.id,
            fecha_turno: historia.turnos.fecha_turno,
            hora_inicio: historia.turnos.hora_inicio,
            especialista: {
              id: historia.turnos.especialistas.id,
              nombre: historia.turnos.especialistas.nombre,
              apellido: historia.turnos.especialistas.apellido
            },
            especialidad: {
              nombre: historia.turnos.especialidades.nombre
            }
          }
        };
      })
    );

    console.log('✅ Historias completas normalizadas:', historiasCompletas);
    return historiasCompletas;

  } catch (err) {
    console.error('❌ Error general:', err);
    return [];
  }
}

// En historia-clinica.service.ts - AGREGAR ESTE MÉTODO


async buscarPacientesPorHistoriaClinica(termino: string): Promise<number[]> {
    const terminoLower = termino.toLowerCase().trim();
    if (!terminoLower) return [];

    try {
      // Buscar en datos fijos de historia clínica
      const { data: fijos, error: errorFijos } = await supabase
        .from('historia_clinica')
        .select('paciente_id')
        .or(`altura.ilike.%${terminoLower}%,peso.ilike.%${terminoLower}%,temperatura.ilike.%${terminoLower}%,presion.ilike.%${terminoLower}%`);

      if (errorFijos) {
        console.error('Error buscando en datos fijos:', errorFijos);
      }

      // Buscar en datos dinámicos
      const { data: dinamicos, error: errorDinamicos } = await supabase
        .from('historia_clinica_datos')
        .select('historia_clinica_id')
        .or(`clave.ilike.%${terminoLower}%,valor.ilike.%${terminoLower}%`);

      if (errorDinamicos) {
        console.error('Error buscando en datos dinámicos:', errorDinamicos);
      }

      const idsPacientes = new Set<number>();

      // Agregar IDs de pacientes de datos fijos
      fijos?.forEach(f => idsPacientes.add(f.paciente_id));

      // Agregar IDs de pacientes de datos dinámicos
      if (dinamicos?.length) {
        const historiaClinicaIds = dinamicos.map(d => d.historia_clinica_id);
        const { data: historias } = await supabase
          .from('historia_clinica')
          .select('paciente_id')
          .in('id', historiaClinicaIds);

        historias?.forEach(h => idsPacientes.add(h.paciente_id));
      }

      return Array.from(idsPacientes);
    } catch (error) {
      console.error('Error en búsqueda de historia clínica:', error);
      return [];
    }
  }

  // Verificar si un turno tiene datos en historia clínica que coincidan con el término
  async turnoTieneHistoriaClinicaCoincidente(turnoId: number, termino: string): Promise<boolean> {
    const terminoLower = termino.toLowerCase().trim();
    if (!terminoLower) return false;

    try {
      // Obtener historia clínica del turno
      const historia = await this.obtenerHistoriaClinicaPorTurno(turnoId);
      
      if (!historia) return false;

      // Buscar en datos fijos
      const datosFijos = [
        historia.altura?.toString() || '',
        historia.peso?.toString() || '',
        historia.temperatura?.toString() || '',
        historia.presion?.toString() || ''
      ];

      const coincideFijos = datosFijos.some(dato => 
        dato.toLowerCase().includes(terminoLower)
      );

      if (coincideFijos) return true;

      // Buscar en datos dinámicos
      const coincideDinamicos = historia.datos_dinamicos?.some((dato: any) => 
        dato.clave?.toLowerCase().includes(terminoLower) || 
        dato.valor?.toLowerCase().includes(terminoLower)
      );

      return coincideDinamicos || false;
    } catch (error) {
      console.error('Error verificando historia clínica del turno:', error);
      return false;
    }
  }

  // En historia-clinica.service.ts - EL MÉTODO YA EXISTE

 
async obtenerHistoriaClinicaPorTurno(turnoId: number): Promise<any> {
  try {
    console.log('🔍 [SERVICE] Buscando historia clínica para turno ID:', turnoId);
    
    const { data: historia, error } = await supabase
      .from('historia_clinica')
      .select(`
        *,
        datos_dinamicos:historia_clinica_datos(*)
      `)
      .eq('turno_id', turnoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️ [SERVICE] No se encontró historia clínica para el turno:', turnoId);
        return null;
      }
      console.error('❌ [SERVICE] Error obteniendo historia clínica:', error);
      return null;
    }

    console.log('✅ [SERVICE] Historia clínica encontrada:', {
      id: historia.id,
      turno_id: historia.turno_id,
      tieneDatosFijos: !!(historia.altura || historia.peso || historia.temperatura || historia.presion),
      cantidadDatosDinamicos: historia.datos_dinamicos?.length || 0
    });

    return historia;

  } catch (err) {
    console.error('❌ [SERVICE] Error en obtenerHistoriaClinicaPorTurno:', err);
    return null;
  }
}
}