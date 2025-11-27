import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnosService } from '../../../services/turnos.service';
import { ModalService } from '../../../services/modal.service';
import { Turno } from '../../../models/turno';
import { ModalContainerComponent } from '../../componentes/modales/modal-container/modal-container.component';
import supabase from '../../../services/supabase.client';

@Component({
  selector: 'app-turnos-especialista',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalContainerComponent],
  templateUrl: './turnos-especialista.component.html',
  styleUrls: ['./turnos-especialista.component.scss'],
})
export class TurnosEspecialistaComponent implements OnInit, OnDestroy {
  turnos: Turno[] = [];
  turnosFiltrados: Turno[] = [];
  filtro = '';

  loading = false;
  error: string | null = null;

  private canalRealtime: any;

  constructor(
    private turnosService: TurnosService,
    private modalService: ModalService
  ) {}

  async ngOnInit() {
    await this.cargarTurnos();
    this.suscribirRealtime();
  }

  ngOnDestroy() {
    if (this.canalRealtime) this.canalRealtime.unsubscribe();
  }

  suscribirRealtime() {
    this.canalRealtime = supabase
      .channel('turnos-especialista')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turnos'
        },
        async () => {
          await this.cargarTurnos(); // ← refresca en tiempo real
        }
      )
      .subscribe();
  }

  async cargarTurnos() {
    this.loading = true;
    this.error = null;

    try {
      this.turnos = await this.turnosService.obtenerTurnosDelEspecialistaActual();
      this.turnosFiltrados = [...this.turnos];
    } catch (err) {
      this.error = 'Error al cargar los turnos';
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltro() {
    const f = this.filtro.toLowerCase().trim();
    if (!f) {
      this.turnosFiltrados = [...this.turnos];
      return;
    }

    this.turnosFiltrados = this.turnos.filter(t =>
      t.pacientes?.nombre?.toLowerCase().includes(f) ||
      t.pacientes?.apellido?.toLowerCase().includes(f) ||
      t.especialidades?.nombre?.toLowerCase().includes(f) ||
      `${t.pacientes?.nombre} ${t.pacientes?.apellido}`.toLowerCase().includes(f) ||
      t.estado?.toLowerCase().includes(f)
    );
  }

  limpiarFiltro() {
    this.filtro = '';
    this.turnosFiltrados = [...this.turnos];
  }

  accionesEspecialista(t: Turno): string[] {
    const estado = t.estado?.toLowerCase().trim();
    const acciones: string[] = [];

    if (estado === 'solicitado') {
      acciones.push('aceptar', 'rechazar', 'cancelar');
    }
    if (estado === 'aceptado') {
      acciones.push('finalizar');
    }

      if (t.comentario_especialista) {
    acciones.push('ver_resena');
  }
    return acciones;
  }

  async ejecutarAccion(accion: string, turno: Turno) {
    let prom: any;

    switch (accion) {
      case 'aceptar':
        prom = this.modalService.abrirAceptarTurno(turno);
        break;
      case 'rechazar':
        prom = this.modalService.abrirRechazarTurno(turno);
        break;
      case 'cancelar':
        prom = this.modalService.abrirCancelarTurno(turno);
        break;
      case 'finalizar':
        prom = this.modalService.abrirFinalizarTurno(turno);
        break;
      case 'ver_resena':
        this.modalService.abrirComentarioTurno(turno);
        return;
    }

    const turnoActualizado = await prom;
    if (turnoActualizado) this.actualizarLocal(turnoActualizado);
  }

  private actualizarLocal(t: Turno) {
    const index = this.turnos.findIndex(x => x.id === t.id);
    if (index !== -1) {
      this.turnos[index] = t;
      this.turnosFiltrados = [...this.turnos];
    }
  }

  formatearFecha(fecha: string) {
    return fecha ? new Date(fecha).toLocaleDateString('es-AR') : '';
  }

  formatearHora(hora: string) {
    return hora ? hora.substring(0, 5) : '';
  }

  obtenerColorEstado(estado: string) {
    const map: any = {
      solicitado: 'warning',
      aceptado: 'info',
      realizado: 'success',
      cancelado: 'danger',
      rechazado: 'secondary'
    };
    return map[estado?.toLowerCase()] || 'secondary';
  }

  obtenerTextoEstado(estado: string) {
    const map: any = {
      solicitado: 'Solicitado',
      aceptado: 'Aceptado',
      realizado: 'Realizado',
      cancelado: 'Cancelado',
      rechazado: 'Rechazado'
    };
    return map[estado?.toLowerCase()] || estado;
  }

  limpiarError() {
    this.error = null;
  }
}



  
