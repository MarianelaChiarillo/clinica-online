import { Injectable } from '@angular/core';
import supabase from '../supabase.client';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {

  async obtenerLogIngresos(): Promise<any[]> {
    try {
      const respuesta = await supabase.rpc('get_auth_logs_with_profile');
      const userLogs = respuesta.data;
      const error = respuesta.error;

      if (error) {
        throw error;
      }

      if (!userLogs) {
        return [];
      }

      const lista = [];
      for (let i = 0; i < userLogs.length; i++) {
        const log = userLogs[i];

        const item: any = {};
        item.usuario_id = log.user_id;
        item.usuario_email = log.user_email;
        item.nombre_completo = log.user_email;
        item.primer_ingreso_fecha_hora = log.primer_ingreso_fecha_hora;
        item.ultimo_ingreso_fecha_hora = log.ultimo_ingreso_fecha_hora;

        if (log.tipo_usuario) {
          item.tipo = log.tipo_usuario;
        } else {
          item.tipo = 'auth_user';
        }

        item.estado = 'activo';

        if (item.primer_ingreso_fecha_hora) {
          lista.push(item);
        }
      }

      for (let a = 0; a < lista.length - 1; a++) {
        for (let b = a + 1; b < lista.length; b++) {
          const fechaA = new Date(lista[a].ultimo_ingreso_fecha_hora).getTime();
          const fechaB = new Date(lista[b].ultimo_ingreso_fecha_hora).getTime();
          if (fechaA < fechaB) {
            const tiempo : any = lista[a];
            lista[a] = lista[b];
            lista[b] = tiempo;
          }
        }
      }

      return lista;

    } catch (e) {
      return [];
    }
  }

  async obtenerDatosSinFiltro() {
    const logs = await this.obtenerLogIngresos();
    const turnos = await this.obtenerTurnosCompletos();

    const resultado: any = {};
    resultado.logIngresos = logs;
    resultado.turnosCompletos = turnos;

    return resultado;
  }

  async obtenerTurnosCompletos(): Promise<any[]> {
    const respuesta = await supabase
      .from('turnos')
      .select('id, estado, fecha_turno, especialidad_id')
      .not('especialidad_id', 'is', null);

    const data = respuesta.data;
    const error = respuesta.error;

    if (error) {
      return [];
    }

    if (!data) {
      return [];
    }

    return data;
  }

  async obtenerTurnosPorDiaSemana(): Promise<any[]> {
    const respuesta = await supabase
      .from('turnos')
      .select('fecha_turno');

    const data = respuesta.data;
    const error = respuesta.error;

    if (error || !data) {
      return [];
    }

    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const conteo: any = {};

    for (let i = 0; i < dias.length; i++) {
      conteo[dias[i]] = 0;
    }

    for (let j = 0; j < data.length; j++) {
      const turno = data[j];
      const fecha = new Date(turno.fecha_turno);
      const indice = fecha.getDay();
      const nombreDia = dias[indice];
      conteo[nombreDia] = conteo[nombreDia] + 1;
    }

    const orden = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const resultado: any[] = [];

    for (let k = 0; k < orden.length; k++) {
      const dia = orden[k];
      const item: any = {};
      item.dia = dia;
      item.cantidad = conteo[dia];
      resultado.push(item);
    }

    return resultado;
  }

  async obtenerTurnosPorEspecialidad(especialidadNombre?: string) {
    const respuesta = await supabase
      .from('turnos')
      .select('id, estado, especialidad_id')
      .not('especialidad_id', 'is', null);

    const data = respuesta.data;
    const error = respuesta.error;

    if (error || !data) {
      return [];
    }

    const agrupado: any = {};

    for (let i = 0; i < data.length; i++) {
      const turno = data[i];
      const id = turno.especialidad_id;

      if (agrupado[id] === undefined) {
        agrupado[id] = 1;
      } else {
        agrupado[id] = agrupado[id] + 1;
      }
    }

    const resultado: any[] = [];
    const claves = Object.keys(agrupado);

    for (let j = 0; j < claves.length; j++) {
      const clave = Number(claves[j]);
      const item: any = {};
      item.especialidad_id = clave;
      item.cantidad = agrupado[clave];
      resultado.push(item);
    }

    if (especialidadNombre !== undefined) {
      if (especialidadNombre !== 'todas') {
        const filtro: any[] = [];
        const objetivo = Number(especialidadNombre);

        for (let k = 0; k < resultado.length; k++) {
          if (resultado[k].especialidad_id === objetivo) {
            filtro.push(resultado[k]);
          }
        }

        return filtro;
      }
    }

    return resultado;
  }

  async obtenerTurnosPorMedico(
    medicoId: string,
    estado: 'solicitado' | 'realizado',
    fechaInicio: string,
    fechaFin: string
  ) {
    const respuesta = await supabase
      .from('turnos')
      .select('id, estado, fecha_turno')
      .eq('especialista_id', medicoId)
      .eq('estado', estado)
      .gte('fecha_turno', fechaInicio)
      .lte('fecha_turno', fechaFin);

    const data = respuesta.data;
    const error = respuesta.error;

    if (error) {
      return [];
    }

    let cantidad = 0;
    if (data) {
      cantidad = data.length;
    }

    const lista = [];
    const item: any = {};
    item.medicoId = medicoId;
    item.cantidad = cantidad;
    lista.push(item);

    return lista;
  }

  async verificarDatosDisponibles() {
    try {
      const p1 = supabase.from('turnos').select('id', { count: 'exact', head: true });
      const p2 = supabase.from('especialistas').select('id', { count: 'exact', head: true });
      const p3 = supabase.from('especialidades').select('id', { count: 'exact', head: true });

      const resultados = await Promise.all([p1, p2, p3]);

      const t = resultados[0];
      const m = resultados[1];
      const e = resultados[2];

      const respuesta: any = {};

      if (t.count && t.count > 0) {
        respuesta.tieneTurnos = true;
      } else {
        respuesta.tieneTurnos = false;
      }

      if (m.count && m.count > 0) {
        respuesta.tieneMedicos = true;
      } else {
        respuesta.tieneMedicos = false;
      }

      if (e.count && e.count > 0) {
        respuesta.tieneEspecialidades = true;
      } else {
        respuesta.tieneEspecialidades = false;
      }

      return respuesta;

    } catch (err) {
      return {
        tieneTurnos: false,
        tieneMedicos: false,
        tieneEspecialidades: false
      };
    }
  }
}
