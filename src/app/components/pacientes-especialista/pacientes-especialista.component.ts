import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';
import { TurnoService } from '../../services/turnos.service';
import supabase from '../../services/supabase.client';
import { PacienteService } from '../../services/usuarios/paciente.service';
import { EspecialistaService } from '../../services/usuarios/especialista.service';
import { MenuComponent } from '../componentes/menu/menu.component';
@Component({
  selector: 'app-pacientes-atendidos',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './pacientes-especialista.component.html',
  styleUrls: ['./pacientes-especialista.component.scss']
})
export class PacientesAtendidosComponent implements OnInit {
  pacientes: any[] = [];
  pacienteSeleccionado: any = null;
  turnosDelPaciente: any[] = [];
  cargando = true;

  pacientesFavoritos: Set<number> = new Set();
  seccionesVisibles: Set<string> = new Set();

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private turnosService: TurnoService,
    private pacienteService: PacienteService,
    private especialistaService: EspecialistaService
  ) {}

  async ngOnInit() {
    await this.cargarPacientesAtendidos();
    this.cargarFavoritos();
  }


async cargarPacientesAtendidos() {
  this.cargando = true;
  try {
    // Obtener especialista en sesión
    const especialista = await this.especialistaService.obtenerEspecialistaActual();
    if (!especialista) {
      console.warn('No hay especialista logueado');
      return;
    }

    // Obtener pacientes asociados al especialista
    const pacientesBase = await this.historiaClinicaService.obtenerPacientesPorEspecialista(especialista.id);

    const pacientesCompletos: any[] = [];
    for (let i = 0; i < pacientesBase.length; i++) {
      const paciente = pacientesBase[i];

      const turnos = await this.turnosService.obtenerTurnosDePaciente(paciente.id);
      const cantidadTurnos = turnos.data ? turnos.data.length : 0;

      const historiaCompleta = await this.obtenerPerfilCompletoPaciente(paciente.usuario_id);

      pacientesCompletos.push({
        ...paciente,
        ...historiaCompleta,
        cantidadTurnos,
        imagen_perfil: historiaCompleta?.imagen_perfil || paciente.imagen_perfil
      });
    }

    this.pacientes = pacientesCompletos;
    console.log('Pacientes cargados:', this.pacientes);

  } catch (error) {
    console.error('Error cargando pacientes:', error);
  } finally {
    this.cargando = false;
  }
}

   

  async obtenerPerfilCompletoPaciente(usuarioId: number): Promise<any> {
    try {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', usuarioId)
        .single();

      if (!usuario) return null;

      const { data: paciente } = await supabase
        .from('pacientes')
        .select('*')
        .eq('usuario_id', usuarioId)
        .single();

      return { ...usuario, ...paciente };
    } catch (error) {
      console.error('Error obteniendo perfil completo:', error);
      return null;
    }
  }

  async seleccionarPaciente(paciente: any) {
    this.pacienteSeleccionado = paciente;
    await this.cargarTurnosDelPaciente(paciente.id);
  }

 
async cargarTurnosDelPaciente(pacienteId: number) {
  try {
    const resultado = await this.turnosService.obtenerTurnosDePaciente(pacienteId);
    const turnosData = resultado.data || [];
    const turnosConHistoria: any[] = [];

    for (let i = 0; i < turnosData.length; i++) {
      const turno = turnosData[i];

      // Obtener historia clínica
      const historiaClinica = await this.historiaClinicaService.obtenerHistoriaClinicaPorTurno(turno.id);

      // Obtener especialidad
      const { data: especialidad } = await supabase
        .from('especialidades')
        .select('nombre')
        .eq('id', turno.especialidad_id)
        .single();

      turnosConHistoria.push({
        ...turno,
        historia_clinica: historiaClinica,
        especialidades: especialidad || null // así tu HTML puede usar turno.especialidades?.nombre
      });
    }

    this.turnosDelPaciente = turnosConHistoria;
    console.log('Turnos del paciente:', this.turnosDelPaciente);

  } catch (error) {
    console.error('Error cargando turnos:', error);
  }
}

  toggleFavorito(paciente: any) {
    if (this.pacientesFavoritos.has(paciente.id)) this.pacientesFavoritos.delete(paciente.id);
    else this.pacientesFavoritos.add(paciente.id);
    this.guardarFavoritos();
  }

  esFavorito(pacienteId: number): boolean {
    return this.pacientesFavoritos.has(pacienteId);
  }

  cargarFavoritos() {
    const fav = localStorage.getItem('pacientesFavoritos');
    if (fav) this.pacientesFavoritos = new Set(JSON.parse(fav));
  }

  guardarFavoritos() {
    localStorage.setItem('pacientesFavoritos', JSON.stringify([...this.pacientesFavoritos]));
  }

  toggleSeccion(seccionId: string) {
    if (this.seccionesVisibles.has(seccionId)) this.seccionesVisibles.delete(seccionId);
    else this.seccionesVisibles.add(seccionId);
  }

  esSeccionVisible(seccionId: string) {
    return this.seccionesVisibles.has(seccionId);
  }

  volverALista() {
    this.pacienteSeleccionado = null;
    this.turnosDelPaciente = [];
    this.seccionesVisibles.clear();
  }
}
