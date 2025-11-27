import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService, ModalData } from '../../../../services/modal.service';
import { TurnosService } from '../../../../services/turnos.service';
import { HistoriaClinicaFormComponent } from '../../../historia-clinica/historia-clinica.component';

@Component({
  selector: 'app-modal-container',
  standalone: true,
  imports: [CommonModule, FormsModule, HistoriaClinicaFormComponent],
  templateUrl: './modal-container.html',
  styleUrls: ['./modal-container.scss']
})
export class ModalContainerComponent implements OnInit {
  isOpen = false;
  modalData: ModalData | null = null;
  saving = false;
  error = '';
  
  // Campos del formulario
  comentario = '';
  calificacion = 0;
  crearEncuesta = false;
  encuestaRespuestas = {
    p1: '',
    p2: '',
    p3: '',
    observaciones: ''
  };

  constructor(
    private modalService: ModalService,
    private turnosService: TurnosService
  ) {}

  ngOnInit() {
    this.modalService.modal$.subscribe(data => {
      this.isOpen = !!data;
      this.modalData = data;
      this.resetForm();
    });
  }

  private resetForm() {
    this.comentario = '';
    this.calificacion = 0;
    this.crearEncuesta = false;
    this.encuestaRespuestas = { p1: '', p2: '', p3: '', observaciones: '' };
    this.error = '';
    this.saving = false;
  }

  // MÉTODO CORREGIDO - GUARDAR HISTORIA CLÍNICA + RESEÑA
async onHistoriaClinicaGuardada(resultado: any) {
  console.log('🔵 onHistoriaClinicaGuardada llamado con:', resultado);

  if (!resultado.success) {
    this.error = resultado.error;
    return;
  }

  this.saving = true;
  this.error = '';

  try {
    const comentario = resultado.comentario || 'Consulta completada';

    await this.turnosService.finalizarTurno(
      this.modalData!.turno.id,
      comentario
    );

    this.modalService.cerrarModal({
      success: true,
      historiaData: resultado.historia,
      tipo: 'historia-clinica',
      message: 'Turno finalizado e historia clínica guardada correctamente'
    });

  } catch (err: any) {
    console.error(err);
    this.error = 'Error guardando comentario del especialista: ' + err.message;
  } finally {
    this.saving = false;
  }
}


  validarBoton(): boolean {
    if (!this.modalData) return false;

    switch (this.modalData.tipo) {
      case 'cancelar':
      case 'rechazar':
        return !!this.comentario.trim();
      case 'calificar':
        return !!this.calificacion;
      case 'finalizar':
        return !!this.comentario.trim() || this.crearEncuesta;
      
      default:
        return true;
    }
  }

  getButtonText(): string {
    if (!this.modalData) return 'Confirmar';
    
    switch (this.modalData.tipo) {
      case 'aceptar': return 'Aceptar';
      case 'cancelar': return 'Cancelar';
      case 'rechazar': return 'Rechazar';
      case 'finalizar': return 'Finalizar';
      case 'calificar': return 'Calificar';
      default: return 'Confirmar';
    }
  }

  getButtonClass(): string {
    if (!this.modalData) return 'primary';
    
    switch (this.modalData.tipo) {
      case 'aceptar': return 'success';
      case 'cancelar': 
      case 'rechazar': return 'danger';
      case 'finalizar': return 'warning';
      case 'calificar': return 'info';
      default: return 'primary';
    }
  }

  async confirmarAccion() {
    if (!this.modalData) return;

    this.saving = true;
    this.error = '';

    try {
      let resultado;

      switch (this.modalData.tipo) {
        case 'aceptar':
          resultado = await this.turnosService.aceptarTurno(this.modalData.turno.id);
          break;
        case 'cancelar':
          resultado = await this.turnosService.cancelarTurno(this.modalData.turno.id, this.comentario);
          break;
        case 'rechazar':
          resultado = await this.turnosService.rechazarTurno(this.modalData.turno.id, this.comentario);
          break;
        case 'finalizar':
          // Este caso ya no se usa porque lo reemplazamos por historia-clínica
          resultado = await this.turnosService.finalizarTurno(this.modalData.turno.id, this.comentario);
          break;
        case 'calificar':
          resultado = await this.turnosService.calificarAtencion(this.modalData.turno.id, this.calificacion, this.comentario);
          break;
      }

      this.modalService.cerrarModal({ success: true, data: resultado });
      
    } catch (err: any) {
      this.error = err.message || 'Error al procesar la acción';
    } finally {
      this.saving = false;
    }
  }

  cerrarModal() {
    this.modalService.cerrarModal();
  }
}