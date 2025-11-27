import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiltroGeneralComponent } from '../../componentes/filtro-general/filtro-general.component';
import { ModalContainerComponent } from '../../componentes/modales/modal-container/modal-container.component';
import { EncuestaModalComponent } from '../../encuesta/encuesta.component';
import { ModalService } from '../../../services/modal.service';
import { TurnosService } from '../../../services/turnos.service';
import supabase from '../../../services/supabase.client';

@Component({
  selector: 'app-turnos-paciente',
  standalone: true,
  imports: [
    CommonModule,
    FiltroGeneralComponent,
    ModalContainerComponent,
    EncuestaModalComponent
  ],
  templateUrl: './turnos-paciente.component.html',
  styleUrls: ['./turnos-paciente.component.scss'],
})
export class PacienteMisTurnosComponent implements OnInit, OnDestroy {

  cargando = false;
  turnos: any[] = [];
  turnosFiltrados: any[] = [];

  // Variables para controlar el modal de encuesta
  mostrarEncuestaModal = false;
  turnoSeleccionado: any = null;

  private canalRealtime: any;

  constructor(
    private modalService: ModalService,
    private turnosService: TurnosService
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
          table: 'turnos'
        },
        async payload => {
          await this.obtenerTurnos();
        }
      )
      .subscribe();
  }



  filtrar(valor: string) {
    const f = valor.toLowerCase();
    this.turnosFiltrados = this.turnos.filter(t =>
      t.especialidades?.nombre.toLowerCase().includes(f) ||
      `${t.especialistas?.nombre} ${t.especialistas?.apellido}`.toLowerCase().includes(f)
    );
  }

acciones(t: any): string[] {
  const acciones = [];

  if (t.estado !== 'realizado') {
    acciones.push('cancelar');
  } else {
    // Solo para turnos realizados
    
    // ENCUESTA: disponible si el array de encuestas está VACÍO
    if (Array.isArray(t.encuestas) && t.encuestas.length === 0) {
      acciones.push('completar_encuesta');
    }
    
    // CALIFICACIÓN: disponible si no tiene calificación
    if (!t.calificacion_atencion) {
      acciones.push('calificar');
    }

    // RESEÑA: disponible si hay comentario del especialista
    if (t.comentario_especialista?.trim()) {
      acciones.push('ver_resena');
    }
  }

  console.log('Turno', t.id, '- Acciones:', acciones, '- Encuestas:', t.encuestas);
  return acciones;
}

  async ejecutarAccion(accion: string, turno: any) {
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

  // Método para abrir el modal de encuesta
  abrirEncuestaModal(turno: any) {
    this.turnoSeleccionado = turno;
    this.mostrarEncuestaModal = true;
  }
  async obtenerTurnos() {
  this.cargando = true;
  this.turnos = await this.turnosService.obtenerTurnosDelPacienteActual();
  
  // DEBUG: Ver qué datos llegan
  console.log('Turnos obtenidos:', this.turnos);
  this.turnos.forEach((turno, index) => {
    console.log(`Turno ${index}:`, {
      id: turno.id,
      estado: turno.estado,
      tieneEncuesta: !!turno.encuestas,
      encuestas: turno.encuestas,
      calificacion_atencion: turno.calificacion_atencion,
      comentario_especialista: turno.comentario_especialista
    });
  });
  
  this.turnosFiltrados = [...this.turnos];
  this.cargando = false;
}

  // Método para cerrar el modal de encuesta
  cerrarEncuestaModal(encuestaCompletada: boolean) {
    this.mostrarEncuestaModal = false;
    this.turnoSeleccionado = null;
    
    // Si se completó la encuesta, refrescar los turnos
    if (encuestaCompletada) {
      this.obtenerTurnos();
    }
  }

  // Método opcional para mejor visualización de los botones
  getTextoAccion(accion: string): string {
    const textos: any = {
      'cancelar': '❌ Cancelar',
      'completar_encuesta': '📊 Completar Encuesta',
      'calificar': '⭐ Calificar',
      'ver_resena': '📝 Ver Reseña'
    };
    return textos[accion] || accion;
  }
}