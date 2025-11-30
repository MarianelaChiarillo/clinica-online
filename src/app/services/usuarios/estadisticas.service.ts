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
async obtenerTurnosPorDiaSemana(): Promise<any[]> {
  console.log('📅 Obteniendo turnos por día de la semana...');

  const { data, error } = await supabase
    .from('turnos')
    .select('fecha_turno');

  if (error) {
    console.error('Error obteniendo turnos por día:', error);
    return [];
  }

  const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

  // Inicializar todos los días con 0
  const conteo: Record<string, number> = {};
  diasSemana.forEach(d => conteo[d] = 0);

  (data || []).forEach(turno => {
    const fecha = new Date(turno.fecha_turno);
    const dia = diasSemana[fecha.getDay()];
    conteo[dia]++;
  });

  // Solo devolver de Lunes a Sábado
  const resultado = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map(dia => ({
    dia,
    cantidad: conteo[dia] || 0
  }));

  console.log('✅ Turnos por día de semana:', resultado);
  return resultado;
}

async obtenerTurnosPorEspecialidad(filtroEspecialidad?: string): Promise<any[]> {
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
    const especialidadNombre = turno.especialidades?.nombre || 'Sin especialidad';
    acc[especialidadNombre] = (acc[especialidadNombre] || 0) + 1;
    return acc;
  }, {});

  let resultado = Object.entries(agrupado).map(([especialidad, cantidad]) => ({
    especialidad,
    cantidad
  }));

  // 🔹 Filtrar por especialidad si llega parámetro
  if (filtroEspecialidad && filtroEspecialidad !== 'todas') {
    resultado = resultado.filter(r => r.especialidad === filtroEspecialidad);
  }

  console.log('✅ Turnos por especialidad:', resultado);
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

async obtenerEspecialidades() {
  console.log("🔍 [SERVICE] Solicitando ESPECIALIDADES...");

  const { data, error } = await supabase
    .from('especialidades')
    .select('*');

  if (error) {
    console.error("❌ [SERVICE] Error obteniendo especialidades:", error);
    return [];
  }

  console.log("✅ [SERVICE] Especialidades obtenidas:", data);
  return data;
}


async obtenerTurnosPorEspecialidadFiltrado(nombreEspecialidad: string): Promise<any[]> {
  console.log("🎯 Obteniendo turnos filtrados por especialidad:", nombreEspecialidad);

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
    .not('especialidad_id', 'is', null)
    .eq('especialidades.nombre', nombreEspecialidad);

  if (error) {
    console.error("Error filtrando turnos por especialidad:", error);
    return [];
  }

  return [
    {
      especialidad: nombreEspecialidad,
      cantidad: data.length
    }
  ];
}

async obtenerTurnosPorEspecialidadConEstado(especialidad?: string): Promise<any[]> {
  let query = supabase
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

  if (especialidad && especialidad !== 'todas') {
    query = query.eq('especialidades.nombre', especialidad);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error obteniendo turnos por especialidad con estado:', error);
    return [];
  }

  // Agrupamos por estado
  const agrupado = (data || []).reduce((acc: any, turno: any) => {
    const esp = turno.especialidades?.nombre || 'Sin especialidad';
    const estado = turno.estado || 'Desconocido';

    if (!acc[esp]) acc[esp] = {};
    acc[esp][estado] = (acc[esp][estado] || 0) + 1;

    return acc;
  }, {});

  // Convertimos a array fácil de usar en gráfico y PDF
  const resultado: any[] = [];
  Object.keys(agrupado).forEach(esp => {
    Object.keys(agrupado[esp]).forEach(estado => {
      resultado.push({
        especialidad: esp,
        estado: estado,
        cantidad: agrupado[esp][estado]
      });
    });
  });

  console.log('✅ Turnos por especialidad con estado:', resultado);
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
      this.obtenerTurnosPorMedicoGeneral(fechaInicio, fechaFin, 'solicitados'),
      this.obtenerTurnosPorMedicoGeneral(fechaInicio, fechaFin, 'finalizados')
    ]);

    const resultado: any = {
      turnosPorDia: datosBase[0],
      turnosSolicitados: datosBase[1],
      turnosFinalizados: datosBase[1],
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

  async obtenerTurnosPorMedico(
  medico: string, 
  estado: 'solicitado' | 'realizado', 
  fechaInicio: string, 
  fechaFin: string
): Promise<any[]> {
  console.log(`📊 Obteniendo turnos ${estado} para ${medico} entre ${fechaInicio} y ${fechaFin}`);

  const { data, error } = await supabase
  .from('turnos')
  .select('especialista_id, fecha_turno, estado')
  .eq('especialista_id', medico) // <-- aquí también
  .eq('estado', estado)
  .gte('fecha_turno', fechaInicio)
  .lte('fecha_turno', fechaFin)
  .order('fecha_turno', { ascending: true });


  if (error) {
    console.error('Error obteniendo turnos por médico:', error);
    return [];
  }

  // Agrupar por médico (aunque aquí solo viene uno) y contar
  const cantidad = data ? data.length : 0;

  return [
    {
      medico,
      cantidad
    }
  ];


  
}



}