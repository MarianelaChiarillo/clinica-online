import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiltroGeneralComponent } from '../../componentes/filtro-general/filtro-general.component';
import { ModalContainerComponent } from '../../componentes/modales/modal-container.component';
import { EncuestaModalComponent } from '../../encuesta/encuesta.component';
import { ModalService } from '../../../services/modal.service';
import { TurnoService } from '../../../services/turnos.service';
import supabase from '../../../services/supabase.client';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { HistoriaClinicaService } from '../../../services/usuarios/historia-clinica.service';
import { TurnoExtendido } from '../../../models/turno';
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
import { PacienteService } from '../../../services/usuarios/paciente.service';
import { UtilsService } from '../../../services/utils.service';
import { FechaFormatoPipe } from '../../../pipes/fecha-formato.pipe';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';

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
    FechaFormatoPipe
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
  textoFiltro: string = '';

  private canalRealtime: any;
  private authSubscription: Subscription | null = null;

  constructor(
    private modalService: ModalService,
    private turnosService: TurnoService,
    private historiaClinicaService: HistoriaClinicaService,
    private pacienteService: PacienteService,
    private utilsService: UtilsService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.cargando = true;

    this.authSubscription = this.authService.usuarioActual$.subscribe(async (usuario) => {
      if (usuario) {
        const paciente = await this.pacienteService.obtenerPacienteActual();
        if (!paciente) {
          console.warn('No hay paciente actual aún');
          this.turnos = [];
          this.turnosFiltrados = [];
          this.cargando = false;
          return;
        }

        await this.obtenerTurnos(paciente.id);
        this.escucharRealtime();
        this.cargando = false;
      } else {
        this.turnos = [];
        this.turnosFiltrados = [];
        this.cargando = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.canalRealtime) this.canalRealtime.unsubscribe();
    if (this.authSubscription) this.authSubscription.unsubscribe();
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
        async () => {
          const paciente = await this.pacienteService.obtenerPacienteActual();
          if (paciente) await this.obtenerTurnos(paciente.id);
        }
      )
      .subscribe();
  }

  async obtenerTurnos(pacienteId: number) {
    this.cargando = true;
    try {
      if (!pacienteId) return;

      const { data: turnosConDatos, error } = await this.turnosService.obtenerTurnosDePacienteConDatos(pacienteId);
      if (error) throw error;

      this.turnos = (turnosConDatos || []).map((turno) => ({
        ...turno,
        historia_clinica: undefined,
        coincidencias: [],
        especialista: turno.especialista ?? null,
        especialidad: turno.especialidad ?? null,
      })) as TurnoExtendido[];

  
      await this.cargarHistoriasClinicas();
      this.turnosFiltrados = [...this.turnos];

    } catch (error) {
      console.error('Error cargando turnos:', error);
    } finally {
      this.cargando = false;
    }
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
    this.textoFiltro = filtroTexto;
  }

  limpiarFiltro() {
    this.textoFiltro = '';
    this.turnosFiltrados = [...this.turnos];
    
    // Si tu componente FiltroGeneral tiene un método para limpiar, también deberías llamarlo
    // Podrías emitir un evento o usar ViewChild para acceder al componente directamente
  }

  // Añade esta función que falta
  getCoincidenciasTurno(turno: TurnoExtendido): string[] {
    if (!turno.coincidencias || turno.coincidencias.length === 0) {
      return [];
    }
    
    return turno.coincidencias.map(coincidencia => {
      return `${coincidencia.campo}: ${coincidencia.valor}`;
    });
  }

  // Función para resaltar texto (opcional)
  resaltarTexto(texto: string, termino: string): string {
    if (!texto || !termino) return texto;
    
    const regex = new RegExp(`(${termino})`, 'gi');
    return texto.replace(regex, '<mark class="texto-resaltado">$1</mark>');
  }

  // Verificar si un campo tiene coincidencias (opcional)
  campoTieneCoincidencia(turno: TurnoExtendido, campo: string): boolean {
    if (!turno.coincidencias) return false;
    return turno.coincidencias.some(coincidencia => 
      coincidencia.campo.toLowerCase().includes(campo.toLowerCase())
    );
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
    if (res) {
      const paciente = await this.pacienteService.obtenerPacienteActual();
      if (paciente) await this.obtenerTurnos(paciente.id);
    }
  }

  abrirEncuestaModal(turno: TurnoExtendido) {
    this.turnoSeleccionado = turno;
    this.mostrarEncuestaModal = true;
  }

  cerrarEncuestaModal(encuestaCompletada: boolean) {
    this.mostrarEncuestaModal = false;
    this.turnoSeleccionado = null;

    if (encuestaCompletada) {
      this.pacienteService.obtenerPacienteActual().then((paciente) => {
        if (paciente) this.obtenerTurnos(paciente.id);
      });
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

  formatearEstado(estado: string): string {
    return this.utilsService.formatearEstadoParaMostrar(estado);
  }
}