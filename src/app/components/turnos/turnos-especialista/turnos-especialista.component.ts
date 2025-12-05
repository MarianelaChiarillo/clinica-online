import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoExtendido } from '../../../models/turno';
import { ModalContainerComponent } from '../../componentes/modales/modal-container.component';
import supabase from '../../../services/supabase.client';
import { HistoriaClinicaService } from '../../../services/usuarios/historia-clinica.service';
import { AuthService } from '../../../services/auth.service';
import { UtilsService } from '../../../services/utils.service';
import { FiltroGeneralComponent } from '../../componentes/filtro-general/filtro-general.component';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { ModalService } from '../../../services/modal.service';
import { TurnoService } from '../../../services/turnos.service';
import { EspecialistaService } from '../../../services/usuarios/especialista.service';
import { FechaFormatoPipe } from '../../../pipes/fecha-formato.pipe';
import { AccionesTurnoDirective } from '../../../directives/acciones.directive';
import { AccionesTurnoPipe } from '../../../pipes/acciones.pipe';
import {HighlightCoincidenciaDirective} from '../../../directives/coincidencias.directive'
import {EstadoTurnoDirectiva} from '../../../directives/estados.directive'
import { SpinnerComponent } from '../../componentes/spinner/spinner.component';
@Component({
  selector: 'app-turnos-especialista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalContainerComponent,
    FiltroGeneralComponent,
    MenuComponent,
    FechaFormatoPipe,
    AccionesTurnoDirective,
    AccionesTurnoPipe,
    HighlightCoincidenciaDirective,
    EstadoTurnoDirectiva,
    SpinnerComponent
  ],
  templateUrl: './turnos-especialista.component.html',
  styleUrls: ['./turnos-especialista.component.scss'],
})
export class TurnosEspecialistaComponent implements OnInit, OnDestroy {
  turnos: TurnoExtendido[] = [];
  turnosFiltrados: TurnoExtendido[] = [];
  loading = false;
  error: string | null = null;
  private canalRealtime: any;
  cargando = false;

  constructor(
    private turnosService: TurnoService,
    private modalService: ModalService,
    private historiaClinicaService: HistoriaClinicaService,
    private authService: AuthService,
    private utilsService: UtilsService,
    private especialistaService: EspecialistaService
  ) {}

 async ngOnInit() {
      this.cargando = true;

  await this.esperarSesion();
  await this.cargarTurnos();
  this.suscribirRealtime();
  this.cargando = false;
}
filtroTexto: string = '';


  ngOnDestroy() {
    if (this.canalRealtime) this.canalRealtime.unsubscribe();
  }

onFiltroChange(filtroTexto: string) {
  this.filtroTexto = filtroTexto; // guardar el texto para resaltar coincidencias
  console.log('Filtro aplicado:', filtroTexto);
}

private async esperarSesion() {
  return new Promise<void>(async resolve => {
    const sesion = await supabase.auth.getSession();

    // Versión correcta
    if (sesion.data?.session?.user) {
      resolve();
      return;
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) resolve();
    });
  });
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
          await this.cargarTurnos();
        }
      )
      .subscribe();
  }

  async cargarTurnos() {
    this.loading = true;
    this.error = null;

    try {
      const especialista = await this.especialistaService.obtenerEspecialistaActual();
      if (!especialista) throw new Error('No se encontró el especialista actual');

      const turnosBase = await this.turnosService.obtenerTurnosDeEspecialista(especialista.id);

      this.turnos = (turnosBase.data || []).map(turno => ({
        ...turno,
        historia_clinica: undefined,
        coincidencias: []
      })) as TurnoExtendido[];

      await this.cargarHistoriasClinicas();
      this.turnosFiltrados = [...this.turnos];

    } catch (err) {
      console.error('❌ Error cargando turnos:', err);
      this.error = 'Error al cargar los turnos';
    } finally {
      this.loading = false;
    }
  }

  private async cargarHistoriasClinicas(): Promise<void> {
    const turnosRealizados = this.turnos.filter(t => t.estado === 'realizado');
    
    const promesas = turnosRealizados.map(async turno => {
      try {
        const historia = await this.historiaClinicaService.obtenerHistoriaClinicaPorTurno(turno.id);
        turno.historia_clinica = historia || null;
      } catch {
        turno.historia_clinica = null;
      }
    });

    await Promise.all(promesas);
  }

  onTurnosFiltradosChange(turnosFiltrados: TurnoExtendido[]) {
    this.turnosFiltrados = turnosFiltrados;
  }


  accionesEspecialista(t: TurnoExtendido): string[] {
    const estado = t.estado?.toLowerCase().trim();
    const acciones: string[] = [];

    if (estado === 'solicitado') acciones.push('aceptar', 'rechazar', 'cancelar');
    if (estado === 'aceptado') acciones.push('finalizar');
    if (t.comentario_especialista) acciones.push('ver_resena');

    return acciones;
  }

  async ejecutarAccion(accion: string, turno: TurnoExtendido) {
    let prom: any;
    switch (accion) {
      case 'aceptar': prom = this.modalService.abrirAceptarTurno(turno); break;
      case 'rechazar': prom = this.modalService.abrirRechazarTurno(turno); break;
      case 'cancelar': prom = this.modalService.abrirCancelarTurno(turno); break;
      case 'finalizar': prom = this.modalService.abrirFinalizarTurno(turno); break;
      case 'ver_resena': this.modalService.abrirComentarioTurno(turno); return;
    }

    const turnoActualizado = await prom;
    if (turnoActualizado) this.actualizarLocal(turnoActualizado);
  }

  private actualizarLocal(t: TurnoExtendido) {
    const index = this.turnos.findIndex(x => x.id === t.id);
    if (index !== -1) {
      this.turnos[index] = t;
      this.turnosFiltrados = [...this.turnos];
    }
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
    return this.utilsService.formatearEstadoParaMostrar(estado);
  }

  limpiarError() {
    this.error = null;
  }

  getTextoAccion(accion: string): string {
    const textos: any = {
      'aceptar': 'Aceptar',
      'rechazar': 'Rechazar', 
      'cancelar': ' Cancelar',
      'finalizar': 'Finalizar',
      'ver_resena': 'Ver Reseña'
    };
    return textos[accion] || accion;
  }
}