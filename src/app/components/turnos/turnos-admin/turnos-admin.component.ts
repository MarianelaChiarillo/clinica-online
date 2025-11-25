import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import supabase from '../../../services/supabase.client';
import { CancelarTurnoModalComponent } from '../../componentes/modales/cancelar-turno-modal/cancelar-turno-modal.component';

@Component({
  selector: 'app-turnos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, CancelarTurnoModalComponent],
  templateUrl: './turnos-admin.component.html',
  styleUrls: ['./turnos-admin.component.scss'],
})
export class TurnosAdminComponent implements OnInit {

  turnos: any[] = [];
  turnosFiltrados: any[] = [];
  filtro: string = '';

  turnoSeleccionado: any = null;
  modalCancelar = false;

  async ngOnInit() {
    await this.cargarTurnos();
  }

  // Cargar todos los turnos
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

  // Filtro único (por especialista y especialidad)
  aplicarFiltro() {
    const f = this.filtro.toLowerCase();

    this.turnosFiltrados = this.turnos.filter(t =>
      t.especialidades.nombre.toLowerCase().includes(f) ||
      `${t.especialistas.nombre} ${t.especialistas.apellido}`.toLowerCase().includes(f)
    );
  }

  // Mostrar botón cancelar según estado
puedeCancelar(t: any): boolean {
  const estado = t.estado?.toLowerCase().trim();

  return (
    estado !== 'aceptado' &&
    estado !== 'realizado' &&
    estado !== 'rechazado'
  );
}

  abrirCancelar(turno: any) {
    this.turnoSeleccionado = turno;
    this.modalCancelar = true;
  }

async cerrarModal(event?: boolean) {
  this.modalCancelar = false;
  this.turnoSeleccionado = null;

  if (event === true) {
    await this.cargarTurnos();  // 🔥 Estado actualizado
    this.aplicarFiltro();       // 🔥 Filtro actualizado
  }
}


}


