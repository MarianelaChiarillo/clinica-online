import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorariosService } from '../../services/disponibilidad.service';
import { AuthService } from '../../services/auth.service';
import { EspecialistaService } from '../../services/usuarios/especialista.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { EspecialidadService } from '../../services/usuarios/especialidad.service';

@Component({
  selector: 'app-horarios',
  standalone: true,
  templateUrl: './horarios.component.html',
  styleUrls: ['./horarios.component.scss'],
  imports: [CommonModule, FormsModule],
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
  ];

  nuevoHorario = {
    dia_semana: 1,
    hora_inicio: '08:00',
    hora_fin: '19:00',
    duracion_consulta: 30,
  };

  constructor(
    private horariosService: HorariosService,
    private authSrv: AuthService,
    private especialistaSrv: EspecialistaService,
    private usuarioSrv: UsuarioService,
    private especialidadSrv: EspecialidadService
  ) {}

  async ngOnInit() {
    this.onDiaChange(); // Inicializar selector de horas

    this.cargando = true;
    try {
      const user = await this.authSrv.getUsuarioActual();
      if (!user) throw new Error('No hay sesión activa.');

      const { data: usuario, error } = await this.usuarioSrv.obtenerPorAuthId(user.id);
      if (error || !usuario) throw new Error('No se encontró el usuario en la base de datos.');

      if (usuario.tipo_usuario !== 'especialista') {
        throw new Error('No tienes permisos de especialista');
      }

      const especialista = await this.especialistaSrv.obtenerPorUsuarioId(usuario.id);
      if (!especialista?.id) throw new Error('No se encontró el perfil del especialista.');

      this.especialistaId = Number(especialista.id);

      await this.cargarEspecialidades(this.especialistaId);
      await this.cargarHorarios();
      
    } catch (err: any) {
      console.error(err);
      this.error = err.message;
    } finally {
      this.cargando = false;
    }
  }
 

onDiaChange() {
  const dia = Number(this.nuevoHorario.dia_semana);

  let inicio = 8;      // Default
  let fin = 19;      // Default

  if (dia === 6) {
    // SÁBADO → 08:00 a 13:00
    fin = 14;
  }

  if (dia === 7) {
    // DOMINGO → sin horarios
    this.horasPosibles = [];
    return;
  }

  this.horasPosibles = this.generarHoras(inicio, fin);
}

generarHoras(inicio: number, fin: number): string[] {
  const horas: string[] = [];
  for (let h = inicio; h <= fin; h += 0.5) {
    const hora = Math.floor(h);
    const minutos = h % 1 === 0 ? '00' : '30';
    horas.push(`${hora.toString().padStart(2, '0')}:${minutos}`);
  }
  return horas;
}


  // 🔥 Especialidades
  // ------------------------------------------------------------------
  async cargarEspecialidades(especialistaId: number) {
    try {
      const especialistaCompleto = await this.especialistaSrv.obtenerPorId(especialistaId);
      if (!especialistaCompleto) throw new Error();

      this.especialidades = especialistaCompleto.especialidades?.filter(e => e.activo) || [];

      if (this.especialidades.length > 0) {
        this.especialidadSeleccionada = this.especialidades[0].id;
      } else {
        this.error = 'No tienes especialidades activas asignadas.';
      }
    } catch {
      this.error = 'Error al cargar las especialidades';
    }
  }

  // ------------------------------------------------------------------
  // 🔥 Cargar horarios
  // ------------------------------------------------------------------
  async cargarHorarios() {
    if (!this.especialistaId) return;
    this.horarios = await this.horariosService.obtenerHorariosPorEspecialista(this.especialistaId);
  }

  // ------------------------------------------------------------------
  // 🔥 Agregar horario
  // ------------------------------------------------------------------
  async agregarHorario() {
    if (!this.especialistaId) return alert('No se pudo identificar al especialista');
    if (!this.especialidadSeleccionada) return alert('Selecciona una especialidad');

    const { dia_semana, hora_inicio, hora_fin, duracion_consulta } = this.nuevoHorario;

    if (hora_inicio >= hora_fin) {
      return alert('La hora de inicio debe ser anterior a la hora de fin');
    }

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
      this.nuevoHorario = {
        dia_semana: 1,
        hora_inicio: '08:00',
        hora_fin: '19:00',
        duracion_consulta: 30,
      };
      this.onDiaChange();

      alert('Horario agregado correctamente');

    } catch (error: any) {
      alert('Error al agregar horario: ' + error.message);
    } finally {
      this.cargando = false;
    }
  }

  // ------------------------------------------------------------------
  // 🔥 Eliminar horario
  // ------------------------------------------------------------------
  async eliminarHorario(id: number) {
    if (!confirm('¿Eliminar este horario?')) return;

    try {
      await this.horariosService.eliminarHorario(id);
      await this.cargarHorarios();
    } catch {
      alert('Error al eliminar el horario');
    }
  }

  // Helpers de display
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
