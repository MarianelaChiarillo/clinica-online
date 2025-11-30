import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import supabase from '../../../services/supabase.client';
import { MenuComponent } from '../../componentes/menu/menu.component';
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

  async ngOnInit() {
    await this.cargarTurnos();
  }

  async cargarTurnos() {
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        *,
        pacientes(id, nombre, apellido),
        especialistas(id, nombre, apellido),
        especialidades(id, nombre)
      `)
      .order("fecha_turno");

    if (!error) {
      this.turnos = data;
      this.turnosFiltrados = data;
    }
  }

  aplicarFiltro() {
    const f = this.filtro.toLowerCase();

    this.turnosFiltrados = this.turnos.filter(t =>
      t.especialidades.nombre.toLowerCase().includes(f) ||
      `${t.especialistas.nombre} ${t.especialistas.apellido}`.toLowerCase().includes(f)
    );
  }

 puedeCancelar(t: any): boolean {
  const estado = t.estado?.toLowerCase().trim();
  const puede = estado !== 'aceptado' &&
                estado !== 'realizado' &&
                estado !== 'rechazado' &&
                estado !== 'cancelado';
  
  console.log(`Turno ${t.id} - Estado: ${estado} - Puede cancelar: ${puede}`);
  return puede;
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
      const { error } = await supabase
        .from('turnos')
        .update({
          estado: 'cancelado',
          comentario_cancelacion: this.comentarioCancelacion
        })
        .eq('id', this.turnoSeleccionado.id);

      if (error) throw error;

      this.cerrarModal(true);
      
    } catch (error: any) {
      this.error = error.message || 'Error al cancelar el turno';
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