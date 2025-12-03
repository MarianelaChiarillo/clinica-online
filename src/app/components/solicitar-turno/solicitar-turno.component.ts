import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { PacienteService } from '../../services/usuarios/paciente.service';
import { EspecialistaService } from '../../services/usuarios/especialista.service';
import { EspecialidadService } from '../../services/usuarios/especialidad.service';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { TurnoService } from '../../services/turnos.service';
import { FiltroGeneralComponent } from '../componentes/filtro-general/filtro-general.component';
import { FechaFormatoPipe } from '../../pipes/fecha-formato.pipe';
import { HoraFormatoPipe } from '../../pipes/hora-formato.pipe';
import { MenuComponent } from './../componentes/menu/menu.component';
import { SpinnerComponent } from '../componentes/spinner/spinner.component';
import { MensajeComponent } from '../componentes/mensaje/mensaje.component';

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  templateUrl: './solicitar-turno.component.html',
  styleUrls: ['./solicitar-turno.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    FiltroGeneralComponent,
    FechaFormatoPipe,
    HoraFormatoPipe,
    MenuComponent,
    SpinnerComponent,
    MensajeComponent
  ]
})
export class SolicitarTurnoComponent implements OnInit, OnDestroy {
  pasoActual = 1;
  cargando = false;
  procesando = false;
  mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;

  // Para el admin
  pacientes: any[] = [];
  pacientesFiltrados: any[] = [];
  pacienteSeleccionado: any = null;
  textoFiltroPaciente: string = '';

  especialidades: any[] = [];
  especialistas: any[] = [];
  especialistaSeleccionado: any = null;

  fechasDisponibles: any[] = [];
  horariosConfigurados: any[] = [];
  horariosDisponibles: string[] = [];
  horariosOcupados: string[] = [];
  turnosDelDia: any[] = [];
  horarioSubscription?: Subscription;

  usuarioLogueado: any = null;
  esAdmin = false;

  turnoData = {
    pacienteId: null as number | null,
    especialidadId: null as number | null,
    especialistaId: null as number | null,
    fecha: null as string | null,
    hora: null as string | null,
    duracion: null as number | null,
    diaSemana: null as number | null,
  };

  constructor(
    private authSrv: AuthService,
    private usuarioSrv: UsuarioService,
    private pacienteSrv: PacienteService,
    private especialistaSrv: EspecialistaService,
    private especialidadSrv: EspecialidadService,
    private disponibilidadSrv: DisponibilidadService,
    private turnosSrv: TurnoService
  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    await this.delay(500);

    const user = await this.authSrv.getUsuarioActual();
    if (!user) {
      this.cargando = false;
      this.mostrarMensaje('Error', 'No hay usuario logueado', 'error');
      return;
    }

    const resp = await this.usuarioSrv.obtenerPorAuthId(user.id);
    this.usuarioLogueado = resp.data;

    if (!this.usuarioLogueado) {
      this.cargando = false;
      this.mostrarMensaje('Error', 'Usuario no encontrado', 'error');
      return;
    }

    this.esAdmin = this.usuarioLogueado.tipo_usuario === 'administrador';

    if (this.esAdmin) {
      // Para admin: cargar todos los pacientes
      await this.cargarTodosLosPacientes();
    } else {
      // Para paciente: obtener sus datos completos
      const paciente = await this.pacienteSrv.obtenerPacientePorUsuario(this.usuarioLogueado.id);
      if (paciente) {
        this.usuarioLogueado = {
          ...this.usuarioLogueado,
          ...paciente
        };
      }
    }

    await this.cargarEspecialidades();
    this.cargando = false;
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }

  private cleanupSubscriptions(): void {
    if (this.horarioSubscription) {
      this.horarioSubscription.unsubscribe();
    }
    this.disponibilidadSrv.limpiarSuscripcion();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ========== MÉTODO CORREGIDO PARA CARGAR PACIENTES ==========
  async cargarTodosLosPacientes(): Promise<void> {
    try {
      // Usar el método que obtiene todos los pacientes
      this.pacientes = await this.pacienteSrv.obtenerTodosPacientes();
      
      // Si no hay método específico, usar esta alternativa:
      // const { data: usuarios } = await this.usuarioSrv.obtenerTodos();
      // this.pacientes = usuarios
      //   .filter(u => u.tipo_usuario === 'paciente')
      //   .map(p => ({
      //     id: p.id,
      //     nombre: p.nombre || '',
      //     apellido: p.apellido || '',
      //     dni: p.dni || '',
      //     email: p.email || '',
      //     tipo_usuario: p.tipo_usuario
      //   }));
      
      console.log('📋 Pacientes cargados para admin:', this.pacientes);
      this.pacientesFiltrados = [...this.pacientes];
      
      if (this.pacientes.length === 0) {
        console.warn('⚠️ No se encontraron pacientes');
      }
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
      this.mostrarMensaje('Error', 'No se pudieron cargar los pacientes', 'error');
    }
  }

  // ========== FILTRADO DE PACIENTES ==========
  filtrarPacientes(texto: string): void {
    this.textoFiltroPaciente = texto.toLowerCase().trim();
    
    if (!this.textoFiltroPaciente) {
      this.pacientesFiltrados = [...this.pacientes];
      return;
    }

    this.pacientesFiltrados = this.pacientes.filter(p => {
      const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase();
      const dni = p.dni?.toString().toLowerCase() || '';
      const email = p.email?.toLowerCase() || '';
      
      return nombreCompleto.includes(this.textoFiltroPaciente) ||
             dni.includes(this.textoFiltroPaciente) ||
             email.includes(this.textoFiltroPaciente);
    });
    
    console.log('🔍 Filtro aplicado. Resultados:', this.pacientesFiltrados.length);
  }

  // ========== MENSAJES ==========
  mostrarMensaje(titulo: string, texto: string, tipo: 'error' | 'success' | 'info') {
    this.mensaje = { titulo, texto, tipo };
    setTimeout(() => this.mensaje = null, 4000);
  }

  // ========== SELECCIÓN DE PACIENTE ==========
  seleccionarPaciente(paciente: any): void {
    console.log('👤 Paciente seleccionado:', paciente);
    this.pacienteSeleccionado = paciente;
    this.turnoData.pacienteId = paciente.id;
    
    // Una vez seleccionado el paciente, mostrar las especialidades
    this.pasoActual = 1;
  }

  // ========== MÉTODOS RESTANTES (sin cambios) ==========
  trackByEspecialidad(index: number, especialidad: any): number {
    return especialidad.id;
  }

  trackByEspecialista(index: number, especialista: any): number {
    return especialista.id;
  }

  trackByPaciente(index: number, paciente: any): number {
    return paciente.id;
  }

  getNombresDiasConfigurados(): string {
    if (!this.horariosConfigurados || this.horariosConfigurados.length === 0) return '';
    const dias = [...new Set(this.horariosConfigurados.map((h) => h.dia_semana))];
    return dias.map((d) => this.getNombreDiaBd(d)).join(', ');
  }

  esHorarioOcupado(hora: string): boolean {
    const turnoEnEsteHorario = this.turnosDelDia.find(t => {
      const horaTurno = t.hora_inicio?.substring(0, 5);
      return horaTurno === hora && t.estado !== 'cancelado';
    });
    return !!turnoEnEsteHorario;
  }

  esHorarioDisponible(hora: string): boolean {
    return this.horariosDisponibles.includes(hora) && !this.esHorarioOcupado(hora);
  }

  private bdToJs(diaBd: number): number {
    return diaBd === 7 ? 0 : diaBd;
  }


async cargarFechasDisponibles(): Promise<void> {
  if (!this.turnoData.especialistaId || !this.turnoData.especialidadId) return;

  try {
    console.log('🔍 Obteniendo horarios para especialista:', this.turnoData.especialistaId);
    
    const horarios = await this.disponibilidadSrv.obtenerHorariosPorEspecialista(
      this.turnoData.especialistaId
    );
    
    console.log('📅 Horarios obtenidos:', horarios);
    
    this.horariosConfigurados = horarios.filter(
      (h: any) => h.especialidad_id === this.turnoData.especialidadId && h.activo
    );
    
    console.log('🎯 Horarios configurados para especialidad:', this.horariosConfigurados);
    
    if (this.horariosConfigurados.length === 0) {
      console.warn('⚠️ No hay horarios configurados para esta especialidad');
      this.fechasDisponibles = [];
      this.pasoActual = 3;
      return;
    }
    
    const diasBd = [...new Set(this.horariosConfigurados.map((h: any) => h.dia_semana))];
    console.log('📆 Días de la semana configurados:', diasBd);
    
    this.generarFechasDisponibles(diasBd);
    this.pasoActual = 3;
    
  } catch (error) {
    console.error('❌ Error cargando fechas disponibles:', error);
    this.mostrarMensaje('Error', 'No se pudieron cargar las fechas disponibles', 'error');
  }
}
  async cargarEspecialidades(): Promise<void> {
    try {
      this.cargando = true;
      const especialidadesData = await this.especialidadSrv.obtenerTodas();
      this.especialidades = especialidadesData || [];
    } catch (error) {
      console.error('Error cargando especialidades:', error);
      this.mostrarMensaje('Error', 'No se pudieron cargar las especialidades', 'error');
    } finally {
      this.cargando = false;
    }
  }

  async cargarEspecialistas(): Promise<void> {
    try {
      this.cargando = true;
      const todosEspecialistas = await this.especialistaSrv.obtenerTodosEspecialistas();
      
      this.especialistas = todosEspecialistas
        .filter(esp => esp.estado === 'activo')
        .filter(async esp => {
          const especialidades = await this.especialistaSrv.obtenerEspecialidadesDeEspecialista(esp.id);
          return especialidades.some(e => e.id === this.turnoData.especialidadId);
        });

    } catch (error) {
      console.error('Error cargando especialistas:', error);
      this.mostrarMensaje('Error', 'No se pudieron cargar los especialistas', 'error');
    } finally {
      this.cargando = false;
    }
  }

  seleccionarEspecialidad(especialidad: any): void {
    this.turnoData.especialidadId = especialidad.id;
    this.turnoData.especialistaId = null;
    this.especialistaSeleccionado = null;
    this.pasoActual = 2;
    this.cargarEspecialistas();
  }

  seleccionarEspecialista(especialista: any): void {
    this.turnoData.especialistaId = especialista.id;
    this.especialistaSeleccionado = especialista;
    this.cargarFechasDisponibles();
  }

  

 generarFechasDisponibles(diasBd: number[]): void {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  this.fechasDisponibles = [];

  console.log('🔍 Días recibidos desde BD:', diasBd);
  
  if (!diasBd || diasBd.length === 0) {
    console.warn('⚠️ El especialista no tiene días configurados para esta especialidad');
    this.mostrarMensaje(
      'Sin disponibilidad', 
      'El especialista no tiene días configurados para esta especialidad', 
      'info'
    );
    return;
  }

  // Convertir días de BD a días de JavaScript
  const diasJsDisponibles = diasBd.map(diaBd => {
    switch(diaBd) {
      case 1: return 1; // Lunes
      case 2: return 2; // Martes
      case 3: return 3; // Miércoles
      case 4: return 4; // Jueves
      case 5: return 5; // Viernes
      case 6: return 6; // Sábado
      case 7: return 0; // Domingo (BD 7 = JS 0)
      default:
        console.warn(`⚠️ Día inválido en BD: ${diaBd}`);
        return null;
    }
  }).filter(dia => dia !== null) as number[];

  console.log('📅 Días disponibles (JS):', diasJsDisponibles);
  console.log('📅 Nombres días disponibles:', 
    diasJsDisponibles.map(d => 
      this.getNombreDiaBd(this.jsToBd(d))
    )
  );

  // Generar fechas para los próximos 15 días
  for (let i = 0; i < 15; i++) {
    const fecha = new Date();
    fecha.setDate(hoy.getDate() + i);
    fecha.setHours(0, 0, 0, 0);
    
    const diaJs = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    
    // Verificar si este día está disponible
    if (diasJsDisponibles.includes(diaJs)) {
      const fechaStr = fecha.toISOString().split('T')[0];
      const diaBd = this.jsToBd(diaJs);
      
      this.fechasDisponibles.push({
        label: `${this.getNombreDiaBd(diaBd)} ${fecha.getDate()}/${fecha.getMonth() + 1}`,
        value: fechaStr,
        diaSemana: diaBd,
        diaSemanaJs: diaJs,
        nombreDia: this.getNombreDiaBd(diaBd),
        diasDesdeHoy: i,
        fechaCompleta: fecha.toLocaleDateString('es-AR')
      });
    }
  }
  
  // Ordenar por fecha
  this.fechasDisponibles.sort((a, b) => a.diasDesdeHoy - b.diasDesdeHoy);
  
  console.log('📋 Total fechas disponibles:', this.fechasDisponibles.length);
  console.log('📋 Fechas:', this.fechasDisponibles.map(f => f.label));
  
  if (this.fechasDisponibles.length === 0) {
    this.mostrarMensaje(
      'Sin turnos disponibles', 
      'No hay fechas disponibles en los próximos 15 días para este especialista', 
      'info'
    );
  }
}

// Método auxiliar para convertir de JS a BD
private jsToBd(diaJs: number): number {
  return diaJs === 0 ? 7 : diaJs;
}

// Método para obtener nombre del día
getNombreDiaBd(diaBd: number | null | undefined): string {
  if (diaBd === null || diaBd === undefined) return '';
  const dias: {[key: number]: string} = {
    1: 'Lunes',
    2: 'Martes', 
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo'  // ✅ Incluir domingo
  };
  return dias[diaBd] || `Día ${diaBd}`;
}
  async seleccionarFecha(fecha: any): Promise<void> {
    this.turnoData.fecha = fecha.value;
    this.turnoData.diaSemana = fecha.diaSemana;

    if (this.turnoData.fecha && this.turnoData.especialistaId) {
      this.cleanupSubscriptions();
      this.disponibilidadSrv.limpiarSuscripcion();

      this.horariosDisponibles = await this.disponibilidadSrv.generarHorariosDisponibles(
        this.turnoData.especialistaId,
        this.turnoData.fecha
      );

      await this.cargarTurnosDelDia();

      this.turnosSrv.suscribirseATurnos(
        this.turnoData.especialistaId,
        this.turnoData.fecha,
        async () => {
          await this.cargarTurnosDelDia();
          this.horariosDisponibles = await this.disponibilidadSrv.generarHorariosDisponibles(
            this.turnoData.especialistaId!,
            this.turnoData.fecha!
          );
        }
      );
    }

    this.pasoActual = 4;
  }

  async cargarTurnosDelDia(): Promise<void> {
    if (!this.turnoData.especialistaId || !this.turnoData.fecha) return;
    
    try {
      const respuesta = await this.turnosSrv.obtenerTurnosPorEspecialistaYFecha(
        this.turnoData.especialistaId,
        this.turnoData.fecha
      );
      
      if (respuesta.data) {
        this.turnosDelDia = respuesta.data;
      }
    } catch (error) {
      console.error('Error cargando turnos del día:', error);
    }
  }

  seleccionarHorario(horario: string): void {
    if (!this.esHorarioDisponible(horario)) {
      this.mostrarMensaje('Horario no disponible', 'Este horario ya está ocupado', 'error');
      return;
    }
    
    this.turnoData.hora = horario;
    
    if (this.turnoData.diaSemana) {
      const horarioConfig = this.horariosConfigurados.find(
        (h) => h.dia_semana === this.turnoData.diaSemana
      );
      this.turnoData.duracion = horarioConfig?.duracion_consulta || 30;
    } else {
      this.turnoData.duracion = 30;
    }
  }

async solicitarTurno(): Promise<void> {
  console.log('🚀 INICIANDO solicitarTurno...');

  if (this.turnoData.hora && !this.esHorarioDisponible(this.turnoData.hora)) {
    this.mostrarMensaje('Horario ocupado', 'Este horario ya fue tomado por otro paciente', 'error');
    return;
  }

  if (this.esAdmin && !this.turnoData.pacienteId) {
    console.error('❌ Admin sin paciente seleccionado');
    this.mostrarMensaje('Error', 'Debes seleccionar un paciente', 'error');
    return;
  }

  if (!this.esAdmin && this.usuarioLogueado?.id) {
    this.turnoData.pacienteId = this.usuarioLogueado.id;
    console.log('✅ Paciente ID asignado:', this.turnoData.pacienteId);
  }

  if (
    !this.turnoData.pacienteId ||
    !this.turnoData.especialidadId ||
    !this.turnoData.especialistaId ||
    !this.turnoData.fecha ||
    !this.turnoData.hora
  ) {
    console.error('❌ Faltan datos requeridos');
    this.mostrarMensaje('Error', 'Faltan datos para solicitar el turno', 'error');
    return;
  }

  const [h, m] = this.turnoData.hora.split(':').map(Number);
  const duracion = this.turnoData.duracion || 30;
  let horaFinMin = m + duracion;
  let horaFinHora = h;
  if (horaFinMin >= 60) {
    horaFinHora += Math.floor(horaFinMin / 60);
    horaFinMin %= 60;
  }

  const payload = {
    paciente_id: this.turnoData.pacienteId,
    especialista_id: this.turnoData.especialistaId,
    especialidad_id: this.turnoData.especialidadId,
    fecha_turno: this.turnoData.fecha,
    hora_inicio: this.turnoData.hora,
    hora_fin: `${String(horaFinHora).padStart(2, '0')}:${String(horaFinMin).padStart(2, '0')}`,
    estado: 'solicitado'
  };

  console.log('📤 Payload final:', payload);

  this.procesando = true;
  try {
    console.log('🔄 Llamando a turnosSrv.crearTurno()...');
    const resp = await this.turnosSrv.crearTurno(payload);
    console.log('📥 Respuesta recibida:', resp);

    if (resp.error) {
      console.error('❌ Error en la respuesta:', resp.error);
      throw resp.error;
    }

    this.mostrarMensaje('Turno creado', 'Turno registrado correctamente', 'success');
    console.log('✅ Turno creado exitosamente');

    if (resp.data) {
      this.turnosDelDia.push(resp.data);
    }

    this.resetearFormulario();
  } catch (error: any) {
    console.error('💥 Error creando turno:', error);
    this.mostrarMensaje('Error', error.message || 'Problema al crear turno', 'error');
  } finally {
    this.procesando = false;
    console.log('🏁 Proceso finalizado');
  }
}

  resetearFormulario(): void {
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
      diaSemana: null,
    };
    this.fechasDisponibles = [];
    this.horariosDisponibles = [];
    this.horariosOcupados = [];
    this.horariosConfigurados = [];
    this.turnosDelDia = [];
    
    this.cleanupSubscriptions();
  }

  volverPasoAnterior(): void {
    if (this.pasoActual > 1) this.pasoActual--;
    
    if (this.pasoActual < 4) {
      this.turnoData.fecha = null;
      this.turnoData.hora = null;
      this.turnoData.diaSemana = null;
      this.horariosDisponibles = [];
      this.turnosDelDia = [];
      this.cleanupSubscriptions();
    }
  }
}