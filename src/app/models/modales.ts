export interface ModalData {
  tipo: 'aceptar' | 'cancelar' | 'rechazar' | 'finalizar' | 'comentario' | 'calificar' | 'historia-clinica'; 
  turno: any;
  titulo?: string;
  mensaje?: string;
  requiereComentario?: boolean;
  requiereCalificacion?: boolean;
  mostrarEncuesta?: boolean;
  mostrarHistoriaClinica?: boolean;
}
