// interfaces/user.interface.ts

export interface UserBase {
  id?: string;
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  email: string;
  pass: string;
  imagenPerfil: string;
  authId?: string;
  created_at?: string;
  rol: 'paciente' | 'especialista' | 'admin';
}

export interface Paciente extends UserBase {
  obraSocial: string;
  imagenPerfil2: string; // Segunda imagen requerida para pacientes
  rol: 'paciente';
}

export interface Especialista extends UserBase {
  especialidad: string;
  especialidades?: string[]; // Para múltiples especialidades
  aprobado: boolean; // Para aprobación administrativa
  rol: 'especialista';
}

export type Usuario = Paciente | Especialista;