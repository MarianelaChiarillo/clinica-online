import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';
import { TurnosService } from '../../services/turnos.service';
import { AuthService } from '../../services/auth.service';
import supabase from '../../services/supabase.client';

@Component({
  selector: 'app-pacientes-atendidos',
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
  
  // Nuevas propiedades para favoritos y secciones
  pacientesFavoritos: Set<number> = new Set();
  seccionesVisibles: Set<string> = new Set();

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private turnosService: TurnosService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.cargarPacientesAtendidos();
    this.cargarFavoritos();
  }

  async cargarPacientesAtendidos() {
    try {
      this.cargando = true;
      const usuario = await this.authService.getUsuarioActualP();
      if (!usuario) return;

      const { data: especialista } = await supabase
        .from('especialistas')
        .select('id')
        .eq('usuario_id', usuario.id)
        .single();

      if (especialista) {
        // Obtener pacientes y enriquecer con información adicional
        const pacientesBase = await this.historiaClinicaService.obtenerPacientesPorEspecialista(especialista.id);
        
        // Enriquecer cada paciente con más datos y contar turnos
        this.pacientes = await Promise.all(
          pacientesBase.map(async (paciente: any) => {
            const turnos = await this.turnosService.obtenerTurnosPorPaciente(paciente.id);
            const historiaCompleta = await this.obtenerPerfilCompletoPaciente(paciente.usuario_id);
            
            return {
              ...paciente,
              ...historiaCompleta,
              cantidadTurnos: turnos.length,
              imagen_perfil: historiaCompleta?.imagen_perfil || paciente.imagen_perfil
            };
          })
        );

        console.log('Pacientes cargados:', this.pacientes);
      }
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

      if (usuario) {
        const { data: paciente } = await supabase
          .from('pacientes')
          .select('*')
          .eq('usuario_id', usuarioId)
          .single();

        return {
          ...usuario,
          ...paciente
        };
      }
    } catch (error) {
      console.error('Error obteniendo perfil completo:', error);
    }
    return null;
  }

  async seleccionarPaciente(paciente: any) {
    this.pacienteSeleccionado = paciente;
    await this.cargarTurnosDelPaciente(paciente.id);
  }

  async cargarTurnosDelPaciente(pacienteId: number) {
    try {
      const turnos = await this.turnosService.obtenerTurnosPorPaciente(pacienteId);
      
      // Enriquecer cada turno con historia clínica
      this.turnosDelPaciente = await Promise.all(
        turnos.map(async (turno: any) => {
          const historiaClinica = await this.historiaClinicaService.obtenerHistoriaClinicaPorTurno(turno.id);
          return {
            ...turno,
            historia_clinica: historiaClinica
          };
        })
      );

      console.log('Turnos del paciente:', this.turnosDelPaciente);
    } catch (error) {
      console.error('Error cargando turnos:', error);
    }
  }

  // Métodos para favoritos
  toggleFavorito(paciente: any) {
    if (this.pacientesFavoritos.has(paciente.id)) {
      this.pacientesFavoritos.delete(paciente.id);
    } else {
      this.pacientesFavoritos.add(paciente.id);
    }
    this.guardarFavoritos();
  }

  esFavorito(pacienteId: number): boolean {
    return this.pacientesFavoritos.has(pacienteId);
  }

  cargarFavoritos() {
    const favoritosGuardados = localStorage.getItem('pacientesFavoritos');
    if (favoritosGuardados) {
      this.pacientesFavoritos = new Set(JSON.parse(favoritosGuardados));
    }
  }

  guardarFavoritos() {
    localStorage.setItem('pacientesFavoritos', JSON.stringify([...this.pacientesFavoritos]));
  }

  // Métodos para secciones plegables
  toggleSeccion(seccionId: string) {
    if (this.seccionesVisibles.has(seccionId)) {
      this.seccionesVisibles.delete(seccionId);
    } else {
      this.seccionesVisibles.add(seccionId);
    }
  }

  esSeccionVisible(seccionId: string): boolean {
    return this.seccionesVisibles.has(seccionId);
  }

  volverALista() {
    this.pacienteSeleccionado = null;
    this.turnosDelPaciente = [];
    this.seccionesVisibles.clear();
  }
}