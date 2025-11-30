import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiltroGeneralComponent } from '../../componentes/filtro-general/filtro-general.component';
import { ModalContainerComponent } from '../../componentes/modales/modal-container/modal-container.component';
import { EncuestaModalComponent } from '../../encuesta/encuesta.component';
import { ModalService } from '../../../services/modal.service';
import { TurnosService } from '../../../services/turnos.service';
import supabase from '../../../services/supabase.client';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { HistoriaClinicaService } from '../../../services/usuarios/historia-clinica.service';
import { TurnoExtendido } from '../../../models/turno';
import { FiltroService } from '../../../services/usuarios/filtro.service';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
@Component({
  selector: 'app-turnos-paciente',
  standalone: true,
  imports: [
    CommonModule,
    FiltroGeneralComponent,
    ModalContainerComponent,
    EncuestaModalComponent,
    MenuComponent,
    SpinnerComponent,
  ],
  templateUrl: './turnos-paciente.component.html',
  styleUrls: ['./turnos-paciente.component.scss'],
})
export class PacienteMisTurnosComponent implements OnInit, OnDestroy {
  cargando = false;
  turnos: TurnoExtendido[] = [];
  turnosFiltrados: TurnoExtendido[] = [];

  mostrarEncuestaModal = false;
  turnoSeleccionado: any = null;

  private canalRealtime: any;

  constructor(
    private modalService: ModalService,
    private turnosService: TurnosService,
    private historiaClinicaService: HistoriaClinicaService,
    private filtroService: FiltroService
  ) {}

  async ngOnInit() {
    this.cargando = true;
    await this.obtenerTurnos();
    this.escucharRealtime();
    this.cargando = false;
  }

  ngOnDestroy() {
    if (this.canalRealtime) this.canalRealtime.unsubscribe();
  }

  escucharRealtime() {
    this.canalRealtime = supabase
      .channel('turnos-paciente')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turnos',
        },
        async (payload) => {
          await this.obtenerTurnos();
        }
      )
      .subscribe();
  }

  async obtenerTurnos() {
    this.cargando = true;
    const turnosBase = await this.turnosService.obtenerTurnosDelPacienteActual();

    this.turnos = turnosBase.map((turno) => ({
      ...turno,
      historia_clinica: undefined,
      coincidencias: [],
    })) as TurnoExtendido[];

    await this.cargarHistoriasClinicas();

    this.turnosFiltrados = [...this.turnos];
    this.cargando = false;
  }

  private async cargarHistoriasClinicas(): Promise<void> {
    const turnosRealizados = this.turnos.filter((t) => t.estado === 'realizado');

    const promesas = turnosRealizados.map(async (turno) => {
      try {
        const historia = await this.historiaClinicaService.obtenerHistoriaClinicaPorTurno(turno.id);
        turno.historia_clinica = historia;
      } catch (error) {
        console.error(`Error cargando historia clínica para turno ${turno.id}:`, error);
        turno.historia_clinica = null;
      }
    });

    await Promise.all(promesas);
  }

  onTurnosFiltradosChange(turnosFiltrados: TurnoExtendido[]) {
    this.turnosFiltrados = turnosFiltrados;
  }

  onFiltroChange(filtroTexto: string) {
    console.log('Filtro aplicado:', filtroTexto);
  }

  acciones(t: TurnoExtendido): string[] {
    const acciones = [];

    if (t.estado !== 'realizado') {
      acciones.push('cancelar');
    } else {
      if (Array.isArray(t.encuestas) && t.encuestas.length === 0) {
        acciones.push('completar_encuesta');
      }

      if (!t.calificacion_atencion) {
        acciones.push('calificar');
      }

      if (t.comentario_especialista?.trim()) {
        acciones.push('ver_resena');
      }
    }

    console.log('Turno', t.id, '- Acciones:', acciones, '- Encuestas:', t.encuestas);
    return acciones;
  }

  async ejecutarAccion(accion: string, turno: TurnoExtendido) {
    let prom: any;

    switch (accion) {
      case 'cancelar':
        prom = this.modalService.abrirCancelarTurno(turno);
        break;
      case 'ver_resena':
        this.modalService.abrirComentarioTurno(turno);
        return;
      case 'calificar':
        prom = this.modalService.abrirCalificarTurno(turno);
        break;
      case 'completar_encuesta':
        this.abrirEncuestaModal(turno);
        return;
    }

    const res = await prom;
    if (res) await this.obtenerTurnos();
  }

  abrirEncuestaModal(turno: TurnoExtendido) {
    this.turnoSeleccionado = turno;
    this.mostrarEncuestaModal = true;
  }

  cerrarEncuestaModal(encuestaCompletada: boolean) {
    this.mostrarEncuestaModal = false;
    this.turnoSeleccionado = null;

    if (encuestaCompletada) {
      this.obtenerTurnos();
    }
  }

  getTextoAccion(accion: string): string {
    const textos: any = {
      cancelar: 'Cancelar',
      completar_encuesta: 'Completar Encuesta',
      calificar: 'Calificar',
      ver_resena: 'Ver Reseña',
    };
    return textos[accion] || accion;
  }

  // Métodos públicos para el template
  formatearEstado(estado: string): string {
    return this.filtroService.formatearEstado(estado);
  }

  formatearFecha(fecha: string): string {
    return this.filtroService.formatearFecha(fecha);
  }

  formatearHora(hora: string): string {
    return this.filtroService.formatearHora(hora);
  }
}
