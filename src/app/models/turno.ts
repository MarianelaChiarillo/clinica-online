export interface Turno {
  id: number;
  paciente_id: number;
  especialista_id: number;
  especialidad_id: number;
  fecha_turno: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'solicitado' | 'aceptado' | 'cancelado' | 'realizado' | 'rechazado';

  comentario_cancelacion?: string;
  comentario_rechazo?: string;
  comentario_especialista?: string;
  comentario_calificacion?: string;
  calificacion_atencion?: number;

  fecha_solicitud: string;
  id_encuesta?: number;

  especialistas?: any;
  especialidades?: any;
  pacientes?: any;
  encuestas?: any[];
}

export interface Coincidencia {
  tipo: 'paciente' | 'especialista' | 'especialidad' | 'estado' | 'fecha' | 'hora' | 'historia_clinica_fija' | 'historia_clinica_dinamica';
  campo: string;
  valor: string;
}

export interface TurnoExtendido extends Turno {
  historia_clinica?: any;
  coincidencias?: Coincidencia[];
}