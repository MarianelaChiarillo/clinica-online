import { Component, OnInit } from '@angular/core';
import supabase from '../../../services/supabase.client';
import { CommonModule } from '@angular/common';
import { FiltroGeneralComponent } from '../../componentes/filtro-general/filtro-general.component';
import { CancelarTurnoModalComponent } from '../../componentes/modales/cancelar-turno-modal/cancelar-turno-modal.component';
import { ComentarioTurnoModalComponent } from '../../componentes/modales/comentario-turno-modal/comentario-turno-modal.component';
import { CalificarTurnoModalComponent } from '../../componentes/modales/calificar-turno-modal/calificar-turno-modal.component';
@Component({
  selector: 'app-turnos-paciente',
imports:[
  CommonModule,
  FiltroGeneralComponent,
  CancelarTurnoModalComponent,
  ComentarioTurnoModalComponent,
  CalificarTurnoModalComponent
],
  templateUrl: './turnos-paciente.component.html',
  styleUrls: ['./turnos-paciente.component.scss'],
})
export class PacienteMisTurnosComponent implements OnInit {

  cargando = false;
  turnos: any[] = [];
  turnosFiltrados: any[] = [];
  pacienteId!: number;
modalCancelar = false;
modalComentario = false;
modalCalificar = false;

turnoSeleccionado: any = null;

async ngOnInit() {
  this.cargando = true;

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // 1️⃣ obtener el paciente.id usando usuario.id
  const { data: paciente, error } = await supabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', usuario.id)
    .single();

  if (error || !paciente) {
    console.error("No se encontró paciente", error);
    this.cargando = false;
    return;
  }

  this.pacienteId = paciente.id;
  console.log("Paciente ID:", this.pacienteId);

  // 2️⃣ recién acá pedís los turnos
  await this.obtenerTurnos();

  this.cargando = false;

    this.suscribirRealtime();

}

  suscribirRealtime() {
  supabase
    .channel('turnos_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'turnos'
      },
      async (payload) => {
        console.log('Cambio detectado en turnos → ', payload);

        // Recargar lista automáticamente
        await this.obtenerTurnos();
      }
    )
    .subscribe();
}

  async obtenerTurnos() {
    this.cargando = true;

    const { data, error } = await supabase
      .from('turnos')
      .select(`
        id,
        paciente_id,
        especialista_id,
        especialidad_id,
        fecha_turno,
        hora_inicio,
        hora_fin,
        estado,
        comentario_cancelacion,
        comentario_rechazo,
        calificacion_atencion,
        comentario_calificacion,
        fecha_solicitud,
        id_encuesta,
        especialistas ( nombre, apellido ),
        especialidades ( nombre )
      `)
      .eq('paciente_id', this.pacienteId)
      .order('fecha_turno', { ascending: true });

    if (!error && data) {
      this.turnos = data;
      this.turnosFiltrados = data;
    }

    this.cargando = false;
  }

  // 🔵 FILTRO ÚNICO
  filtrar(valor: string) {
    const filtro = valor.toLowerCase();

    this.turnosFiltrados = this.turnos.filter(t =>
      t.especialidades?.nombre.toLowerCase().includes(filtro) ||
      `${t.especialistas?.nombre} ${t.especialistas?.apellido}`
        .toLowerCase()
        .includes(filtro)
    );
  }

  // 🟣 LÓGICA DE ACCIONES
  acciones(t: any): string[] {
    const acciones = [];

    // cancelar → solo si no fue realizado
    if (t.estado !== 'realizado') acciones.push('cancelar');

    // ver reseña → si tiene comentario del especialista o calificación
    if (t.comentario_calificacion || t.calificacion_atencion) {
      acciones.push('ver_resena');
    }

    // completar encuesta → si el especialista marcó como realizado
    if (t.estado === 'realizado' && !t.id_encuesta) {
      acciones.push('completar_encuesta');
    }

    // calificar → si está realizado y no calificó
    if (t.estado === 'realizado' && !t.calificacion_atencion) {
      acciones.push('calificar');
    }

    return acciones;
  }

  cancelar(t: any) {
  this.turnoSeleccionado = t;
  this.modalCancelar = true;
}

verComentario(t: any) {
  this.turnoSeleccionado = t;
  this.modalComentario = true;
}

calificar(t: any) {
  this.turnoSeleccionado = t;
  this.modalCalificar = true;
}

onModalClose(refrescar: boolean) {
  this.modalCancelar = false;
  this.modalComentario = false;
  this.modalCalificar = false;

  this.turnoSeleccionado = null;

  if (refrescar) {
    this.obtenerTurnos();   // 🔄 Actualiza turnos en pantalla
  }
}
completarEncuesta(t: any) {
  console.log("Abrir encuesta para el turno:", t.id);
  // acá después podríamos abrir un modal si lo deseas
}

}
