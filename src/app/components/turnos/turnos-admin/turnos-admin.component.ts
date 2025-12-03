import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { TurnoService } from '../../../services/turnos.service'; 

@Component({
  selector: 'app-turnos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent],
  templateUrl: './turnos-admin.component.html',
  styleUrls: ['./turnos-admin.component.scss'],
})
export class TurnosAdminComponent implements OnInit {

  turnos: any[] = [];
  turnosFiltrados: any[] = [];
  filtro: string = '';

  turnoSeleccionado: any = null;
  modalCancelar = false;
  comentarioCancelacion: string = '';
  guardando = false;
  error: string | null = null;

  constructor(private turnoSrv: TurnoService) {} // <-- inyectá el servicio

  async ngOnInit() {
    await this.cargarTurnos();
  }

  async cargarTurnos() {
    const { data, error } = await this.turnoSrv.obtenerTurnosEntreFechas('1900-01-01', '2100-01-01'); // <-- ejemplo usando servicio
    if (!error) {
      this.turnos = data || [];
      this.turnosFiltrados = data || [];
    }
  }

  aplicarFiltro() {
    const f = this.filtro.toLowerCase();
    this.turnosFiltrados = this.turnos.filter(t =>
      t.especialidades?.nombre?.toLowerCase().includes(f) ||
      `${t.especialistas?.nombre || ''} ${t.especialistas?.apellido || ''}`.toLowerCase().includes(f)
    );
  }

  puedeCancelar(t: any): boolean {
    const estado = t.estado?.toLowerCase().trim();
    return !['aceptado', 'realizado', 'rechazado', 'cancelado'].includes(estado);
  }

  abrirCancelar(turno: any) {
    this.turnoSeleccionado = turno;
    this.modalCancelar = true;
    this.comentarioCancelacion = '';
    this.error = null;
  }

  async confirmarCancelacion() {
    if (!this.comentarioCancelacion.trim()) {
      this.error = 'Por favor ingresá el motivo de la cancelación.';
      return;
    }

    this.guardando = true;
    this.error = null;

    try {
      const { error } = await this.turnoSrv.cancelarTurno(this.turnoSeleccionado.id, this.comentarioCancelacion);
      if (error) throw error;
      this.cerrarModal(true);
    } catch (err: any) {
      this.error = err.message || 'Error al cancelar el turno';
    } finally {
      this.guardando = false;
    }
  }

  cerrarModal(recargar: boolean = false) {
    this.modalCancelar = false;
    this.turnoSeleccionado = null;
    this.comentarioCancelacion = '';
    this.error = null;

    if (recargar) {
      this.cargarTurnos();
      this.aplicarFiltro();
    }
  }
}
