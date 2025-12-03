import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ModalService } from '../../../services/modal.service';
import { TurnoService } from '../../../services/turnos.service';

import { HistoriaClinicaFormComponent } from '../../historia-clinica/historia-clinica.component';

import { ModalData } from '../../../models/modales';

@Component({
  selector: 'app-modal-container',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HistoriaClinicaFormComponent  
  ],
  templateUrl: './modal-container.html',
  styleUrls: ['./modal-container.scss']
})
export class ModalContainerComponent implements OnInit {

  abierto = false;
  datosModal: ModalData | null = null;

  cargando = false;
  error = '';

  comentario = '';
  calificacion = 0;

  crearEncuesta = false;
  encuestaRespuestas = {
    pregunta1: '',
    pregunta2: '',
    pregunta3: '',
    observaciones: ''
  };

  constructor(
    private modalService: ModalService,
    private turnosService: TurnoService
  ) {}

  ngOnInit() {
    this.modalService.modal.subscribe(data => {
      this.abierto = !!data;
      this.datosModal = data;
      this.limpiarFormulario();
    });
  }

  private limpiarFormulario() {
    this.error = '';
    this.cargando = false;
    this.comentario = '';
    this.calificacion = 0;
    this.crearEncuesta = false;
    this.encuestaRespuestas = { pregunta1: '', pregunta2: '', pregunta3: '', observaciones: '' };
  }

  async guardarHistoriaClinica(resultado: any) {
    if (!resultado.success) {
      this.error = resultado.error;
      return;
    }

    this.cargando = true;
    this.error = '';

    try {
      const comentario = resultado.comentario || 'Consulta finalizada';

      await this.turnosService.finalizarTurno(
        this.datosModal!.turno.id,
        comentario
      );

      this.modalService.cerrarModal({
        success: true,
        historiaData: resultado.historia,
        tipo: 'historia-clinica'
      });

    } catch (err: any) {
      this.error = 'Error guardando historia clínica: ' + err.message;
    } finally {
      this.cargando = false;
    }
  }

  botonHabilitado(): boolean {
    if (!this.datosModal) return false;

    switch (this.datosModal.tipo) {
      case 'cancelar':
      case 'rechazar':
        return this.comentario.trim().length > 0;

      case 'calificar':
        return this.calificacion > 0;

      case 'finalizar':
        return this.comentario.trim().length > 0 || this.crearEncuesta;

      default:
        return true;
    }
  }

  textoBoton(): string {
    if (!this.datosModal) return 'Confirmar';

    switch (this.datosModal.tipo) {
      case 'aceptar': return 'Aceptar';
      case 'cancelar': return 'Cancelar';
      case 'rechazar': return 'Rechazar';
      case 'finalizar': return 'Finalizar';
      case 'calificar': return 'Calificar';
      default: return 'Confirmar';
    }
  }

  claseBoton(): string {
    if (!this.datosModal) return 'primary';

    switch (this.datosModal.tipo) {
      case 'aceptar': return 'success';
      case 'cancelar':
      case 'rechazar': return 'danger';
      case 'finalizar': return 'warning';
      case 'calificar': return 'info';
      default: return 'primary';
    }
  }

  async confirmar() {
    if (!this.datosModal) return;

    this.cargando = true;
    this.error = '';

    try {
      let resultado: any = null;

      switch (this.datosModal.tipo) {
        case 'aceptar':
          resultado = await this.turnosService.actualizarTurnoEstado(
            this.datosModal.turno.id,
            'aceptado'
          );
          break;

        case 'cancelar':
          resultado = await this.turnosService.cancelarTurno(
            this.datosModal.turno.id,
            this.comentario
          );
          break;

        case 'rechazar':
          resultado = await this.turnosService.rechazarTurno(
            this.datosModal.turno.id,
            this.comentario
          );
          break;

        case 'finalizar':
          resultado = await this.turnosService.finalizarTurno(
            this.datosModal.turno.id,
            this.comentario
          );
          break;

        case 'calificar':
          resultado = await this.turnosService.calificarAtencion(
            this.datosModal.turno.id,
            this.calificacion
          );
          break;
      }

      this.modalService.cerrarModal({ success: true, data: resultado });

    } catch (err: any) {
      this.error = err.message || 'Error al realizar la acción';
    } finally {
      this.cargando = false;
    }
  }

  cerrar() {
    this.modalService.cerrarModal();
  }
}
