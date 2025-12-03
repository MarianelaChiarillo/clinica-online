import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { AuthService } from '../../services/auth.service';
import { EspecialistaService } from '../../services/usuarios/especialista.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { MenuComponent } from '../componentes/menu/menu.component';

@Component({
  selector: 'app-horarios',
  standalone: true,
  templateUrl: './horarios.component.html',
  styleUrls: ['./horarios.component.scss'],
  imports: [CommonModule, FormsModule, MenuComponent],
})
export class MisHorariosComponent implements OnInit {
  cargando = false;
  especialistaId!: number;
  horarios: any[] = [];
  error = '';
  especialidades: any[] = [];
  especialidadSeleccionada: number | null = null;

  horasPosibles: string[] = [];
  dias = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    { id: 7, nombre: 'Domingo' },
  ];

  nuevoHorario = {
    dia_semana: 1,
    hora_inicio: '08:00',
    hora_fin: '19:00',
    duracion_consulta: 30,
  };

  constructor(
    private horariosService: DisponibilidadService,
    private authSrv: AuthService,
    private especialistaSrv: EspecialistaService,
    private usuarioSrv: UsuarioService
  ) { }

  async ngOnInit() {
    this.cargando = true;
    try {
      const authUser = await this.authSrv.getUsuarioActual();
      if (!authUser) throw new Error('No hay sesión activa.');

      const { data: usuarioDb, error } = await this.usuarioSrv.obtenerPorAuthId(authUser.id);
      if (error || !usuarioDb) throw new Error('Usuario no encontrado.');

      if (usuarioDb.tipo_usuario !== 'especialista') throw new Error('No tienes permisos de especialista.');

      const respEspecialista = await this.especialistaSrv.obtenerPorUsuarioId(usuarioDb.id);
      if (respEspecialista.error || !respEspecialista.data) throw new Error('Perfil de especialista no encontrado.');
      const especialista = respEspecialista.data;
      this.especialistaId = Number(especialista.id);

      this.especialistaId = Number(especialista.id);

      await this.cargarEspecialidades(this.especialistaId);
      await this.cargarHorarios();
      this.onDiaChange();
    } catch (err: any) {
      console.error(err);
      this.error = err.message;
    } finally {
      this.cargando = false;
    }
  }

  // Cargar especialidades del especialista
  async cargarEspecialidades(especialistaId: number) {
    try {
      this.especialidades = await this.especialistaSrv.obtenerEspecialidadesDeEspecialista(especialistaId);
      if (this.especialidades.length) {
        this.especialidadSeleccionada = this.especialidades[0].id;
      } else {
        this.error = 'No tienes especialidades activas.';
      }
    } catch {
      this.error = 'Error al cargar especialidades';
    }
  }

  // Cargar horarios del especialista
  async cargarHorarios() {
    if (!this.especialistaId) return;
    this.horarios = await this.horariosService.obtenerHorariosPorEspecialista(this.especialistaId);
  }

  // Agregar nuevo horario
  async agregarHorario() {
    if (!this.especialistaId) return alert('No se pudo identificar al especialista');
    if (!this.especialidadSeleccionada) return alert('Selecciona una especialidad');

    const { dia_semana, hora_inicio, hora_fin, duracion_consulta } = this.nuevoHorario;

    if (hora_inicio >= hora_fin) return alert('Hora inicio debe ser menor a hora fin');

    try {
      this.cargando = true;
      await this.horariosService.agregarHorario(
        this.especialistaId,
        this.especialidadSeleccionada,
        dia_semana,
        hora_inicio,
        hora_fin,
        duracion_consulta
      );
      await this.cargarHorarios();

      // Reset
      this.nuevoHorario = { dia_semana: 1, hora_inicio: '08:00', hora_fin: '19:00', duracion_consulta: 30 };
      this.onDiaChange();

      alert('Horario agregado correctamente');
    } catch (error: any) {
      alert('Error al agregar horario: ' + error.message);
    } finally {
      this.cargando = false;
    }
  }

  async eliminarHorario(id: number) {
    if (!confirm('¿Eliminar este horario?')) return;
    try {
      await this.horariosService.eliminarHorario(id);
      await this.cargarHorarios();
    } catch {
      alert('Error al eliminar horario');
    }
  }

  onDiaChange() {
    const dia = Number(this.nuevoHorario.dia_semana);
    let inicio = 8;
    let fin = 19;

    if (dia === 6) fin = 14; // Sábado
    if (dia === 7) { this.horasPosibles = []; return; } // Domingo sin horarios

    this.horasPosibles = this.generarHoras(inicio, fin);
  }

  generarHoras(inicio: number, fin: number): string[] {
    const horas: string[] = [];
    for (let h = inicio; h <= fin; h += 0.5) {
      const hora = Math.floor(h).toString().padStart(2, '0');
      const minutos = h % 1 === 0 ? '00' : '30';
      horas.push(`${hora}:${minutos}`);
    }
    return horas;
  }

  getDiaNombre(id: number) {
    return this.dias.find(d => d.id === id)?.nombre || '';
  }

  getEspecialidadNombre(id: number) {
    return this.especialidades.find(e => e.id === id)?.nombre || 'Especialidad no encontrada';
  }

  formatearHora(hora: string) {
    return hora.substring(0, 5);
  }
}
