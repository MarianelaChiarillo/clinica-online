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

// En models/historia-clinica.ts
export interface DatoDinamico {
  id?: number;
  historia_clinica_id?: number;
  clave: string;
  tipo_control: 'texto' | 'rango' | 'numerico' | 'switch';
  
  // Campos según tipo
  valor?: string;          // Para texto o valor general
  valor_rango?: number;    // Para rango (0-100)
  valor_numerico?: number; // Para numérico
  valor_switch?: boolean;  // Para switch
  
  // Campo temporal para formulario (puede eliminarse)
  valor_texto?: string;
  
  created_at?: string;
  valor_mostrar?: string; // Para mostrar en UI
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