import { Injectable } from '@angular/core';
import { TurnoExtendido, Coincidencia } from '../models/turno';
import { FormGroup } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class UtilsService {
  // Métodos para manejo de archivos (se mantienen igual)
  handleFileChange(event: any, form: FormGroup, controlName: string) {
    const archivo = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (archivo) form.get(controlName)?.setValue(archivo);
    return { archivo, nombreArchivo: archivo?.name || null };
  }

  quitarArchivo(form: FormGroup, controlName: string) {
    form.get(controlName)?.setValue(null);
  }

  markAllAsTouched(form: FormGroup) {
    Object.values(form.controls).forEach((control) => control.markAsTouched());
  }

  // Método principal de filtrado MODIFICADO
  aplicarFiltroATurnos(
    turnos: TurnoExtendido[],
    terminoBusqueda: string,
    tipoUsuario: 'paciente' | 'especialista'
  ): TurnoExtendido[] {
    const terminoLimpio = terminoBusqueda.trim().toLowerCase();
    const turnosFiltrados: TurnoExtendido[] = [];

    // Separar en términos individuales
    const terminosSeparados = this.separarTerminos(terminoLimpio);

    for (const turno of turnos) {
      turno.coincidencias = [];

      if (!terminoLimpio) {
        turnosFiltrados.push(turno);
        continue;
      }

      // Buscar coincidencias
      const coincidenciasBasicas = this.buscarCoincidenciasBasicas(
        turno,
        terminosSeparados,
        tipoUsuario
      );
      const coincidenciasHistoria = this.buscarCoincidenciasHistoriaClinica(turno, terminosSeparados);
      const todasCoincidencias = [...coincidenciasBasicas, ...coincidenciasHistoria];

      if (todasCoincidencias.length > 0) {
        turno.coincidencias = todasCoincidencias;
        turnosFiltrados.push(turno);
      }
    }

    return turnosFiltrados;
  }

  // Nueva función para separar términos inteligentemente
  private separarTerminos(termino: string): string[] {
    return termino
      .trim()
      .split(/\s+/) // Divide por espacios
      .filter(t => t.length > 0); // Elimina términos vacíos
  }

  // Búsqueda en campos básicos del turno MODIFICADO para aceptar array
  private buscarCoincidenciasBasicas(
    turno: TurnoExtendido,
    terminos: string[], // Cambiado a array
    tipoUsuario: 'paciente' | 'especialista'
  ): Coincidencia[] {
    const coincidencias: Coincidencia[] = [];

    for (const termino of terminos) {
      const terminoLimpio = termino.toLowerCase().trim();

      // Búsqueda por persona (paciente o especialista)
      if (tipoUsuario === 'paciente') {
        this.buscarEnPersona(turno.especialistas, 'especialista', coincidencias, terminoLimpio);
      } else {
        this.buscarEnPersona(turno.pacientes, 'paciente', coincidencias, terminoLimpio);
      }

      // Búsqueda por especialidad
      if (turno.especialidades?.nombre?.toLowerCase().includes(terminoLimpio)) {
        coincidencias.push({
          tipo: 'especialidad',
          campo: 'Especialidad',
          valor: turno.especialidades.nombre,
        });
      }

      // Búsqueda por estado
      if (turno.estado?.toLowerCase().includes(terminoLimpio)) {
        coincidencias.push({
          tipo: 'estado',
          campo: 'Estado',
          valor: turno.estado,
        });
      }

      // Búsqueda por fecha
      if (turno.fecha_turno) {
        const fechaFormateada = new Date(turno.fecha_turno).toLocaleDateString('es-AR');
        if (fechaFormateada.toLowerCase().includes(terminoLimpio)) {
          coincidencias.push({
            tipo: 'fecha',
            campo: 'Fecha',
            valor: fechaFormateada,
          });
        }
      }

      // Búsqueda por hora
      if (
        turno.hora_inicio?.toLowerCase().includes(terminoLimpio) ||
        turno.hora_fin?.toLowerCase().includes(terminoLimpio)
      ) {
        coincidencias.push({
          tipo: 'hora',
          campo: 'Hora',
          valor: `${turno.hora_inicio} - ${turno.hora_fin}`,
        });
      }
    }

    return coincidencias;
  }

  // Método auxiliar para buscar en personas (se mantiene igual)
private buscarEnPersona(
  persona: any,
  tipo: string,
  coincidencias: Coincidencia[],
  termino: string
): void {
  if (!persona) return;

  const nombreCompleto = `${persona.nombre || ''} ${persona.apellido || ''}`.toLowerCase().trim();
  const nombreInvertido = `${persona.apellido || ''} ${persona.nombre || ''}`.toLowerCase().trim();

  // Solo agregar coincidencia una vez por persona
  if (nombreCompleto.includes(termino) || nombreInvertido.includes(termino)) {
    const yaExiste = coincidencias.some(
      c => c.tipo === tipo && c.valor === `${persona.nombre} ${persona.apellido}`
    );
    if (!yaExiste) {
      coincidencias.push({
        tipo: tipo as 'paciente' | 'especialista',
        campo: this.obtenerNombreCampo(tipo),
        valor: `${persona.nombre} ${persona.apellido}`,
      });
    }
  }
}


  // Búsqueda en historia clínica MODIFICADA
  private buscarCoincidenciasHistoriaClinica(
    turno: TurnoExtendido,
    terminos: string[]  // Cambiado a array de términos
  ): Coincidencia[] {
    const coincidencias: Coincidencia[] = [];

    if (!turno.historia_clinica || turno.estado !== 'realizado') return coincidencias;

    const filtroMedico = new FiltroMedicoService();

    for (const termino of terminos) {
      const terminoLimpio = termino.toLowerCase().trim();
      const esBusquedaUnidad = this.esBusquedaDeUnidadMedica(terminoLimpio);

      // Verificar si este término específico coincide con algún campo
      const coincidenciasParaTermino = this.buscarCoincidenciasParaTermino(
        turno.historia_clinica,
        terminoLimpio,
        filtroMedico,
        esBusquedaUnidad
      );
      
      coincidencias.push(...coincidenciasParaTermino);
    }

    return coincidencias;
  }

  // Nueva función para buscar coincidencias específicas por término
  private buscarCoincidenciasParaTermino(
    historiaClinica: any,
    termino: string,
    filtroMedico: FiltroMedicoService,
    esBusquedaUnidad: boolean
  ): Coincidencia[] {
    const coincidencias: Coincidencia[] = [];
    
    // Campos fijos
    const camposFijos = [
      { clave: 'altura', valor: historiaClinica.altura, unidad: 'cm', tipoBusqueda: 'altura' },
      { clave: 'peso', valor: historiaClinica.peso, unidad: 'kg', tipoBusqueda: 'peso' },
      { clave: 'temperatura', valor: historiaClinica.temperatura, unidad: '°C', tipoBusqueda: 'temperatura' },
      { clave: 'presion', valor: historiaClinica.presion, unidad: '', tipoBusqueda: 'presion' },
    ];

    for (const campo of camposFijos) {
      if (campo.valor) {
        const valorStr = campo.valor.toString();
        const valorConUnidad = campo.unidad ? `${valorStr} ${campo.unidad}` : valorStr;
        
        // Verificar coincidencia EXACTA o con unidad
        if (this.coincideExactamente(valorConUnidad, termino, campo.tipoBusqueda, filtroMedico)) {
          // Evitar duplicados
          const yaExiste = coincidencias.some(
            c => c.tipo === 'historia_clinica_fija' && c.campo === campo.clave
          );
          if (!yaExiste) {
            coincidencias.push({
              tipo: 'historia_clinica_fija',
              campo: campo.clave,
              valor: valorConUnidad,
            });
          }
        }
      }
    }

    // Datos dinámicos
    if (historiaClinica.datos_dinamicos) {
      for (const dato of historiaClinica.datos_dinamicos) {
        const clave = dato.clave || 'sin clave';
        const valor = dato.valor || 'sin valor';
        const valorStr = valor.toString();
        
        if (clave.toLowerCase().includes(termino) || valorStr.toLowerCase().includes(termino)) {
          // Evitar duplicados
          const yaExiste = coincidencias.some(
            c => c.tipo === 'historia_clinica_dinamica' && c.campo === clave && c.valor === valorStr
          );
          if (!yaExiste) {
            coincidencias.push({
              tipo: 'historia_clinica_dinamica',
              campo: clave,
              valor: valorStr,
            });
          }
        }
      }
    }

    return coincidencias;
  }






  

  // Nueva función para verificar coincidencias exactas
  private coincideExactamente(
    valorConUnidad: string,
    termino: string,
    tipoCampo: string,
    filtroMedico: FiltroMedicoService
  ): boolean {
    const valorLimpio = valorConUnidad.toLowerCase();
    const terminoLimpio = termino.toLowerCase();
    
    // 1. Coincidencia exacta (ej: "78 cm" === "78cm")
    const valorSinEspacios = valorLimpio.replace(/\s+/g, '');
    const terminoSinEspacios = terminoLimpio.replace(/\s+/g, '');
    
    if (valorSinEspacios.includes(terminoSinEspacios) || terminoSinEspacios.includes(valorSinEspacios)) {
      return true;
    }
    
    // 2. Coincidencia con filtro médico
    switch (tipoCampo) {
      case 'altura':
        return filtroMedico.coincideConAlturaExacta(valorConUnidad, termino);
      case 'peso':
        return filtroMedico.coincideConPesoExacta(valorConUnidad, termino);
      case 'temperatura':
        return filtroMedico.coincideConTemperaturaExacta(valorConUnidad, termino);
      case 'presion':
        return filtroMedico.coincideConPresionExacta(valorConUnidad, termino);
    }
    
    return false;
  }

  // Métodos auxiliares (mantener los existentes pero quitar el duplicado)
  private esBusquedaDeUnidadMedica(termino: string): boolean {
    const unidades = this.obtenerUnidadesMedicas();
    return unidades.some((unidad) => termino.includes(unidad));
  }

  private obtenerUnidadesMedicas(): string[] {
    return [
      'cm',
      'centimetro',
      'centímetro',
      'metros',
      'm',
      'kg',
      'kilo',
      'kilogramo',
      'gramos',
      'g',
      '°c',
      'celsius',
      'centigrado',
      'grados',
      'fahrenheit',
      'presion',
      'presión',
      'tension',
      'tensión',
      'mmhg',
      'ml',
      'mililitro',
      'litro',
      'l',
      'mg',
      'miligramo',
      'km',
      'kilometro',
    ];
  }

  private contieneUnidadEspecifica(termino: string, tipo: string): boolean {
    const mapUnidades: { [key: string]: string[] } = {
      altura: ['cm', 'centimetro', 'centímetro', 'metros', 'm', 'altura', 'talla', 'estatura'],
      peso: ['kg', 'kilo', 'kilogramo', 'gramos', 'g', 'peso'],
      temperatura: ['°c', 'celsius', 'centigrado', 'grados', 'temperatura', 'fiebre'],
      presion: ['presion', 'presión', 'tension', 'tensión', 'mmhg', 'presión arterial'],
    };

    const unidades = mapUnidades[tipo] || [];
    return unidades.some((unidad) => termino.includes(unidad));
  }

  private obtenerNombreCampo(tipo: string): string {
    const mapCampos: { [key: string]: string } = {
      paciente: 'Paciente',
      especialista: 'Especialista',
      especialidad: 'Especialidad',
      historia_clinica_fija: 'Historia Clínica',
      historia_clinica_dinamica: 'Dato Clínico',
    };
    return mapCampos[tipo] || tipo;
  }

  formatearEstadoParaMostrar(estado: string): string {
    if (!estado) return '';

    const mapEstados: { [key: string]: string } = {
      solicitado: 'Solicitado',
      aceptado: 'Aceptado',
      realizado: 'Realizado',
      cancelado: 'Cancelado',
      rechazado: 'Rechazado',
    };

    return mapEstados[estado.toLowerCase()] || estado;
  }
}

// Clase auxiliar para filtrado médico MODIFICADA
class FiltroMedicoService {
  // Métodos ORIGINALES (para búsqueda parcial)
  coincideConUnidadMedica(valor: any, busqueda: string, unidades: string[]): boolean {
    if (!valor) return false;

    const valorStr = valor.toString().toLowerCase();
    const busquedaLimpia = busqueda.toLowerCase().trim();

    if (valorStr.includes(busquedaLimpia)) return true;

    const numeroBusqueda = this.extraerNumero(busquedaLimpia);
    if (numeroBusqueda === null) return false;

    const numeroValor = this.extraerNumero(valorStr);
    if (numeroValor === null) return false;

    if (numeroValor.toString().includes(numeroBusqueda.toString())) return true;
    if (numeroValor === numeroBusqueda) return true;

    const tieneUnidad = unidades.some((unidad) => busquedaLimpia.includes(unidad));
    if (!tieneUnidad) return false;

    for (const unidad of unidades) {
      if (busquedaLimpia.includes(unidad)) {
        const busquedaSinUnidad = busquedaLimpia.replace(unidad, '').trim();
        const numeroSinUnidad = this.extraerNumero(busquedaSinUnidad);
        if (numeroSinUnidad !== null && numeroValor === numeroSinUnidad) {
          return true;
        }
      }
    }

    return false;
  }

  // Métodos NUEVOS (para búsqueda exacta)
  coincideConAlturaExacta(altura: any, busqueda: string): boolean {
    return this.coincideConUnidadMedicaExacta(altura, busqueda, ['cm', 'centimetro', 'centímetro']);
  }

  coincideConPesoExacta(peso: any, busqueda: string): boolean {
    return this.coincideConUnidadMedicaExacta(peso, busqueda, ['kg', 'kilo', 'kilogramo']);
  }

  coincideConTemperaturaExacta(temperatura: any, busqueda: string): boolean {
    return this.coincideConUnidadMedicaExacta(temperatura, busqueda, [
      '°c',
      'celsius',
      'centigrado',
      'grados',
    ]);
  }

  coincideConPresionExacta(presion: any, busqueda: string): boolean {
    if (!presion) return false;
    
    const presionStr = presion.toString().toLowerCase();
    const busquedaLimpia = busqueda.toLowerCase().trim();
    
    // Coincidencia exacta
    if (presionStr === busquedaLimpia) return true;
    
    const numeroPresion = this.extraerNumero(presionStr);
    const numeroBusqueda = this.extraerNumero(busquedaLimpia);
    
    if (numeroPresion !== null && numeroBusqueda !== null) {
      // Solo coincidir si los números son iguales
      if (numeroPresion !== numeroBusqueda) return false;
      
      // Verificar si la búsqueda incluye unidad de presión
      const tieneUnidadPresion = ['presion', 'presión', 'tension', 'tensión', 'mmhg']
        .some(u => busquedaLimpia.includes(u));
      
      // Si especifica unidad de presión, debe coincidir
      // Si no especifica unidad, solo coincidir por número
      return !tieneUnidadPresion || presionStr.includes('/');
    }
    
    return false;
  }

  // Método para búsqueda EXACTA
  private coincideConUnidadMedicaExacta(valor: any, busqueda: string, unidades: string[]): boolean {
    if (!valor) return false;

    const valorStr = valor.toString().toLowerCase();
    const busquedaLimpia = busqueda.toLowerCase().trim();
    
    // Coincidencia exacta (incluyendo espacios)
    if (valorStr === busquedaLimpia) return true;
    
    // Coincidencia sin espacios
    if (valorStr.replace(/\s+/g, '') === busquedaLimpia.replace(/\s+/g, '')) return true;
    
    const numeroValor = this.extraerNumero(valorStr);
    const numeroBusqueda = this.extraerNumero(busquedaLimpia);
    
    if (numeroValor === null || numeroBusqueda === null) {
      return valorStr.includes(busquedaLimpia) || busquedaLimpia.includes(valorStr);
    }
    
    // Solo coincidir si los números son IGUALES (no parciales)
    if (numeroValor !== numeroBusqueda) return false;
    
    // Verificar unidad
    const tieneUnidad = unidades.some((unidad) => 
      busquedaLimpia.includes(unidad) || 
      this.unidadesEquivalentes(unidad).some(u => busquedaLimpia.includes(u))
    );
    
    // Si especifica unidad, debe coincidir
    // Si no especifica unidad, solo coincidir por número
    return !tieneUnidad || unidades.some(u => {
      const unidadesEquiv = this.unidadesEquivalentes(u);
      return unidadesEquiv.some(ue => busquedaLimpia.includes(ue));
    });
  }

  // Método auxiliar para unidades equivalentes
  private unidadesEquivalentes(unidad: string): string[] {
    const equivalencias: {[key: string]: string[]} = {
      'cm': ['centimetro', 'centímetro', 'centimetros', 'centímetros'],
      'kg': ['kilo', 'kilogramo', 'kilos', 'kilogramos'],
      '°c': ['celsius', 'centigrado', 'grados celsius', 'grados centígrados'],
    };
    
    return equivalencias[unidad] || [];
  }

  // Métodos ORIGINALES (mantener compatibilidad)
  coincideConPeso(peso: any, busqueda: string): boolean {
    return this.coincideConUnidadMedica(peso, busqueda, ['kg', 'kilos', 'kilogramos', 'kgs']);
  }

  coincideConAltura(altura: any, busqueda: string): boolean {
    return this.coincideConUnidadMedica(altura, busqueda, ['cm', 'centimetros', 'centímetros']);
  }

  coincideConTemperatura(temperatura: any, busqueda: string): boolean {
    return this.coincideConUnidadMedica(temperatura, busqueda, [
      '°c',
      'c',
      'grados',
      'centigrados',
      'celsius',
      '°',
      'grados c',
      'grados celsius',
    ]);
  }

  coincideConPresion(presion: any, busqueda: string): boolean {
    if (!presion) return false;

    const presionStr = presion.toString().toLowerCase();
    const busquedaLimpia = busqueda.toLowerCase().trim();

    if (presionStr.includes(busquedaLimpia)) return true;

    const patronesPresion = ['/80', '120/80', '140/90', 'presion', 'presión', 'tension', 'tensión'];
    return patronesPresion.some(
      (patron) => busquedaLimpia.includes(patron) && presionStr.includes('/')
    );
  }

  contieneUnidad(texto: string, unidades: string[]): boolean {
    return unidades.some((unidad) => texto.toLowerCase().includes(unidad));
  }


  

  esBusquedaDeMedicion(texto: string): boolean {
    const mediciones = [
      'cm',
      'centimetro',
      'centímetro',
      'metros',
      'm',
      'kg',
      'kilo',
      'kilogramo',
      'gramos',
      'g',
      '°c',
      'celsius',
      'centigrado',
      'grados',
      'presion',
      'presión',
      'tension',
      'tensión',
      'mmhg',
      'ml',
      'mililitro',
      'litro',
      'l',
      'mg',
      'miligramo',
      'km',
      'kilometro',
      'altura',
      'peso',
      'temperatura',
      'presión',
    ];

    return this.contieneUnidad(texto, mediciones);
  }

  extraerNumero(texto: string): number | null {
    if (!texto) return null;
    const match = texto.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }
  
}