// excel.service.ts
import { Injectable } from '@angular/core';
import { utils, writeFile } from 'xlsx';
import supabase from './supabase.client';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  constructor() { }

  // ============================================================
  // GENERAR EXCEL GENERAL DE USUARIOS
  // ============================================================
  generarExcelUsuariosGeneral(usuarios: any[]): void {
    try {
      console.log('📊 Generando Excel general para', usuarios.length, 'usuarios');
      
      const data = usuarios.map(usuario => this.formatearUsuarioParaExcel(usuario));
      this.generarArchivoExcel(data, 'usuarios_general');
      
    } catch (error) {
      console.error('Error generando Excel general:', error);
      throw new Error('No se pudo generar el Excel general');
    }
  }

  // ============================================================
  // GENERAR EXCEL DETALLADO DE TURNOS DE PACIENTE (CORREGIDO)
  // ============================================================
  
  // ============================================================
  // GENERAR EXCEL DE TURNOS POR ESPECIALISTA
  // ============================================================
  async generarExcelTurnosEspecialista(especialistaId: number, nombreEspecialista: string): Promise<void> {
    try {
      const turnos = await this.obtenerTurnosCompletosEspecialista(especialistaId);
      const data = this.formatearTurnosEspecialistaParaExcel(turnos, nombreEspecialista);
      
      this.generarArchivoExcel(data, `turnos_especialista_${nombreEspecialista}`);
    } catch (error) {
      console.error('Error generando Excel de especialista:', error);
      throw error;
    }
  }

  // ============================================================
  // MÉTODOS PRIVADOS - OBTENER DATOS (SOLO COMO FALLBACK)
  // ============================================================
  private async obtenerTurnosCompletosPaciente(pacienteId: number): Promise<any[]> {
    try {
      console.log('🔍 Consultando BD para paciente_id:', pacienteId);
      
      const { data: turnos, error } = await supabase
        .from('turnos')
        .select(`
          *,
          especialidades(nombre),
          especialistas(
            id,
            nombre,
            apellido,
            especialista_especialidad(
              especialidades(nombre)
            )
          ),
          pacientes(
            nombre,
            apellido,
            dni,
            obra_social
          )
        `)
        .eq('paciente_id', pacienteId)
        .order('fecha_turno', { ascending: false });

      if (error) {
        console.error('❌ Error en consulta Supabase:', error);
        return [];
      }

      console.log('✅ Turnos obtenidos de BD:', turnos?.length || 0);
      return turnos || [];
    } catch (error) {
      console.error('Error obteniendo turnos completos:', error);
      return [];
    }
  }

  private async obtenerTurnosCompletosEspecialista(especialistaId: number): Promise<any[]> {
    try {
      const { data: turnos, error } = await supabase
        .from('turnos')
        .select(`
          *,
          especialidades(nombre),
          pacientes(
            nombre,
            apellido,
            dni,
            obra_social,
            edad
          )
        `)
        .eq('especialista_id', especialistaId)
        .order('fecha_turno', { ascending: false });

      if (error) throw error;
      return turnos || [];
    } catch (error) {
      console.error('Error obteniendo turnos de especialista:', error);
      return [];
    }
  }

  // ============================================================
  // MÉTODOS PRIVADOS - FORMATEAR DATOS (MEJORADOS)
  // ============================================================
  private formatearUsuarioParaExcel(usuario: any): any {
    const turnosRealizados = usuario.turnos?.filter((t: any) => 
      t.estado === 'realizado' || t.estado === 'completado'
    ).length || 0;
    
    const totalTurnos = usuario.turnos?.length || 0;
    
    return {
      'Nombre': usuario.nombre || 'N/A',
      'Apellido': usuario.apellido || 'N/A',
      'DNI': usuario.dni || 'N/A',
      'Email': usuario.email || 'N/A',
      'Tipo Usuario': usuario.tipo_usuario || 'N/A',
      'Estado': usuario.estado || 'N/A',
      'Obra Social': usuario.obra_social || 'N/A',
      'Edad': usuario.edad || 'N/A',
      'Especialidades': Array.isArray(usuario.especialidades) 
        ? usuario.especialidades.join(', ') 
        : 'N/A',
      'Total Turnos': totalTurnos,
      'Turnos Realizados': turnosRealizados,
      'Porcentaje Realizados': totalTurnos > 0 
        ? `${Math.round((turnosRealizados / totalTurnos) * 100)}%`
        : '0%',
      'Historias Clínicas': usuario.historiasClinicas?.length || 0,
      'Fecha Registro': usuario.fecha_creacion ? 
        new Date(usuario.fecha_creacion).toLocaleDateString('es-AR') : 'N/A'
    };
  }

  private formatearTurnosParaExcel(usuario: any, turnos: any[]): any[] {
    console.log('🔄 Formateando turnos para Excel...', {
      usuario: usuario.nombre,
      turnosRecibidos: turnos?.length
    });

    // ✅ SI HAY TURNOS - Formatearlos correctamente
    if (turnos && turnos.length > 0) {
      console.log('📋 Procesando', turnos.length, 'turnos para Excel');
      
      return turnos.map((turno, index) => {
        console.log(`   Turno ${index + 1}:`, {
          fecha: turno.fecha_turno,
          estado: turno.estado,
          especialidad: turno.especialidades?.nombre || turno.especialidad_nombre
        });

        // Obtener especialidades del especialista de diferentes formas
        let especialidadesEspecialista = 'No especificadas';
        
        if (turno.especialistas?.especialista_especialidad) {
          especialidadesEspecialista = turno.especialistas.especialista_especialidad
            ?.map((ee: any) => ee.especialidades?.nombre)
            .filter(Boolean)
            .join(', ');
        } else if (turno.especialista_especialidades) {
          especialidadesEspecialista = turno.especialista_especialidades.join(', ');
        }

        // Formatear especialista
        let nombreEspecialista = 'N/A';
        if (turno.especialistas) {
          nombreEspecialista = `${turno.especialistas.nombre || ''} ${turno.especialistas.apellido || ''}`.trim();
        } else if (turno.especialista_nombre) {
          nombreEspecialista = `${turno.especialista_nombre} ${turno.especialista_apellido || ''}`.trim();
        }

        // Formatear especialidad
        let especialidadSolicitada = 'N/A';
        if (turno.especialidades?.nombre) {
          especialidadSolicitada = turno.especialidades.nombre;
        } else if (turno.especialidad_nombre) {
          especialidadSolicitada = turno.especialidad_nombre;
        } else if (turno.especialidad_id) {
          especialidadSolicitada = `Especialidad ${turno.especialidad_id}`;
        }

        return {
          'Nº': index + 1,
          'Paciente': `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
          'DNI Paciente': usuario.dni || 'N/A',
          'Email Paciente': usuario.email || 'N/A',
          'Obra Social': usuario.obra_social || 'No especificada',
          'Fecha Turno': turno.fecha_turno ? new Date(turno.fecha_turno).toLocaleDateString('es-AR') : 'N/A',
          'Hora Inicio': turno.hora_inicio || 'N/A',
          'Hora Fin': turno.hora_fin || 'N/A',
          'Especialidad Solicitada': especialidadSolicitada,
          'Especialista': nombreEspecialista,
        };
      });
    } 
    // ✅ SI NO HAY TURNOS - Mensaje informativo
    else {
      console.warn('⚠️ No hay turnos para formatear, generando mensaje informativo');
      return [{
        'Paciente': `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
        'DNI': usuario.dni || 'N/A',
        'Email': usuario.email || 'N/A',
        'Mensaje': 'No hay turnos registrados para este paciente',
        'Nota': 'Los turnos pueden no haberse cargado correctamente o el paciente no tiene turnos asignados'
      }];
    }
  }

  private formatearTurnosEspecialistaParaExcel(turnos: any[], nombreEspecialista: string): any[] {
    if (!turnos || turnos.length === 0) {
      return [{
        'Especialista': nombreEspecialista,
        'Mensaje': 'No hay turnos registrados para este especialista'
      }];
    }

    return turnos.map((turno, index) => {
      return {
        'Nº': index + 1,
        'Especialista': nombreEspecialista,
        'Paciente': turno.pacientes ? 
          `${turno.pacientes.nombre} ${turno.pacientes.apellido}` : 'N/A',
        'DNI Paciente': turno.pacientes?.dni || 'N/A',
        'Obra Social': turno.pacientes?.obra_social || 'No especificada',
        'Edad Paciente': turno.pacientes?.edad || 'N/A',
        'Fecha Turno': turno.fecha_turno ? new Date(turno.fecha_turno).toLocaleDateString('es-AR') : 'N/A',
        'Hora Inicio': turno.hora_inicio || 'N/A',
        'Hora Fin': turno.hora_fin || 'N/A',
        'Especialidad': turno.especialidades?.nombre || 'N/A',
        'Estado Turno': turno.estado || 'N/A',
      };
    });
  }

  // ============================================================
  // MÉTODO PRIVADO - GENERAR ARCHIVO EXCEL
  // ============================================================
  private generarArchivoExcel(data: any[], filenameBase: string): void {
    try {
      console.log('💾 Creando archivo Excel con', data.length, 'registros');
      
      const worksheet = utils.json_to_sheet(data);
      const workbook = utils.book_new();
      
      // Ajustar el ancho de las columnas automáticamente
      const maxWidth = data.reduce((acc, row) => {
        Object.keys(row).forEach(key => {
          const length = String(row[key]).length;
          if (!acc[key] || length > acc[key]) {
            acc[key] = length;
          }
        });
        return acc;
      }, {} as any);

      worksheet['!cols'] = Object.keys(maxWidth).map(key => ({
        wch: Math.min(Math.max(maxWidth[key], key.length), 50)
      }));

      utils.book_append_sheet(workbook, worksheet, 'Datos');
      
      const fecha = new Date().toISOString().split('T')[0];
      const filename = `${filenameBase}_${fecha}.xlsx`;
      
      writeFile(workbook, filename);
      
      console.log('✅ Archivo Excel generado correctamente:', filename);
      
    } catch (error) {
      console.error('❌ Error generando archivo Excel:', error);
      throw error;
    }
  }

  // ============================================================
  // MÉTODO PARA PERSONALIZAR EXCEL CON MÚLTIPLES HOJAS
  // ============================================================
  generarExcelMultiplesHojas(hojas: { nombre: string, datos: any[] }[], filenameBase: string): void {
    try {
      const workbook = utils.book_new();
      
      hojas.forEach(hoja => {
        const worksheet = utils.json_to_sheet(hoja.datos);
        utils.book_append_sheet(workbook, worksheet, hoja.nombre);
      });

      const fecha = new Date().toISOString().split('T')[0];
      writeFile(workbook, `${filenameBase}_${fecha}.xlsx`);
    } catch (error) {
      console.error('Error generando Excel con múltiples hojas:', error);
      throw error;
    }
  }

  // ============================================================
  // MÉTODO DE DEBUG - VER ESTRUCTURA DE TURNOS
  // ============================================================
  debugTurnosEstructura(usuario: any): void {
    console.log('🔍 DEBUG ESTRUCTURA DE TURNOS:', {
      nombre: usuario.nombre,
      id: usuario.id,
      totalTurnos: usuario.turnos?.length
    });

    if (usuario.turnos && usuario.turnos.length > 0) {
      usuario.turnos.forEach((turno: any, index: number) => {
        console.log(`   Turno ${index + 1}:`, {
          id: turno.id,
          fecha: turno.fecha_turno,
          estado: turno.estado,
          especialidad: turno.especialidades,
          especialista: turno.especialistas,
          estructuraCompleta: turno
        });
      });
    } else {
      console.log('   ❌ No hay turnos en el usuario');
    }
  }

  // En ExcelService - Modificar el método generarExcelTurnosPaciente
async generarExcelTurnosPaciente(usuario: any): Promise<void> {
  try {
    console.log('🚀 INICIANDO GENERACIÓN EXCEL PARA:', {
      nombre: usuario.nombre,
      id: usuario.id,
      tipo: usuario.tipo_usuario,
      turnosEnMemoria: usuario.turnos?.length
    });

    if (usuario.tipo_usuario !== 'paciente') {
      throw new Error('Solo se pueden descargar detalles de turnos para pacientes');
    }

    // ✅ OBTENER DATOS DEL PACIENTE (DNI y obra social)
    const datosPaciente = await this.obtenerDatosPaciente(usuario.id);
    if (!datosPaciente) {
      throw new Error('No se pudieron obtener los datos del paciente (DNI y obra social)');
    }

    // Combinar los datos del usuario con los datos del paciente
    const usuarioCompleto = {
      ...usuario,
      dni: datosPaciente.dni,
      obra_social: datosPaciente.obra_social
    };

    // ✅ USAR LOS TURNOS QUE YA ESTÁN CARGADOS EN EL COMPONENTE
    let turnosParaExcel = usuario.turnos;

    console.log('💾 Turnos disponibles en memoria:', turnosParaExcel);

    // Si no hay turnos en memoria, intentar cargarlos desde BD
    if (!turnosParaExcel || turnosParaExcel.length === 0) {
      console.warn('⚠️ No hay turnos en memoria, intentando cargar desde BD...');
      turnosParaExcel = await this.obtenerTurnosCompletosPaciente(datosPaciente.id); // Usar el id de paciente
    }

    console.log('📈 Total de turnos a exportar:', turnosParaExcel?.length || 0);

    // Generar datos detallados para Excel
    const data = this.formatearTurnosParaExcel(usuarioCompleto, turnosParaExcel);
    
    console.log('✅ Datos formateados para Excel:', data.length, 'registros');
    
    this.generarArchivoExcel(data, `turnos_paciente_${datosPaciente.dni || 'sin_dni'}_${usuario.apellido || 'sin_apellido'}`);
    
  } catch (error: any) {
    console.error('❌ Error generando Excel de turnos:', error);
    throw new Error(error.message || 'No se pudo generar el Excel de turnos');
  }
}

// ✅ AGREGAR ESTE MÉTODO PARA OBTENER DATOS DEL PACIENTE
private async obtenerDatosPaciente(usuarioId: number): Promise<any> {
  try {
    console.log('🔍 Obteniendo datos del paciente para usuario_id:', usuarioId);
    
    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select('id, dni, obra_social')
      .eq('usuario_id', usuarioId)
      .single();

    if (error) {
      console.error('❌ Error obteniendo datos del paciente:', error);
      return null;
    }

    console.log('✅ Datos del paciente obtenidos:', paciente);
    return paciente;
  } catch (error) {
    console.error('Error obteniendo datos del paciente:', error);
    return null;
  }
}
}