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