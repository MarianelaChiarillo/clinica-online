export interface HistoriaClinica {
  id: number;
  turno_id: number;
  paciente_id: number;
  especialista_id: number;
  especialidad_id: number;
  altura: number;
  peso: number;
  temperatura: number;
  presion: string;
  fecha_creacion: Date;
  datos_dinamicos: DatoDinamico[]; 
}

export interface DatoDinamico {
  id?: number;
  historia_clinica_id?: number;
  clave: string;
  
  valor_texto?: string;
  
  tipo_control?: 'texto' | 'rango' | 'numerico' | 'switch';
  valor_rango?: number;     
  valor_numerico?: number;  
  valor_switch?: boolean;    
  
  valor_mostrar?: string;
}

export function obtenerValorDato(dato: DatoDinamico): string {
  if (!dato.tipo_control || dato.tipo_control === 'texto') {
    return dato.valor_texto || '';
  }
  
  switch (dato.tipo_control) {
    case 'rango':
      return `${dato.valor_rango}%`;
    case 'numerico':
      return dato.valor_numerico?.toString() || '';
    case 'switch':
      return dato.valor_switch ? 'Sí' : 'No';
    default:
      return dato.valor_texto || '';
  }
}