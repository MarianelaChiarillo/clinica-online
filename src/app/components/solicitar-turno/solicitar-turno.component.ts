import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorariosService } from '../../services/disponibilidad.service';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { EspecialistaService } from '../../services/usuarios/especialista.service';
import { EspecialidadService } from '../../services/usuarios/especialidad.service';
import { FiltroGeneralComponent } from '../componentes/filtro-general/filtro-general.component';
import { TurnosService } from '../../services/turnos.service';
import { FechaFormatoPipe } from '../../pipes/fecha-formato.pipe';
import { HoraFormatoPipe } from '../../pipes/hora-formato.pipe';
import supabase from '../../services/supabase.client';
import { MenuComponent } from './../componentes/menu/menu.component';
import { SpinnerComponent } from '../componentes/spinner/spinner.component';
import { MensajeComponent } from '../componentes/mensaje/mensaje.component';

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  templateUrl: './solicitar-turno.component.html',
  styleUrl: './solicitar-turno.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    FiltroGeneralComponent,
    FechaFormatoPipe,
    HoraFormatoPipe,
    MenuComponent,
    SpinnerComponent,
  ],
})
export class SolicitarTurnoComponent implements OnInit {
  pasoActual = 1;

  pacientes: any[] = [];
  pacientesFiltrados: any[] = [];
  pacienteSeleccionado: any = null;

  especialidades: any[] = [];
  especialistas: any[] = [];

  fechasDisponibles: any[] = [];
  horariosConfigurados: any[] = [];
  horariosDisponibles: string[] = [];
  horariosOcupados: string[] = [];
  todosLosHorarios: string[] = [];

  especialistaSeleccionado: any = null;
  procesando: boolean = false;
  usuarioLogueado: any = null;
  esAdmin: boolean = false;
  horarioSeleccionado: any = null;
  cargando = false;

  turnoData: any = {
    pacienteId: null,
    especialidadId: null,
    especialistaId: null,
    fecha: null,
    hora: null,
    duracion: null,
  };

  constructor(
    private authSrv: AuthService,
    private usuarioSrv: UsuarioService,
    private especialistaSrv: EspecialistaService,
    private especialidadSrv: EspecialidadService,
    private horariosService: HorariosService,
    private turnosService: TurnosService
  ) {}

  async ngOnInit() {
    console.log('🔵 Iniciando Solicitar Turno');
    this.cargando = true;

    const user = await this.authSrv.getUsuarioActual();
    if (!user) {
      console.error('❌ No hay sesión activa');
      return;
    }

    const { data: usuario } = await this.usuarioSrv.obtenerPorAuthId(user.id);
    if (!usuario) {
      console.error('❌ Usuario no encontrado en BD');
      return;
    }

    this.usuarioLogueado = usuario;
    this.esAdmin = usuario.tipo_usuario === 'administrador';

    if (this.esAdmin) {
      await this.cargarPacientes();
    } else {
      const { data: pacienteReal, error } = await this.usuarioSrv.obtenerPacientePorUsuarioId(
        usuario.id
      );
      if (error || !pacienteReal) {
        console.error('❌ No se encontró paciente para este usuario');
      } else {
        this.usuarioLogueado = pacienteReal.id;
      }
    }

    await this.cargarEspecialidades();
    this.cargando = false;
  }

  // =======================================================
  // PACIENTES
  // =======================================================

  async cargarPacientes() {
    try {
      const pacientes = await this.usuarioSrv.obtenerPacientes();
      this.pacientes = pacientes || [];
      this.pacientesFiltrados = [...this.pacientes];
      console.log('📌 Pacientes cargados:', this.pacientes);
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
    }
  }

  filtrarPacientes(texto: string) {
    if (!texto) {
      this.pacientesFiltrados = this.pacientes;
      return;
    }

    const f = texto.toLowerCase();
    this.pacientesFiltrados = this.pacientes.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(f) ||
        p.apellido?.toLowerCase().includes(f) ||
        p.dni?.toString().includes(f)
    );
  }

  async seleccionarPaciente(paciente: any) {
    const { data: pacienteData, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('usuario_id', paciente.id)
      .single();

    if (error || !pacienteData) {
      console.error('❌ No se encontró el paciente en la tabla pacientes', error);
      return;
    }

    console.log('Paciente real encontrado:', pacienteData);
    this.pacienteSeleccionado = pacienteData;
    this.turnoData.pacienteId = pacienteData.id;
    console.log('✔ pacienteId seteado:', this.turnoData.pacienteId);
  }

  // =======================================================
  // ESPECIALIDADES
  // =======================================================

  async cargarEspecialidades() {
    try {
      const especialidades = await this.especialidadSrv.obtenerTodas();

      this.especialidades = (especialidades || []).map((esp) => ({
        id: esp.id,
        nombre: esp.nombre,
        imagen_url: esp.imagen_url || esp.imagenUrl || esp.imagen || null,
      }));

      console.log('📚 Especialidades cargadas:', this.especialidades);
    } catch (error) {
      console.error('❌ Error cargando especialidades:', error);
    }
  }

  seleccionarEspecialidad(especialidad: any) {
    this.turnoData.especialidadId = especialidad.id;
    this.turnoData.especialistaId = null;
    this.especialistaSeleccionado = null;
    this.pasoActual = 2;
    this.cargarEspecialistas();
    console.log('➡️ Especialidad seleccionada:', especialidad.nombre);
  }

  // =======================================================
  // ESPECIALISTAS
  // =======================================================

  async cargarEspecialistas() {
    try {
      this.cargando = true;

      const especialidadId = Number(this.turnoData.especialidadId);
      const especialistas = await this.especialistaSrv.obtenerPorEspecialidad(especialidadId);

      this.especialistas = await Promise.all(
        (especialistas || []).map(async (esp) => {
          const especialistaCompleto = await this.obtenerEspecialistaConImagen(esp.id);

          return {
            id: esp.id,
            nombre: esp.nombre,
            apellido: esp.apellido,
            email: esp.email,
            estado: esp.estado,
            imagen_perfil:
              especialistaCompleto?.usuario?.imagen_perfil ||
              esp.imagen_perfil ||
              'assets/images/perfil-default.jpg',
          };
        })
      );
      this.cargando = false;

      console.log('👨‍⚕️ Especialistas cargados:', this.especialistas);
    } catch (error) {
      console.error('❌ Error cargando especialistas:', error);
    }
  }

  private async obtenerEspecialistaConImagen(especialistaId: number): Promise<any> {
    try {
      return await this.especialistaSrv.obtenerPorId(especialistaId);
    } catch (error) {
      console.error('Error obteniendo especialista completo:', error);
      return null;
    }
  }

  seleccionarEspecialista(especialista: any) {
    this.turnoData.especialistaId = especialista.id;
    this.especialistaSeleccionado = especialista;
    console.log('👨‍⚕️ Especialista seleccionado:', especialista);
    this.cargarFechasDisponibles();
  }

  // =======================================================
  // FECHAS DISPONIBLES
  // =======================================================

  seleccionarFecha(fecha: any) {
    console.log('📌 Seleccionaste fecha:', fecha);
    this.turnoData.fecha = fecha.value;
    this.turnoData.diaSemana = fecha.diaSemana; // ← Guardar el día ya calculado

    console.log('📅 turnoData.fecha luego de asignar:', this.turnoData.fecha);
    console.log('📅 Día de la semana guardado:', this.turnoData.diaSemana);
    this.cargarHorariosDisponibles();
  }

  async cargarHorariosDisponibles() {
    console.log('🟦 Entró a cargarHorariosDisponibles()');
    console.log('📅 turnoData.fecha:', this.turnoData.fecha);

    if (!this.turnoData.fecha) return;

    // USAR el día que ya calculamos en lugar de recalcular
    const dia = this.turnoData.diaSemana;
    console.log(
      '📅 Día de la semana (desde fecha seleccionada):',
      dia,
      `(${this.getNombreDia(dia)})`
    );

    console.log('🔍 Horarios configurados disponibles:', this.horariosConfigurados);

    const horario = this.horariosConfigurados.find((h: any) => h.dia_semana === dia);
    console.log('🔍 Horario encontrado para este día:', horario);

    if (!horario) {
      console.warn('⚠️ No existe horario para este día');
      console.log('🎯 Día buscado:', dia, `(${this.getNombreDia(dia)})`);
      console.log(
        '📝 Días configurados:',
        this.horariosConfigurados.map((h) => `${h.dia_semana} (${this.getNombreDia(h.dia_semana)})`)
      );
      this.horariosDisponibles = [];
      return;
    }

    console.log('🟧 Horario elegido:', horario);

    this.turnoData.duracion = horario.duracion_consulta;

    const turnos = await this.turnosService.obtenerTurnosPorEspecialistaYFecha(
      this.turnoData.especialistaId,
      this.turnoData.fecha
    );

    this.horariosOcupados = turnos.map((t: any) => t.hora_inicio.slice(0, 5));
    console.log('🔴 Ocupados:', this.horariosOcupados);

    this.todosLosHorarios = this.generarSlots(
      horario.hora_inicio,
      horario.hora_fin,
      horario.duracion_consulta
    );

    this.horariosDisponibles = this.todosLosHorarios.filter(
      (h) => !this.horariosOcupados.includes(h)
    );

    console.log('🟢 Horarios disponibles:', this.horariosDisponibles);
    this.pasoActual = 4;

    // =======================================================
    // HORARIOS
    // =======================================================

    // ... resto del código igual
  }

  // En solicitar-turno.component.ts, dentro de la clase
  getNombresDiasConfigurados(): string {
    if (!this.horariosConfigurados || this.horariosConfigurados.length === 0) {
      return 'Ninguno';
    }

    const diasUnicos = [...new Set(this.horariosConfigurados.map((h: any) => h.dia_semana))];
    const nombres = diasUnicos.map((dia) => this.getNombreDia(dia));

    return nombres.join(', ');
  }

  // Agregar este método helper para debug
  private getNombreDia(diaSemana: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[diaSemana] || 'Desconocido';
  }
  getDiaSemana(fecha: string): number {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }

  generarSlots(inicio: string, fin: string, duracion: number): string[] {
    const lista: string[] = [];
    let [h, m] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);

    while (h < hFin || (h === hFin && m < mFin)) {
      lista.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      m += duracion;
      if (m >= 60) {
        h++;
        m -= 60;
      }
    }

    return lista;
  }

  seleccionarHorario(horario: string) {
    this.turnoData.hora = horario;

    console.log('⏰ Horario seleccionado:', horario);
  }

  // =======================================================
  // NAVEGACIÓN Y UTILIDADES
  // =======================================================

  volverPasoAnterior() {
    if (this.pasoActual > 1) {
      this.pasoActual--;
    }
  }

  esHorarioOcupado(hora: string): boolean {
    return this.horariosOcupados.includes(hora);
  }

  getImagenEspecialidad(especialidad: any): string {
    return (
      especialidad.imagen_url ||
      especialidad.imagenUrl ||
      especialidad.imagen ||
      'assets/images/especialidad-default.jpg'
    );
  }

  getImagenEspecialista(especialista: any): string {
    return especialista.imagen_perfil || 'assets/images/perfil-default.jpg';
  }

  onErrorImagen(event: any, tipo: string, item: any) {
    console.log(`Error cargando imagen de ${tipo}:`, item);

    if (tipo === 'especialidad') {
      event.target.src = 'assets/images/especialidad-default.jpg';
    } else if (tipo === 'especialista') {
      event.target.src = 'assets/images/perfil-default.jpg';
    }
  }

  // =======================================================
  // SOLICITAR TURNO
  // =======================================================

  async solicitarTurno() {
    console.log('📤 Enviar turno:', this.turnoData);

    // ------------------------------------------------------------------
    // 1️⃣ ASIGNAR PACIENTE
    // ------------------------------------------------------------------
    if (!this.esAdmin) {
      this.turnoData.pacienteId = this.usuarioLogueado;
    } else {
      this.turnoData.pacienteId = this.pacienteSeleccionado?.id || null;
    }

    // ------------------------------------------------------------------
    // 2️⃣ VALIDACIONES
    // ------------------------------------------------------------------
    if (!this.turnoData.pacienteId) {
      console.error('❌ Falta paciente');
      return;
    }
    if (!this.turnoData.especialistaId) {
      console.error('❌ Falta especialista');
      return;
    }
    if (!this.turnoData.especialidadId) {
      console.error('❌ Falta especialidad');
      return;
    }
    if (!this.turnoData.fecha) {
      console.error('❌ Falta fecha');
      return;
    }
    if (!this.turnoData.hora) {
      console.error('❌ Falta horario');
      return;
    }
    if (!this.turnoData.duracion) {
      console.error('❌ Falta duración del turno');
      return;
    }

    // ------------------------------------------------------------------
    // 3️⃣ Calcular hora fin
    // ------------------------------------------------------------------
    const [h, m] = this.turnoData.hora.split(':').map(Number);
    let horaFinMin = m + this.turnoData.duracion;
    let horaFinHora = h;

    if (horaFinMin >= 60) {
      horaFinHora += Math.floor(horaFinMin / 60);
      horaFinMin = horaFinMin % 60;
    }

    const horaFin = `${String(horaFinHora).padStart(2, '0')}:${String(horaFinMin).padStart(
      2,
      '0'
    )}`;

    // ------------------------------------------------------------------
    // 4️⃣ ARMAR PAYLOAD FINAL
    // ------------------------------------------------------------------
    const payload = {
      pacienteId: this.turnoData.pacienteId,
      especialistaId: this.turnoData.especialistaId,
      especialidadId: this.turnoData.especialidadId,
      fecha: this.turnoData.fecha,
      horaInicio: this.turnoData.hora,
      horaFin: horaFin,
      duracion: this.turnoData.duracion,
    };

    console.log('📦 Payload final enviado al service:', payload);

    // ------------------------------------------------------------------
    // 5️⃣ ENVIAR AL SERVICE
    // ------------------------------------------------------------------
    this.procesando = true;

    try {
      const resp = await this.turnosService.crearTurno(payload);

      if (resp.error) {
        MensajeComponent.show({
          titulo: 'Error',
          mensaje: resp.error.message,
          tipo: 'error',
        });
        return;
      }

      MensajeComponent.show({
        titulo: 'Turno creado',
        mensaje: 'El turno fue registrado correctamente.',
        tipo: 'success',
      });

      this.resetearFormulario();
    } catch (error) {
      MensajeComponent.show({
        titulo: 'Error inesperado',
        mensaje: 'Ocurrió un problema al procesar la solicitud.',
        tipo: 'error',
      });
    } finally {
      this.procesando = false;
    }
  }

  resetearFormulario() {
    this.pasoActual = 1;
    this.pacienteSeleccionado = null;
    this.especialistaSeleccionado = null;

    this.turnoData = {
      pacienteId: null,
      especialidadId: null,
      especialistaId: null,
      fecha: null,
      hora: null,
      duracion: null,
    };

    this.fechasDisponibles = [];
    this.horariosDisponibles = [];
    this.horariosOcupados = [];
  }

  generarFechasDisponibles(diasPermitidos: number[]) {
    this.fechasDisponibles = [];
    const hoy = new Date();

    for (let i = 0; i < 15; i++) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() + i);
      const diaSemana = fecha.getDay();

      // SOLO agregar si el día está en los permitidos
      if (diasPermitidos.includes(diaSemana)) {
        this.fechasDisponibles.push({
          label: fecha.toISOString().split('T')[0],
          value: fecha.toISOString().split('T')[0],
          diaSemana: diaSemana,
          nombreDia: this.getNombreDia(diaSemana),
        });
      }
    }

    console.log(
      '📆 Fechas generadas CON horario:',
      this.fechasDisponibles.map((f) => `${f.value} (${f.nombreDia} - día ${f.diaSemana})`)
    );

    // Si no hay fechas, mostrar mensaje
    if (this.fechasDisponibles.length === 0) {
      console.warn('⚠️ No hay fechas disponibles en los próximos 15 días');
    }
  }
  async cargarFechasDisponibles() {
    try {
      const horarios = await this.horariosService.obtenerHorariosPorEspecialista(
        this.turnoData.especialistaId
      );

      console.log('📅 Todos los horarios del especialista:', horarios);

      this.horariosConfigurados = horarios.filter(
        (h: any) => h.especialidad_id == this.turnoData.especialidadId && h.activo
      );

      console.log('🔍 Horarios filtrados para esta especialidad:', this.horariosConfigurados);

      const dias = this.horariosConfigurados.map((h: any) => h.dia_semana);
      console.log('🎯 Días de trabajo (números):', dias);
      console.log(
        '📝 Días de trabajo (nombres):',
        dias.map((dia) => `${dia} = ${this.getNombreDia(dia)}`)
      );

      this.generarFechasDisponibles(dias);
      this.pasoActual = 3;
    } catch (error) {
      console.error('❌ Error cargando fechas disponibles:', error);
    }
  }
}
