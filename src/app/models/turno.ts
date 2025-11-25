// models/turno.model.ts
export interface Turno {
  id: number;
  paciente_id: number;
  especialista_id: number;
  especialidad_id: number;
  fecha_turno: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'aceptado' | 'cancelado' | 'realizado' | 'rechazado';
  comentario_cancelado?: string;
  comentario_especialista?: string;
  comentario_rechazo?: string;
  calificacion_atencion?: number;
  comentario_calificacion?: string;
  encuesta_completada?: string;
  fecha_solicitud: string;
  
  // Datos relacionados (joins)
  especialistas?: any;
  especialidades?: any;
  pacientes?: any;
}