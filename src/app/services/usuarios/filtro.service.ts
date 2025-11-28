// services/filtro.service.ts
import { Injectable } from '@angular/core';
import { TurnoExtendido, Coincidencia } from '../../models/turno';

@Injectable({
  providedIn: 'root'
})
export class FiltroService {
  
  aplicarFiltro(turnos: TurnoExtendido[], termino: string, tipoUsuario: 'paciente' | 'especialista'): TurnoExtendido[] {
    const terminoLower = termino.toLowerCase().trim();
    
    if (!terminoLower) {
      turnos.forEach(t => t.coincidencias = []);
      return [...turnos];
    }

    return turnos.filter(t => {
      const coincidenciasBasicos = this.obtenerCoincidenciasCamposBasicos(t, terminoLower, tipoUsuario);
      const coincidenciasHC = this.obtenerCoincidenciasHistoriaClinica(t, terminoLower);
      
      const todasCoincidencias = [...coincidenciasBasicos, ...coincidenciasHC];
      
      if (todasCoincidencias.length > 0) {
        t.coincidencias = todasCoincidencias;
        return true;
      } else {
        t.coincidencias = [];
        return false;
      }
    });
  }

  private obtenerCoincidenciasCamposBasicos(turno: TurnoExtendido, termino: string, tipoUsuario: 'paciente' | 'especialista'): Coincidencia[] {
    const coincidencias: Coincidencia[] = [];
    
    const campos = tipoUsuario === 'paciente' 
      ? [
          // Solo campos relevantes para paciente
          { tipo: 'especialista' as const, valor: turno.especialistas?.nombre?.toLowerCase() || '' },
          { tipo: 'especialista' as const, valor: turno.especialistas?.apellido?.toLowerCase() || '' },
          { tipo: 'especialidad' as const, valor: turno.especialidades?.nombre?.toLowerCase() || '' }
          // ❌ Quitamos estado, fecha y hora como solicitaste
        ]
      : [
          // Solo campos relevantes para especialista
          { tipo: 'paciente' as const, valor: turno.pacientes?.nombre?.toLowerCase() || '' },
          { tipo: 'paciente' as const, valor: turno.pacientes?.apellido?.toLowerCase() || '' },
          { tipo: 'especialidad' as const, valor: turno.especialidades?.nombre?.toLowerCase() || '' }
          // ❌ Quitamos estado, fecha y hora como solicitaste
        ];

    campos.forEach(campo => {
      if (campo.valor.includes(termino)) {
        coincidencias.push({
          tipo: campo.tipo,
          campo: this.obtenerNombreCampo(campo.tipo),
          valor: this.obtenerValorOriginal(turno, campo.tipo, tipoUsuario)
        });
      }
    });

    return coincidencias;
  }

  private obtenerCoincidenciasHistoriaClinica(turno: TurnoExtendido, termino: string): Coincidencia[] {
    const coincidencias: Coincidencia[] = [];
    
    if (!turno.historia_clinica || turno.estado !== 'realizado') {
      return coincidencias;
    }

    // Buscar en datos fijos (solo datos médicos relevantes)
    const datosFijos = [
      { tipo: 'historia_clinica_fija' as const, clave: 'altura', valor: turno.historia_clinica.altura?.toString() || '' },
      { tipo: 'historia_clinica_fija' as const, clave: 'peso', valor: turno.historia_clinica.peso?.toString() || '' },
      { tipo: 'historia_clinica_fija' as const, clave: 'temperatura', valor: turno.historia_clinica.temperatura?.toString() || '' },
      { tipo: 'historia_clinica_fija' as const, clave: 'presion', valor: turno.historia_clinica.presion?.toString() || '' }
    ];

    datosFijos.forEach(dato => {
      if (dato.valor.toLowerCase().includes(termino)) {
        coincidencias.push({
          tipo: dato.tipo,
          campo: dato.clave,
          valor: dato.valor
        });
      }
    });

    // Buscar en datos dinámicos (todos son relevantes)
    if (turno.historia_clinica.datos_dinamicos && Array.isArray(turno.historia_clinica.datos_dinamicos)) {
      turno.historia_clinica.datos_dinamicos.forEach((dato: any) => {
        const claveLower = (dato.clave || '').toLowerCase();
        const valorLower = (dato.valor || '').toLowerCase();
        
        if (claveLower.includes(termino) || valorLower.includes(termino)) {
          coincidencias.push({
            tipo: 'historia_clinica_dinamica',
            campo: dato.clave || 'sin clave',
            valor: dato.valor || 'sin valor'
          });
        }
      });
    }

    return coincidencias;
  }

  private obtenerNombreCampo(tipo: string): string {
    const nombres: any = {
      'paciente': 'Paciente',
      'especialista': 'Especialista',
      'especialidad': 'Especialidad',
      'historia_clinica_fija': 'Historia Clínica',
      'historia_clinica_dinamica': 'Dato Clínico'
    };
    return nombres[tipo] || tipo;
  }

  private obtenerValorOriginal(turno: TurnoExtendido, tipo: string, tipoUsuario: 'paciente' | 'especialista'): string {
    switch (tipo) {
      case 'paciente':
        return `${turno.pacientes?.nombre} ${turno.pacientes?.apellido}`;
      case 'especialista':
        return `${turno.especialistas?.nombre} ${turno.especialistas?.apellido}`;
      case 'especialidad':
        return turno.especialidades?.nombre || '';
      default:
        return '';
    }
  }

  // Métodos de formato (se mantienen para el template)
  formatearEstado(estado: string): string {
    const map: any = {
      'solicitado': 'Solicitado',
      'aceptado': 'Aceptado',
      'realizado': 'Realizado',
      'cancelado': 'Cancelado',
      'rechazado': 'Rechazado'
    };
    return map[estado?.toLowerCase()] || estado;
  }

  formatearFecha(fecha: string): string {
    return fecha ? new Date(fecha).toLocaleDateString('es-AR') : '';
  }

  formatearHora(hora: string): string {
    return hora ? hora.substring(0, 5) : '';
  }
}