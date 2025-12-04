import { Injectable } from '@angular/core';
import supabase from '../supabase.client';
import { HistoriaClinica, DatoDinamico } from '../../models/historia-clinica';

@Injectable({
  providedIn: 'root'
})
export class HistoriaClinicaService {



  async obtenerPorPaciente(usuarioId: number): Promise<any[]> {
    try {
      // Primero obtener el paciente por usuario_id
      const { data: paciente, error: errorPaciente } = await supabase
        .from('pacientes')
        .select('id')
        .eq('usuario_id', usuarioId)
        .single();

      if (errorPaciente || !paciente) {
        console.log('📭 No se encontró paciente para el usuario:', usuarioId);
        return [];
      }

      // Obtener historias clínicas del paciente
      const { data: historias, error: errorHistorias } = await supabase
        .from('historia_clinica')
        .select(`
          *,
          turnos (
            id,
            fecha_turno,
            hora_inicio,
            especialista_id,
            especialidad_id,
            especialidades ( nombre ),
            especialistas ( id, nombre, apellido )
          )
        `)
        .eq('paciente_id', paciente.id)
        .order('fecha_creacion', { ascending: false });

      if (errorHistorias) {
        console.error('❌ Error obteniendo historias del paciente:', errorHistorias);
        return [];
      }

      if (!historias || historias.length === 0) {
        return [];
      }

      // Para cada historia, obtener sus datos dinámicos
      const historiasCompletas = await Promise.all(
        historias.map(async (h: any) => {
          const { data: dinamicos } = await supabase
            .from('historia_clinica_datos')
            .select('*')
            .eq('historia_clinica_id', h.id);

          // Agregar valor_mostrar a cada dato dinámico
          const datosConValor = (dinamicos || []).map((d: any) => ({
            ...d,
            valor_mostrar: this.obtenerValorParaMostrar(d)
          }));

          return {
            id: h.id,
            altura: h.altura,
            peso: h.peso,
            temperatura: h.temperatura,
            presion: h.presion,
            fecha_creacion: h.fecha_creacion,
            datos_dinamicos: datosConValor,
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

      return historiasCompletas;

    } catch (error) {
      console.error('❌ Error en obtenerPorPaciente:', error);
      return [];
    }
  }


  async obtenerHistoriaClinicaPorTurno(turnoId: number): Promise<HistoriaClinica | null> {
  const { data: historia, error } = await supabase
    .from('historia_clinica')
    .select('*, historia_clinica_datos(*)')
    .eq('turno_id', turnoId)
    .maybeSingle();

  if (error) {
    console.error('Error obteniendo historia:', error);
    return null;
  }

  if (!historia) return null;

  historia.datos_dinamicos = (historia.historia_clinica_datos || []).map((d: any) => ({
    ...d,
    valor_mostrar: this.obtenerValorParaMostrar(d)
  }));

  delete historia.historia_clinica_datos;
  return historia;
}

  
  // ============================================
  // 👥 OBTENER PACIENTES POR ESPECIALISTA
  // ============================================
  async obtenerPacientesPorEspecialista(especialistaId: number): Promise<any[]> {
    try {
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
        console.error('❌ Error obteniendo pacientes por especialista:', error);
        return [];
      }

      const map = new Map<number, any>();

      data?.forEach(columna => {
        if (columna.pacientes && !map.has(columna.paciente_id)) {
          map.set(columna.paciente_id, columna.pacientes);
        }
      });

      const pacientes = Array.from(map.values());
      console.log(`👥 Pacientes encontrados para especialista ${especialistaId}: ${pacientes.length}`);
      return pacientes;

    } catch (error) {
      console.error('❌ Error en obtenerPacientesPorEspecialista:', error);
      return [];
    }
  }


  // -------------------------------
  // 📝 Crear historia clínica básica
  // -------------------------------
  async crearHistoriaClinica(historia: Omit<HistoriaClinica, 'id' | 'fecha_creacion' | 'datos_dinamicos'>) {
    const { data, error } = await supabase
      .from('historia_clinica')
      .insert([historia])
      .select()
      .maybeSingle();

    if (error) throw error;
    return { ...data, datos_dinamicos: [] } as HistoriaClinica;
  }

async crearHistoriaClinicaCompleta(
  historiaBase: Omit<HistoriaClinica, 'id' | 'fecha_creacion' | 'datos_dinamicos'>,
  datosDinamicos: DatoDinamico[]
) {
  // Verificar si ya existe historia para el turno
  const existente = await this.obtenerHistoriaClinicaPorTurno(historiaBase.turno_id);
  if (existente) {
    console.warn('Historia clínica ya existe para este turno:', historiaBase.turno_id);
    return existente; // Devuelve la existente, no crea nueva
  }

  // 1️⃣ Crear base
  const historia = await this.crearHistoriaClinica(historiaBase);

  // 2️⃣ Insertar datos dinámicos
  if (datosDinamicos.length) {
    const payload = datosDinamicos.map(d => ({
      historia_clinica_id: historia.id,
      clave: d.clave,
      tipo_control: d.tipo_control || 'texto',
      valor: this.getValorParaInsert(d),
      valor_rango: d.valor_rango,
      valor_numerico: d.valor_numerico,
      valor_switch: d.valor_switch
    }));

    const { error } = await supabase.from('historia_clinica_datos').insert(payload);
    if (error) throw error;
  }

  return this.obtenerPorId(historia.id);
}


  // -------------------------------
  // 📝 Obtener por ID
  // -------------------------------
  async obtenerPorId(id: number): Promise<HistoriaClinica | null> {
    const { data: historia } = await supabase
      .from('historia_clinica')
      .select('*, historia_clinica_datos(*)')
      .eq('id', id)
      .maybeSingle();

    if (!historia) return null;

    const datos = (historia.historia_clinica_datos || []).map((d: any) => ({
      ...d,
      valor_mostrar: this.obtenerValorParaMostrar(d)
    }));

    return { ...historia, datos_dinamicos: datos };
  }

  // -------------------------------
  // 🛠 Métodos auxiliares
  // -------------------------------
  private getValorParaInsert(d: DatoDinamico) {
    switch (d.tipo_control) {
      case 'texto': return d.valor || '';
      case 'rango': return d.valor_rango?.toString() || '';
      case 'numerico': return d.valor_numerico?.toString() || '';
      case 'switch': return d.valor_switch ? 'Sí' : 'No';
      default: return d.valor || '';
    }
  }

  private obtenerValorParaMostrar(dato: any): string {
    if (!dato) return '';
    switch (dato.tipo_control) {
      case 'rango': return dato.valor_rango != null ? `${dato.valor_rango}%` : dato.valor || '';
      case 'numerico': return dato.valor_numerico != null ? dato.valor_numerico.toString() : dato.valor || '';
      case 'switch': return dato.valor_switch != null ? (dato.valor_switch ? 'Sí' : 'No') : dato.valor || '';
      default: return dato.valor || '';
    }
  }



    async obtenerEstadisticasPorEspecialista(especialistaId: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('historia_clinica')
        .select(`
          count,
          pacientes:patient_id(count)
        `)
        .eq('especialista_id', especialistaId);

      if (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return { totalHistorias: 0, totalPacientes: 0 };
      }

      return {
        totalHistorias: data?.[0]?.count || 0,
        totalPacientes: 0 // Necesitarías una query más compleja para esto
      };

    } catch (error) {
      console.error('❌ Error en obtenerEstadisticasPorEspecialista:', error);
      return { totalHistorias: 0, totalPacientes: 0 };
    }
  }


  
async agregarDatosDinamicos(
  historiaClinicaId: number,
  datos: DatoDinamico[]
): Promise<void> {

  if (!datos.length) {
    console.log('📝 No hay datos dinámicos para agregar');
    return;
  }

  console.log('📤 Agregando datos dinámicos:', datos);

  const payload = datos.map(dato => {
    // Determinar valor según el tipo de control
    let valor = '';
    
    switch (dato.tipo_control) {
      case 'texto':
        valor = dato.valor || ''; // Si viene de formulario
        break;
      case 'rango':
        valor = dato.valor_rango !== undefined ? `${dato.valor_rango}%` : '';
        break;
      case 'numerico':
        valor = dato.valor_numerico?.toString() || '';
        break;
      case 'switch':
        valor = dato.valor_switch ? 'Sí' : 'No';
        break;
      default:
        valor = dato.valor || '';
    }
    
    return {
      historia_clinica_id: historiaClinicaId,
      clave: dato.clave,
      tipo_control: dato.tipo_control || 'texto',
      valor: valor,  // CAMBIADO: era valor_texto, ahora es valor
      valor_rango: dato.valor_rango,
      valor_numerico: dato.valor_numerico,
      valor_switch: dato.valor_switch
    };
  });

  const { error } = await supabase
    .from('historia_clinica_datos')
    .insert(payload);

  if (error) {
    console.error('❌ Error agregando datos dinámicos:', error);
    throw error;
  }

  console.log('✅ Datos dinámicos agregados exitosamente');
}


  


private async obtenerHistoriaClinicaPorTurnoSimple(turnoId: number): Promise<any> {
  try {
    console.log('🔍 Usando método simple para turno:', turnoId);
    
    const { data: historia, error } = await supabase
      .from('historia_clinica')
      .select('*')
      .eq('turno_id', turnoId)
      .single();

    if (error?.code === 'PGRST116') {
      return null;
    }

    if (error) {
      console.error('❌ Error método simple historia_clinica:', error);
      return null;
    }

    if (!historia) {
      return null;
    }

    // Obtener datos dinámicos por separado
    const { data: dinamicos, error: errorDinamicos } = await supabase
      .from('historia_clinica_datos')
      .select('*')
      .eq('historia_clinica_id', historia.id);

    if (errorDinamicos) {
      console.error('❌ Error método simple datos dinámicos:', errorDinamicos);
    }

    return {
      ...historia,
      datos_dinamicos: (dinamicos || []).map((d: any) => ({
        ...d,
        valor_mostrar: this.obtenerValorParaMostrar(d)
      }))
    };

  } catch (error) {
    console.error('❌ Error en método simple:', error);
    return null;
  }
}



async buscarEnHistoriaClinica(termino: string): Promise<number[]> {
  const t = termino.toLowerCase().trim();
  
  if (!t || t.length < 2) {
    return [];
  }

  console.log(`🔍 Buscando en historia clínica: "${t}"`);

  const idsPacientes = new Set<number>();

  try {
    // Buscar en campos fijos
    const { data: fijos, error: errorFijos } = await supabase
      .from('historia_clinica')
      .select('paciente_id')
      .or(`
        altura::text.ilike.%${t}%,
        peso::text.ilike.%${t}%,
        temperatura::text.ilike.%${t}%,
        presion.ilike.%${t}%
      `);

    if (!errorFijos && fijos) {
      fijos.forEach(f => idsPacientes.add(f.paciente_id));
    }

    // Buscar en datos dinámicos - CAMBIADO: usar "valor" en lugar de "valor_texto"
    const { data: dinamicos, error: errorDinamicos } = await supabase
      .from('historia_clinica_datos')
      .select('historia_clinica_id')
      .or(`clave.ilike.%${t}%, valor.ilike.%${t}%`);  // CAMBIADO

    if (!errorDinamicos && dinamicos?.length > 0) {
      // Obtener historias relacionadas con estos datos dinámicos
      const { data: historias } = await supabase
        .from('historia_clinica')
        .select('paciente_id')
        .in('id', dinamicos.map(d => d.historia_clinica_id));

      if (historias) {
        historias.forEach(h => idsPacientes.add(h.paciente_id));
      }
    }

    const resultado = Array.from(idsPacientes);
    console.log(`✅ Resultados encontrados: ${resultado.length} pacientes`);
    return resultado;

  } catch (error) {
    console.error('❌ Error en búsqueda de historia clínica:', error);
    return [];
  }
}

// ============================================
// 🔍 VERIFICAR COINCIDENCIA EN TURNO (CORREGIDO)
// ============================================
async turnoTieneHistoriaClinicaCoincidente(turnoId: number, termino: string): Promise<boolean> {
  try {
    const historia = await this.obtenerHistoriaClinicaPorTurno(turnoId);
    
    if (!historia) {
      return false;
    }

    const t = termino.toLowerCase().trim();

    // Verificar en campos fijos
    const fijos = [
      historia.altura?.toString() || '',
      historia.peso?.toString() || '',
      historia.temperatura?.toString() || '',
      historia.presion?.toString() || ''
    ];

    if (fijos.some(v => v.toLowerCase().includes(t))) {
      return true;
    }

    // Verificar en datos dinámicos - CAMBIADO: usar "valor" en lugar de "valor_texto"
    if (historia.datos_dinamicos && Array.isArray(historia.datos_dinamicos)) {
      return historia.datos_dinamicos.some((d: any) =>
        (d.clave && d.clave.toLowerCase().includes(t)) ||
        (d.valor && d.valor.toLowerCase().includes(t))  // CAMBIADO
      );
    }

    return false;

  } catch (error) {
    console.error('❌ Error verificando coincidencia en turno:', error);
    return false;
  }
}
  
}