import { Injectable } from '@angular/core';
import { TurnoExtendido, Coincidencia } from '../models/turno';
import { FormGroup } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class UtilsService {

  handleFileChange(event: any, form: FormGroup, controlName: string) {
    const archivo = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (archivo) form.get(controlName)?.setValue(archivo);
    return { archivo, nombreArchivo: archivo?.name || null };
  }

  quitarArchivo(form: FormGroup, controlName: string) {
    form.get(controlName)?.setValue(null);
  }

  markAllAsTouched(form: FormGroup) {
    Object.values(form.controls).forEach(control => control.markAsTouched());
  }
  aplicarFiltroATurnos(turnos: TurnoExtendido[], terminoDeBusqueda: string, tipoDeUsuario: 'paciente' | 'especialista'): TurnoExtendido[] {
    
    let turnosFiltrados: TurnoExtendido[] = [];
    let terminoLimpio = terminoDeBusqueda.trim().toLowerCase();

    let indiceTurno;
    for (indiceTurno = 0; indiceTurno < turnos.length; indiceTurno++) {
      turnos[indiceTurno].coincidencias = [];
      let turnoActual = turnos[indiceTurno];

      if (terminoLimpio === '') {
        turnosFiltrados.push(turnoActual);
        continue;
      }

      let coincidenciasBasicas = this.buscarCoincidenciasCamposBasicos(turnoActual, terminoLimpio, tipoDeUsuario);
      let coincidenciasHistoria = this.buscarCoincidenciasHistoriaClinica(turnoActual, terminoLimpio);

      let todasLasCoincidencias: Coincidencia[] = [];
      let indiceCoincidencia;
      for (indiceCoincidencia = 0; indiceCoincidencia < coincidenciasBasicas.length; indiceCoincidencia++) {
        todasLasCoincidencias.push(coincidenciasBasicas[indiceCoincidencia]);
      }
      for (indiceCoincidencia = 0; indiceCoincidencia < coincidenciasHistoria.length; indiceCoincidencia++) {
        todasLasCoincidencias.push(coincidenciasHistoria[indiceCoincidencia]);
      }

      if (todasLasCoincidencias.length > 0) {
        turnoActual.coincidencias = todasLasCoincidencias;
        turnosFiltrados.push(turnoActual);
      }
    }

    return turnosFiltrados;
  }

  private buscarCoincidenciasCamposBasicos(turno: TurnoExtendido, termino: string, tipoDeUsuario: 'paciente' | 'especialista'): Coincidencia[] {
    let coincidencias: Coincidencia[] = [];
    let campos: any[] = [];

    if (tipoDeUsuario === 'paciente') {
      campos.push({ tipo: 'especialista', valor: turno.especialistas ? turno.especialistas.nombre || '' : '' });
      campos.push({ tipo: 'especialista', valor: turno.especialistas ? turno.especialistas.apellido || '' : '' });
      campos.push({ tipo: 'especialidad', valor: turno.especialidades ? turno.especialidades.nombre || '' : '' });
    } else {
      campos.push({ tipo: 'paciente', valor: turno.pacientes ? turno.pacientes.nombre || '' : '' });
      campos.push({ tipo: 'paciente', valor: turno.pacientes ? turno.pacientes.apellido || '' : '' });
      campos.push({ tipo: 'especialidad', valor: turno.especialidades ? turno.especialidades.nombre || '' : '' });
    }

    let indiceCampo;
    for (indiceCampo = 0; indiceCampo < campos.length; indiceCampo++) {
      let campoActual = campos[indiceCampo];
      let valorMinuscula = campoActual.valor.toLowerCase();
      if (valorMinuscula.indexOf(termino) !== -1) {
        coincidencias.push({
          tipo: campoActual.tipo,
          campo: this.obtenerNombreDelCampo(campoActual.tipo),
          valor: this.obtenerValorOriginal(turno, campoActual.tipo)
        });
      }
    }

    return coincidencias;
  }

  private buscarCoincidenciasHistoriaClinica(turno: TurnoExtendido, termino: string): Coincidencia[] {
    let coincidencias: Coincidencia[] = [];

    if (!turno.historia_clinica) return coincidencias;
    if (turno.estado !== 'realizado') return coincidencias;

    let camposFijos = [
      { tipo: 'historia_clinica_fija', clave: 'altura', valor: turno.historia_clinica.altura ? turno.historia_clinica.altura.toString() : '' },
      { tipo: 'historia_clinica_fija', clave: 'peso', valor: turno.historia_clinica.peso ? turno.historia_clinica.peso.toString() : '' },
      { tipo: 'historia_clinica_fija', clave: 'temperatura', valor: turno.historia_clinica.temperatura ? turno.historia_clinica.temperatura.toString() : '' },
      { tipo: 'historia_clinica_fija', clave: 'presion', valor: turno.historia_clinica.presion ? turno.historia_clinica.presion.toString() : '' }
    ];

    let indiceCampoFijo;
    for (indiceCampoFijo = 0; indiceCampoFijo < camposFijos.length; indiceCampoFijo++) {
      let campoFijoActual = camposFijos[indiceCampoFijo];
      if (campoFijoActual.valor.toLowerCase().indexOf(termino) !== -1) {
      coincidencias.push({ tipo: "historia_clinica_fija", campo: campoFijoActual.clave, valor: campoFijoActual.valor });
      }
    }

    if (turno.historia_clinica.datos_dinamicos) {
      let indiceDato;
      for (indiceDato = 0; indiceDato < turno.historia_clinica.datos_dinamicos.length; indiceDato++) {
        let datoActual = turno.historia_clinica.datos_dinamicos[indiceDato];
        let clave = datoActual.clave || 'sin clave';
        let valor = datoActual.valor || 'sin valor';

        if (clave.toLowerCase().indexOf(termino) !== -1 || valor.toLowerCase().indexOf(termino) !== -1) {
          coincidencias.push({ tipo: 'historia_clinica_dinamica', campo: clave, valor: valor });
        }
      }
    }

    return coincidencias;
  }

  private obtenerNombreDelCampo(tipo: string): string {
    if (tipo === 'paciente') return 'Paciente';
    if (tipo === 'especialista') return 'Especialista';
    if (tipo === 'especialidad') return 'Especialidad';
    if (tipo === 'historia_clinica_fija') return 'Historia Clínica';
    if (tipo === 'historia_clinica_dinamica') return 'Dato Clínico';
    return tipo;
  }

  private obtenerValorOriginal(turno: TurnoExtendido, tipo: string): string {
    if (tipo === 'paciente') return (turno.pacientes ? turno.pacientes.nombre + ' ' + turno.pacientes.apellido : '');
    if (tipo === 'especialista') return (turno.especialistas ? turno.especialistas.nombre + ' ' + turno.especialistas.apellido : '');
    if (tipo === 'especialidad') return (turno.especialidades ? turno.especialidades.nombre : '');
    return '';
  }

  formatearEstadoParaMostrar(estado: string): string {
    if (!estado) return '';
    let estadoMinuscula = estado.toLowerCase();
    if (estadoMinuscula === 'solicitado') return 'Solicitado';
    if (estadoMinuscula === 'aceptado') return 'Aceptado';
    if (estadoMinuscula === 'realizado') return 'Realizado';
    if (estadoMinuscula === 'cancelado') return 'Cancelado';
    if (estadoMinuscula === 'rechazado') return 'Rechazado';
    return estado;
  }
}
