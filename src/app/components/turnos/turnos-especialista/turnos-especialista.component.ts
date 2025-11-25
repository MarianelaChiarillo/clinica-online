import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnosService } from '../../../services/turnos.service';
import { ModalService } from '../../../services/modal.service'; // ← NUEVO
import { Turno } from '../../../models/turno';
import { ModalContainerComponent } from '../../componentes/modales/modal-container/modal-container.component';
@Component({
  selector: 'app-turnos-especialista',
  standalone: true,
  templateUrl: './turnos-especialista.component.html',
  styleUrls: ['./turnos-especialista.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ModalContainerComponent // ← Este debe ser un componente standalone
  ]
})
export class TurnosEspecialistaComponent implements OnInit {
  turnos: Turno[] = [];
  turnosFiltrados: Turno[] = [];
  filtro: string = '';
  loading = false;
  error: string | null = null;

  constructor(
    private turnosService: TurnosService,
    private modalService: ModalService // ← Inyectar el servicio
  ) {}

  async ngOnInit() {
    await this.cargarTurnos();
    this.suscribirRealtime();
  }

  async cargarTurnos() {
    this.loading = true;
    this.error = null;
    
    try {
      this.turnos = await this.turnosService.obtenerTurnosDelEspecialistaActual();
      this.turnosFiltrados = this.turnos;
    } catch (error) {
      this.error = 'Error al cargar los turnos';
      console.error('Error cargando turnos:', error);
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltro() {
    const f = this.filtro.toLowerCase().trim();
    
    if (!f) {
      this.turnosFiltrados = this.turnos;
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
    this.turnosFiltrados = this.turnos;
  }

  accionesEspecialista(t: Turno): string[] {
    const estado = t.estado?.toLowerCase().trim();
    const acciones: string[] = [];

    if (estado === 'solicitado') {
      acciones.push('aceptar');
      acciones.push('rechazar');
      acciones.push('cancelar');
    }

    if (estado === 'aceptado') {
      acciones.push('finalizar');
    }

    const tieneComentario = 
      t.comentario_especialista || 
      t.comentario_calificacion || 
      t.calificacion_atencion ||
      t.comentario_cancelado ||
      t.comentario_rechazo;

    if (tieneComentario) {
      acciones.push('ver_resena');
    }

    return acciones;
  }

  // ✅ SIMPLIFICADO - Solo llamas al servicio modal
  ejecutarAccion(accion: string, turno: Turno) {
    switch (accion) {
      case 'aceptar':
        this.modalService.abrirAceptarTurno(turno);
        break;
      case 'rechazar':
        this.modalService.abrirRechazarTurno(turno);
        break;
      case 'cancelar':
        this.modalService.abrirCancelarTurno(turno);
        break;
      case 'finalizar':
        this.modalService.abrirFinalizarTurno(turno);
        break;
      case 'ver_resena':
        this.modalService.abrirComentarioTurno(turno);
        break;
    }
  }

  suscribirRealtime() {
    import('../../../services/supabase.client').then(({ default: supabase }) => {
      supabase
        .channel('turnos_especialista_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'turnos' },
          async () => {
            await this.cargarTurnos();
          }
        )
        .subscribe();
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-AR');
  }

  formatearHora(hora: string): string {
    if (!hora) return '';
    return hora.substring(0, 5);
  }

  obtenerColorEstado(estado: string): string {
    const colores: any = {
      'solicitado': 'warning',
      'aceptado': 'info',
      'realizado': 'success',
      'cancelado': 'danger',
      'rechazado': 'secondary'
    };
    return colores[estado?.toLowerCase()] || 'secondary';
  }

  obtenerTextoEstado(estado: string): string {
    const textos: any = {
      'solicitado': 'Solicitado',
      'aceptado': 'Aceptado',
      'realizado': 'Realizado',
      'cancelado': 'Cancelado',
      'rechazado': 'Rechazado'
    };
    return textos[estado?.toLowerCase()] || estado;
  }

  limpiarError() {
    this.error = null;
  }

  
}