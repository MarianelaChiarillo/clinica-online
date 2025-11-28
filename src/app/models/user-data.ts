export interface Usuario {
  id?: number;
  auth_id: string;
  email: string;
  tipo_usuario: 'paciente' | 'especialista' | 'administrador';
  estado: 'pendiente' | 'activo' | 'inactivo';
  fecha_creacion?: Date;
  fecha_verificacion?: Date;
  ultimo_ingreso?: Date;
  imagen_perfil?: string;
   nombre?: string;
  apellido?: string;
}

export interface Paciente extends Usuario {
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  tipo_usuario: 'paciente';
  obra_social?: string;
  segunda_imagen?: string;
}

export interface Especialista extends Usuario {
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  tipo_usuario: 'especialista';
  aprobado: boolean;
  especialidades?: Especialidad[];
}

export interface Administrador extends Usuario {
   nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  tipo_usuario: 'administrador';
}

export interface Especialidad {
  id: number;
  nombre: string;
  activo: boolean;
}


// models/user-data.ts
export interface LogIngreso {
  id: number;
  usuario_email: string;
  fecha_ingreso: string;
  ip_address?: string;
}

// Interfaces para datos crudos de Supabase (con relaciones como arrays)
export interface TurnoRaw {
  id: number;
  estado: string;
  fecha_turno: string;
  especialidad_id?: number;
  especialista_id?: number;
  especialidades?: { nombre: string }[] | null; // Array, no objeto simple
  especialistas?: { nombre: string; apellido: string }[] | null; // Array, no objeto simple
}

// Interface para datos procesados (opcional, si necesitas transformarlos)
export interface TurnoProcesado {
  id: number;
  estado: string;
  fecha_turno: string;
  especialidad?: string;
  medico?: string;
}

export interface EstadisticaEspecialidad {
  especialidad: string;
  cantidad: number;
}

export interface EstadisticaDia {
  fecha: string;
  cantidad: number;
}

export interface EstadisticaMedico {
  medico: string;
  cantidad: number;
}