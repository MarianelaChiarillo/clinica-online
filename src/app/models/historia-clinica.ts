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
  id: number;
  historia_clinica_id: number;
  clave: string;
  valor: string;
}