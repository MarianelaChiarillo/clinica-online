import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { TurnoService } from '../../../services/turnos.service';
import supabase from '../../../services/supabase.client';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import {HighlightCoincidenciaDirective} from '../../../directives/coincidencias.directive';
import {EstadoTurnoDirectiva} from '../../../directives/estados.directive'
@Component({
  selector: 'app-turnos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent, SpinnerComponent, HighlightCoincidenciaDirective, EstadoTurnoDirectiva],
  templateUrl: './turnos-admin.component.html',
  styleUrls: ['./turnos-admin.component.scss'],
})
export class TurnosAdminComponent implements OnInit, OnDestroy {
  turnos: any[] = [];
  turnosFiltrados: any[] = [];
  filtro: string = '';
  cargando = false;

  turnoSeleccionado: any = null;
  modalCancelar = false;
  comentarioCancelacion: string = '';
  guardando = false;
  error: string | null = null;

  private canalRealtime: any; // Canal Realtime

  constructor(private turnoSrv: TurnoService) {}

  async ngOnInit() {
    this.cargando  = true;
    await this.cargarTurnos();
    this.suscribirRealtime();
    this.cargando = false;
  }

  ngOnDestroy() {
    if (this.canalRealtime) this.canalRealtime.unsubscribe();
  }

  private suscribirRealtime() {
    this.canalRealtime = supabase
      .channel('turnos-admin')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'turnos',
        },
        async () => {
          console.log('Evento Realtime recibido: recargando turnos');
          await this.cargarTurnos();
          this.aplicarFiltro();
        }
      )
      .subscribe();
  }

  async cargarTurnos() {
    try {
      const { data, error } = await this.turnoSrv.obtenerTurnosEntreFechasConJoin(
        '1900-01-01',
        '2100-01-01'
      );

      if (error) {
        console.error('Error al cargar turnos:', error);
        return;
      }

      this.turnos = (data || []).map((t) => ({
        ...t,
        paciente: t.pacientes ?? { nombre: '', apellido: '' },
        especialista: t.especialistas ?? { nombre: '', apellido: '' },
        especialidad: t.especialidades ?? { nombre: '' },
      }));

      this.turnosFiltrados = [...this.turnos];
    } catch (err) {
      console.error('Excepción al cargar turnos:', err);
    }
  }

  aplicarFiltro() {
    const f = this.filtro.toLowerCase();
    this.turnosFiltrados = this.turnos.filter(
      (t) =>
        (t.especialidad?.nombre?.toLowerCase() || '').includes(f) ||
        `${t.especialista?.nombre || ''} ${t.especialista?.apellido || ''}`
          .toLowerCase()
          .includes(f)
    );
  }

  puedeCancelar(t: any): boolean {
    const estado = t.estado?.toLowerCase()?.trim() || '';
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
      const { error } = await this.turnoSrv.cancelarTurno(
        this.turnoSeleccionado.id,
        this.comentarioCancelacion
      );
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
