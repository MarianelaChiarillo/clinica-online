import { Injectable } from '@angular/core';
import supabase from '../supabase.client';
import { HistoriaClinica, DatoDinamico } from '../../models/historia-clinica';

@Injectable({
  providedIn: 'root'
})
export class HistoriaClinicaService {

  // ============================================
  // 📝 CREAR HISTORIA CLÍNICA BÁSICA
  // ============================================
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

    if (error) {
      console.error('❌ Error creando historia clínica:', error);
      throw error;
    }

    return { ...data, datos_dinamicos: [] } as HistoriaClinica;
  }

  // ============================================
  // 📝 CREAR HISTORIA CLÍNICA COMPLETA
  // ============================================
  async crearHistoriaClinicaCompleta(
    historiaBase: Omit<HistoriaClinica, 'id' | 'fecha_creacion' | 'datos_dinamicos'>,
    datosDinamicos: DatoDinamico[]
  ): Promise<HistoriaClinica> {

    console.log('📤 Creando historia clínica completa con datos:', {
      historiaBase,
      datosDinamicos
    });

    // Validar máximo de datos dinámicos
    if (datosDinamicos.length > 3) {
      throw new Error('Máximo 3 datos dinámicos permitidos');
    }

    // Crear historia básica
    const historia = await this.crearHistoriaClinica(historiaBase);

    // Agregar datos dinámicos si existen
    if (datosDinamicos.length > 0) {
      await this.agregarDatosDinamicos(historia.id, datosDinamicos);
    }

    // Obtener historia completa
    const historiaCompleta = await this.obtenerPorId(historia.id);
    
    if (!historiaCompleta) {
      throw new Error('No se pudo obtener la historia clínica creada');
    }

    console.log('✅ Historia clínica creada exitosamente:', historiaCompleta);
    return historiaCompleta;
  }

  // ============================================
  // 📝 AGREGAR DATOS DINÁMICOS
  // ============================================
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
      // Determinar valor_texto según el tipo de control
      let valor_texto = '';
      
      switch (dato.tipo_control) {
        case 'texto':
          valor_texto = dato.valor_texto || '';
          break;
        case 'rango':
          valor_texto = dato.valor_rango !== undefined ? `${dato.valor_rango}%` : '';
          break;
        case 'numerico':
          valor_texto = dato.valor_numerico?.toString() || '';
          break;
        case 'switch':
          valor_texto = dato.valor_switch ? 'Sí' : 'No';
          break;
        default:
          valor_texto = dato.valor_texto || '';
      }
      
      return {
        historia_clinica_id: historiaClinicaId,
        clave: dato.clave,
        tipo_control: dato.tipo_control || 'texto',
        valor_texto: valor_texto,
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

  // ============================================
  // 📝 OBTENER POR ID
  // ============================================
  async obtenerPorId(id: number): Promise<HistoriaClinica | null> {
    try {
      const { data: historia, error } = await supabase
        .from('historia_clinica')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`📭 No se encontró historia clínica con ID: ${id}`);
          return null;
        }
        console.error('❌ Error obteniendo historia clínica:', error);
        throw error;
      }

      if (!historia) {
        return null;
      }

      // Obtener datos dinámicos asociados
      const { data: dinamicos } = await supabase
        .from('historia_clinica_datos')
        .select('*')
        .eq('historia_clinica_id', id)
        .order('id', { ascending: true });

      // Agregar valor para mostrar
      const datosConValor = (dinamicos || []).map((d: any) => ({
        ...d,
        valor_mostrar: this.obtenerValorParaMostrar(d)
      }));

      return { 
        ...historia, 
        datos_dinamicos: datosConValor 
      } as HistoriaClinica;

    } catch (error) {
      console.error('❌ Error en obtenerPorId:', error);
      return null;
    }
  }

  // ============================================
  // 📝 OBTENER HISTORIA POR TURNO
  // ============================================
  async obtenerHistoriaClinicaPorTurno(turnoId: number): Promise<any> {
    try {
      const { data: historia, error } = await supabase
        .from('historia_clinica')
        .select(`
          *,
          datos_dinamicos:historia_clinica_datos(*)
        `)
        .eq('turno_id', turnoId)
        .single();

      if (error?.code === 'PGRST116') {
        // No se encontró historia para este turno
        return null;
      }

      if (error) {
        console.error('❌ Error obteniendo historia por turno:', error);
        return null;
      }

      if (!historia) {
        return null;
      }

      // Agregar valor_mostrar a cada dato dinámico
      if (historia.datos_dinamicos && Array.isArray(historia.datos_dinamicos)) {
        historia.datos_dinamicos = historia.datos_dinamicos.map((d: any) => ({
          ...d,
          valor_mostrar: this.obtenerValorParaMostrar(d)
        }));
      }

      return historia;

    } catch (error) {
      console.error('❌ Error en obtenerHistoriaClinicaPorTurno:', error);
      return null;
    }
  }

  // ============================================
  // 📝 OBTENER HISTORIAS POR PACIENTE
  // ============================================
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

  // ============================================
  // 🔍 BUSCAR EN HISTORIA CLÍNICA
  // ============================================
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

      // Buscar en datos dinámicos
      const { data: dinamicos, error: errorDinamicos } = await supabase
        .from('historia_clinica_datos')
        .select('historia_clinica_id')
        .or(`clave.ilike.%${t}%, valor_texto.ilike.%${t}%`);

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
  // 🔍 VERIFICAR COINCIDENCIA EN TURNO
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

      // Verificar en datos dinámicos
      if (historia.datos_dinamicos && Array.isArray(historia.datos_dinamicos)) {
        return historia.datos_dinamicos.some((d: any) =>
          (d.clave && d.clave.toLowerCase().includes(t)) ||
          (d.valor_texto && d.valor_texto.toLowerCase().includes(t))
        );
      }

      return false;

    } catch (error) {
      console.error('❌ Error verificando coincidencia en turno:', error);
      return false;
    }
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

  // ============================================
  // 🔄 ACTUALIZAR HISTORIA CLÍNICA
  // ============================================
  async actualizarHistoriaClinica(
    id: number, 
    datosActualizados: Partial<Omit<HistoriaClinica, 'id' | 'fecha_creacion' | 'turno_id' | 'paciente_id' | 'especialista_id' | 'especialidad_id'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('historia_clinica')
        .update(datosActualizados)
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando historia clínica:', error);
        return false;
      }

      console.log(`✅ Historia clínica ${id} actualizada exitosamente`);
      return true;

    } catch (error) {
      console.error('❌ Error en actualizarHistoriaClinica:', error);
      return false;
    }
  }

  // ============================================
  // 🗑️ ELIMINAR HISTORIA CLÍNICA
  // ============================================
  async eliminarHistoriaClinica(id: number): Promise<boolean> {
    try {
      // Primero eliminar datos dinámicos relacionados
      const { error: errorDinamicos } = await supabase
        .from('historia_clinica_datos')
        .delete()
        .eq('historia_clinica_id', id);

      if (errorDinamicos) {
        console.error('❌ Error eliminando datos dinámicos:', errorDinamicos);
      }

      // Luego eliminar la historia clínica
      const { error } = await supabase
        .from('historia_clinica')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando historia clínica:', error);
        return false;
      }

      console.log(`🗑️ Historia clínica ${id} eliminada exitosamente`);
      return true;

    } catch (error) {
      console.error('❌ Error en eliminarHistoriaClinica:', error);
      return false;
    }
  }

  // ============================================
  // 🛠️ MÉTODOS AUXILIARES
  // ============================================

  private obtenerValorParaMostrar(dato: any): string {
    if (!dato) return '';

    switch (dato.tipo_control) {
      case 'rango':
        return dato.valor_rango !== null && dato.valor_rango !== undefined 
          ? `${dato.valor_rango}%` 
          : '';
      case 'numerico':
        return dato.valor_numerico?.toString() || '';
      case 'switch':
        return dato.valor_switch !== null && dato.valor_switch !== undefined
          ? (dato.valor_switch ? 'Sí' : 'No')
          : '';
      default:
        return dato.valor_texto || '';
    }
  }

  // ============================================
  // 📊 ESTADÍSTICAS
  // ============================================
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
}