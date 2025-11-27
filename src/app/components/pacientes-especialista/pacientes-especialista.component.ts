// pacientes-atendidos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';
import { TurnosService } from '../../services/turnos.service';
import { AuthService } from '../../services/auth.service';
import supabase from '../../services/supabase.client';

@Component({
  selector: 'app-pacientes-especialistas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pacientes-especialista.component.html',
  styleUrls: ['./pacientes-especialista.component.scss']
})
export class PacientesAtendidosComponent implements OnInit {
  pacientes: any[] = [];
  pacienteSeleccionado: any = null;
  turnosDelPaciente: any[] = [];
  cargando = true;

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private turnosService: TurnosService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.cargarPacientesAtendidos();
  }

  async cargarPacientesAtendidos() {
    try {
      const usuario = await this.authService.getUsuarioActualP();
      if (!usuario) return;

      const { data: especialista } = await supabase
        .from('especialistas')
        .select('id')
        .eq('usuario_id', usuario.id)
        .single();

      if (especialista) {
        this.pacientes = await this.historiaClinicaService.obtenerPacientesPorEspecialista(especialista.id);
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    } finally {
      this.cargando = false;
    }
  }

  async seleccionarPaciente(paciente: any) {
    this.pacienteSeleccionado = paciente;
    await this.cargarTurnosDelPaciente(paciente.id);
  }

  async cargarTurnosDelPaciente(pacienteId: number) {
    try {
      this.turnosDelPaciente = await this.turnosService.obtenerTurnosPorPaciente(pacienteId);
    } catch (error) {
      console.error('Error cargando turnos:', error);
    }
  }

  volverALista() {
    this.pacienteSeleccionado = null;
    this.turnosDelPaciente = [];
  }
}