// services/estadisticas.service.ts
import { Injectable } from '@angular/core';
import supabase from '../supabase.client';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {

// services/estadisticas.service.ts - Método obtenerLogIngresos SIMPLIFICADOa

async obtenerLogIngresos(): Promise<any[]> {
    console.log('📋 Obteniendo logs de ingresos mediante RPC seguro (solo tipo de usuario)...');

    try {
        const { data: userLogs, error: authError } = await supabase
            .rpc('get_auth_logs_with_profile'); 

        if (authError) {
            console.error('🛑 Error en el RPC (get_auth_logs_with_profile):', authError);
            throw authError; 
        }

        if (userLogs && userLogs.length > 0) {
            console.log('✅ Logs obtenidos mediante RPC:', userLogs.length);
            
            return userLogs
                .map((log: any) => ({
                    usuario_id: log.user_id,
                    usuario_email: log.user_email,
                    
                    // Eliminamos nombre y apellido, y el nombre completo será el email
                    nombre_completo: log.user_email,
                    
                    // Datos del RPC
                    primer_ingreso_fecha_hora: log.primer_ingreso_fecha_hora,
                    ultimo_ingreso_fecha_hora: log.ultimo_ingreso_fecha_hora,
                    
                    // Capturamos el tipo de usuario
                    tipo: log.tipo_usuario || 'auth_user', 
                    estado: 'activo' 
                }))
                .filter((log: { primer_ingreso_fecha_hora: any; }) => log.primer_ingreso_fecha_hora)
                .sort((a: { ultimo_ingreso_fecha_hora: string | number | Date; }, b: { ultimo_ingreso_fecha_hora: string | number | Date; }) => new Date(b.ultimo_ingreso_fecha_hora).getTime() - new Date(a.ultimo_ingreso_fecha_hora).getTime());
        }

        return []; 
    } catch (error) {
        console.error('Error general en obtenerLogIngresos:', error);
        return [];
    }
}
  // TURNOS POR ESPECIALIDAD - Para gráfico de torta
// services/estadisticas.service.ts

// TURNOS POR ESPECIALIDAD - Para gráfico de torta
async obtenerTurnosPorEspecialidad(): Promise<any[]> {
  console.log('🏥 Obteniendo turnos por especialidad...');
  
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      id,
      especialidad_id,
      especialidades (
        id,
        nombre
      )
    `)
    .not('especialidad_id', 'is', null);

  if (error) {
    console.error('Error obteniendo turnos por especialidad:', error);
    return [];
  }

  // Procesar los datos para gráfico de torta
  const agrupado = (data || []).reduce((acc: any, turno: any) => {
    
    // 🔥 CORRECCIÓN CLAVE: Acceder directamente a 'turno.especialidades.nombre'
    // El objeto 'especialidades' es una relación de "muchos a uno", por lo que es un objeto, no un array.
    const especialidadNombre = turno.especialidades?.nombre || 'Sin especialidad';
    
    acc[especialidadNombre] = (acc[especialidadNombre] || 0) + 1;
    return acc;
  }, {});

  const resultado = Object.entries(agrupado).map(([especialidad, cantidad]) => ({
    especialidad,
    cantidad
  }));

  console.log('✅ Turnos por especialidad:', resultado);
  return resultado;
}

// services/estadisticas.service.ts

// ... (otras importaciones y código)

// Debes tener una función en el servicio que obtiene todos los datos iniciales
async obtenerDatosSinFiltro(): Promise<{ 
    logIngresos: any[]; 
    turnosCompletos: any[]; // <-- Añadimos la nueva propiedad
    // Otras propiedades si las usas (e.g., turnosPorDia inicial)
}> {
    
    // 1. Obtener Log de Ingresos (asumiendo que llamas al RPC)
    const logIngresos = await this.obtenerLogIngresos(); 

    // 2. Obtener Turnos Completos (usando la función que ya corregimos, pero sin agrupar)
    const turnosCompletos = await this.obtenerTurnosCompletos(); // <-- Implementaremos esta nueva función
    
    return {
        logIngresos: logIngresos,
        turnosCompletos: turnosCompletos
    };
}


// NUEVO O MODIFICADO: Función para obtener los turnos sin agrupar


async obtenerTurnosCompletos(): Promise<any[]> {
    console.log('🏥 Obteniendo turnos completos para filtrado...');
    
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        id,
        estado, 
        especialidad_id,
        especialidades (
          id,
          nombre
        )
      `)
      .not('especialidad_id', 'is', null);

    if (error) {
      // Ahora debería mostrar el error correcto si falla por otra razón
      console.error('Error obteniendo turnos completos:', error);
      return [];
    }

    return data || []; 
}
  // TURNOS POR DÍA - Para gráfico de torta (agrupado por día de la semana)
  async obtenerTurnosPorDia(fechaInicio: string, fechaFin: string): Promise<any[]> {
    if (!fechaInicio || !fechaFin) {
      console.warn('Fechas requeridas para turnos por día');
      return [];
    }

    console.log('📅 Obteniendo turnos por día...', { fechaInicio, fechaFin });

    const { data, error } = await supabase
      .from('turnos')
      .select('fecha_turno, estado')
      .gte('fecha_turno', fechaInicio)
      .lte('fecha_turno', fechaFin)
      .order('fecha_turno', { ascending: true });

    if (error) {
      console.error('Error obteniendo turnos por día:', error);
      return [];
    }

    // Agrupar por día de la semana para gráfico de torta
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const agrupadoPorDiaSemana = (data || []).reduce((acc: any, turno: any) => {
      const fecha = new Date(turno.fecha_turno);
      const diaSemana = diasSemana[fecha.getDay()];
      acc[diaSemana] = (acc[diaSemana] || 0) + 1;
      return acc;
    }, {});

    const resultado = Object.entries(agrupadoPorDiaSemana).map(([dia, cantidad]) => ({
      dia,
      cantidad
    }));

    console.log('✅ Turnos por día de semana:', resultado);
    return resultado;
  }

  // OBTENER MÉDICOS/ESPECIALISTAS
  async obtenerMedicos(): Promise<any[]> {
    console.log('👨‍⚕️ Obteniendo lista de médicos...');
    
    const { data, error } = await supabase
      .from('especialistas')
      .select(`
        id,
        nombre,
        apellido,
        usuario_id,
        usuarios (
          email,
          estado
        ),
        especialista_especialidad (
          especialidades (
            nombre
          )
        )
      `);

    if (error) {
      console.error('Error obteniendo médicos:', error);
      return [];
    }

    const medicos = data.map(medico => {
      // Manejar arrays de relaciones
      const usuario = Array.isArray(medico.usuarios) ? medico.usuarios[0] : medico.usuarios;
      const especialidadRel = Array.isArray(medico.especialista_especialidad) 
        ? medico.especialista_especialidad[0] 
        : medico.especialista_especialidad;
      
      const especialidades = Array.isArray(especialidadRel?.especialidades) 
        ? especialidadRel.especialidades[0]
        : especialidadRel?.especialidades;

      return {
        id: medico.id,
        nombre_completo: `${medico.nombre} ${medico.apellido}`,
        email: usuario?.email,
        especialidad: especialidades?.nombre || 'Sin especialidad',
        estado: usuario?.estado
      };
    }).filter(medico => medico.estado === 'activo'); // Solo médicos activos

    console.log('✅ Médicos obtenidos:', medicos.length);
    return medicos;
  }

  // TURNOS POR MÉDICO GENERAL (todos los médicos) - Para gráfico de torta
  async obtenerTurnosPorMedicoGeneral(
    fechaInicio: string, 
    fechaFin: string, 
    tipo: 'solicitados' | 'finalizados'
  ): Promise<any[]> {
    
    if (!fechaInicio || !fechaFin) {
      console.warn('Fechas requeridas para turnos por médico');
      return [];
    }

    console.log(`👨‍⚕️ Obteniendo turnos ${tipo} por médico...`, { fechaInicio, fechaFin });

    let query = supabase
      .from('turnos')
      .select(`
        id,
        estado,
        fecha_turno,
        especialista_id,
        especialistas (
          nombre,
          apellido
        )
      `)
      .gte('fecha_turno', fechaInicio)
      .lte('fecha_turno', fechaFin);

    // Filtrar por tipo
    if (tipo === 'solicitados') {
      query = query.eq('estado', 'solicitado');
    } else if (tipo === 'finalizados') {
      query = query.eq('estado', 'realizado');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo turnos por médico general:', error);
      return [];
    }

    const agrupado = (data || []).reduce((acc: any, turno: any) => {
      // Manejar array de especialistas
      const especialista = Array.isArray(turno.especialistas) 
        ? turno.especialistas[0] 
        : turno.especialistas;
      
      const medico = especialista 
        ? `${especialista.nombre} ${especialista.apellido}`
        : 'Sin médico';
      
      acc[medico] = (acc[medico] || 0) + 1;
      return acc;
    }, {});

    const resultado = Object.entries(agrupado).map(([medico, cantidad]) => ({
      medico,
      cantidad
    }));

    console.log(`✅ Turnos ${tipo} por médico:`, resultado);
    return resultado;
  }

  // TURNOS POR MÉDICO ESPECÍFICO - Para gráfico de torta (solicitados vs finalizados)
  async obtenerTurnosPorMedicoEspecifico(
    medicoId: string,
    fechaInicio: string, 
    fechaFin: string
  ): Promise<any[]> {
    
    if (!medicoId || !fechaInicio || !fechaFin) {
      console.warn('Médico y fechas requeridos');
      return [];
    }

    console.log(`👨‍⚕️ Obteniendo turnos para médico específico ${medicoId}...`);

    // Obtener todos los turnos del médico en el período
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        id,
        estado,
        fecha_turno,
        especialista_id
      `)
      .eq('especialista_id', medicoId)
      .gte('fecha_turno', fechaInicio)
      .lte('fecha_turno', fechaFin);

    if (error) {
      console.error('Error obteniendo turnos por médico específico:', error);
      return [];
    }

    // Agrupar por estado para gráfico de torta
    const agrupadoPorEstado = (data || []).reduce((acc: any, turno: any) => {
      const estado = turno.estado;
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    const resultado = Object.entries(agrupadoPorEstado).map(([estado, cantidad]) => ({
      estado,
      cantidad
    }));

    console.log(`✅ Turnos por estado para médico ${medicoId}:`, resultado);
    return resultado;
  }

  // MÉTODOS UTILITARIOS

  async obtenerDatosConFiltro(fechaInicio: string, fechaFin: string, medicoId?: string) {
    console.log('📊 Cargando datos con filtro...', { fechaInicio, fechaFin, medicoId });
    
    const datosBase = await Promise.all([
      this.obtenerTurnosPorDia(fechaInicio, fechaFin),
      this.obtenerTurnosPorMedicoGeneral(fechaInicio, fechaFin, 'solicitados'),
      this.obtenerTurnosPorMedicoGeneral(fechaInicio, fechaFin, 'finalizados')
    ]);

    const resultado: any = {
      turnosPorDia: datosBase[0],
      turnosSolicitados: datosBase[1],
      turnosFinalizados: datosBase[2],
      turnosMedicoEspecifico: null
    };

    // Si se seleccionó un médico específico, cargar sus datos
    if (medicoId && medicoId !== 'todos') {
      const turnosEspecifico = await this.obtenerTurnosPorMedicoEspecifico(medicoId, fechaInicio, fechaFin);
      resultado.turnosMedicoEspecifico = turnosEspecifico;
    }

    console.log('✅ Datos con filtro cargados:', resultado);
    return resultado;
  }

  // MÉTODO PARA VERIFICAR DATOS BÁSICOS
  async verificarDatosDisponibles() {
    console.log('🔍 Verificando datos disponibles...');
    
    try {
      const [turnosCount, medicosCount, especialidadesCount] = await Promise.all([
        supabase.from('turnos').select('id', { count: 'exact', head: true }),
        supabase.from('especialistas').select('id', { count: 'exact', head: true }),
        supabase.from('especialidades').select('id', { count: 'exact', head: true })
      ]);

      return {
        tieneTurnos: (turnosCount.count || 0) > 0,
        tieneMedicos: (medicosCount.count || 0) > 0,
        tieneEspecialidades: (especialidadesCount.count || 0) > 0,
        totalTurnos: turnosCount.count || 0,
        totalMedicos: medicosCount.count || 0,
        totalEspecialidades: especialidadesCount.count || 0
      };
    } catch (error) {
      console.error('Error verificando datos:', error);
      return {
        tieneTurnos: false,
        tieneMedicos: false,
        tieneEspecialidades: false,
        totalTurnos: 0,
        totalMedicos: 0,
        totalEspecialidades: 0
      };
    }
  }
}