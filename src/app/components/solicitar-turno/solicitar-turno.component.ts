import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs'; // Importa Subscription
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
import { StorageService } from '../../services/storage.service';

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
  ],
})
export class SolicitarTurnoComponent implements OnInit, OnDestroy { // Agrega OnDestroy
  pasoActual = 1;
  cargando = false;
  procesando = false;

  pacientes: any[] = [];
  pacientesFiltrados: any[] = [];
  pacienteSeleccionado: any = null;

  especialidades: any[] = [];
  especialistas: any[] = [];
  especialistaSeleccionado: any = null;

  fechasDisponibles: any[] = [];
  horariosConfigurados: any[] = [];
  horariosDisponibles: string[] = [];
  horariosOcupados: string[] = [];
  
  // Nuevas propiedades para manejar estados de turnos
  turnosDelDia: any[] = []; // Todos los turnos del día seleccionado
  horarioSubscription?: Subscription; // Suscripción a cambios en tiempo real

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
    private turnosSrv: TurnoService,
    private storageSrv: StorageService
  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    await this.delay(500);

    const user = await this.authSrv.getUsuarioActual();
    if (!user) {
      this.cargando = false;
      return;
    }

    const resp = await this.usuarioSrv.obtenerPorAuthId(user.id);
    this.usuarioLogueado = resp.data;

    if (!this.usuarioLogueado) {
      this.cargando = false;
      return;
    }

    this.esAdmin = this.usuarioLogueado.tipo_usuario === 'administrador';

    if (this.esAdmin) {
      await this.cargarPacientes();
    } else {
      const paciente = await this.pacienteSrv.obtenerPacientePorUsuario(this.usuarioLogueado.id);
      if (paciente) this.usuarioLogueado = paciente;
    }

    await this.cargarEspecialidades();
    this.cargando = false;
  }

  ngOnDestroy(): void {
    // Limpia las suscripciones cuando el componente se destruye
    this.cleanupSubscriptions();
  }

  private cleanupSubscriptions(): void {
    if (this.horarioSubscription) {
      this.horarioSubscription.unsubscribe();
    }
    // También limpia la suscripción del servicio
    this.disponibilidadSrv.limpiarSuscripcion();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async cargarPacientes(): Promise<void> {
    try {
      const supabasePacientes = await this.pacienteSrv.obtenerPacienteActual();
      this.pacientes = supabasePacientes ? [supabasePacientes] : [];
      this.pacientesFiltrados = [...this.pacientes];
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    }
  }

  filtrarPacientes(texto: string): void {
    if (!texto) {
      this.pacientesFiltrados = [...this.pacientes];
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

  trackByEspecialidad(index: number, especialidad: any): number {
    return especialidad.id;
  }

  trackByEspecialista(index: number, especialista: any): number {
    return especialista.id;
  }

  trackByPaciente(index: number, paciente: any): number {
    return paciente.id;
  }

  seleccionarPaciente(paciente: any): void {
    this.pacienteSeleccionado = paciente;
    this.turnoData.pacienteId = paciente.id;
  }

  getNombresDiasConfigurados(): string {
    if (!this.horariosConfigurados || this.horariosConfigurados.length === 0) return '';
    const dias = [...new Set(this.horariosConfigurados.map((h) => h.dia_semana))];
    return dias.map((d) => this.getNombreDiaBd(d)).join(', ');
  }

  esHorarioOcupado(hora: string): boolean {
    // Un horario está ocupado si hay un turno en ese horario con estado diferente a 'cancelado'
    const turnoEnEsteHorario = this.turnosDelDia.find(t => {
      const horaTurno = t.hora_inicio?.substring(0, 5);
      return horaTurno === hora && t.estado !== 'cancelado';
    });
    return !!turnoEnEsteHorario;
  }

  esHorarioDisponible(hora: string): boolean {
    // Un horario está disponible si está en horariosDisponibles y no está ocupado
    return this.horariosDisponibles.includes(hora) && !this.esHorarioOcupado(hora);
  }

  private bdToJs(diaBd: number): number {
    return diaBd === 7 ? 0 : diaBd;
  }

  private jsToBd(diaJs: number): number {
    return diaJs === 0 ? 7 : diaJs;
  }

  getNombreDiaBd(diaBd: number | null | undefined): string {
    if (diaBd === null || diaBd === undefined) {
      return '';
    }
    
    const dias: {[key: number]: string} = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado',
      7: 'Domingo'
    };
    return dias[diaBd] || '';
  }

  private getNombreDiaJs(diaJs: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[diaJs] || '';
  }

  async cargarEspecialidades(): Promise<void> {
    try {
      this.cargando = true;

      const especialidadesData = await this.especialidadSrv.obtenerTodas();

      if (!especialidadesData || especialidadesData.length === 0) {
        this.especialidades = [];
        return;
      }

      const especialidadesConImagen: any[] = [];
      
      for (const esp of especialidadesData) {
        const imagenUrl = await this.storageSrv.obtenerImagen(esp.imagen_url, 'especialidad');
        
        especialidadesConImagen.push({
          ...esp,
          imagen_url: imagenUrl
        });
      }

      this.especialidades = especialidadesConImagen;

    } catch (error: any) {
      console.error('Error cargando especialidades:', error);
    } finally {
      this.cargando = false;
    }
  }

  async cargarEspecialistas(): Promise<void> {
    try {
      this.cargando = true;

      const todosEspecialistas = await this.especialistaSrv.obtenerTodosEspecialistas();

      if (!todosEspecialistas || todosEspecialistas.length === 0) {
        this.especialistas = [];
        return;
      }

      const especialistasFiltrados: any[] = [];

      for (const esp of todosEspecialistas) {
        const imagenUrl = await this.storageSrv.obtenerImagen(esp.imagen_perfil, 'especialista');
        
        const espEspecialidades = await this.especialistaSrv.obtenerEspecialidadesDeEspecialista(esp.id);
        
        const tieneEspecialidad = espEspecialidades.some((e: any) => e.id === this.turnoData.especialidadId);

        if (tieneEspecialidad) {
          especialistasFiltrados.push({
            ...esp,
            imagen_perfil: imagenUrl
          });
        }
      }

      this.especialistas = especialistasFiltrados;

    } catch (error: any) {
      console.error('Error cargando especialistas:', error);
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

  async cargarFechasDisponibles(): Promise<void> {
    if (!this.turnoData.especialistaId || !this.turnoData.especialidadId) {
      return;
    }

    try {
      const horarios = await this.disponibilidadSrv.obtenerHorariosPorEspecialista(
        this.turnoData.especialistaId
      );
      
      this.horariosConfigurados = horarios;
      
      this.horariosConfigurados = this.horariosConfigurados.filter(
        (h) => h.especialidad_id === this.turnoData.especialidadId && h.activo
      );
      
      if (this.horariosConfigurados.length === 0) {
        this.fechasDisponibles = [];
        this.pasoActual = 3;
        return;
      }
      
      const diasBd = [...new Set(this.horariosConfigurados.map((h) => h.dia_semana))];
      
      this.generarFechasDisponibles(diasBd);
      
      this.pasoActual = 3;
      
    } catch (error: any) {
      console.error('Error cargando fechas disponibles:', error);
    }
  }

  generarFechasDisponibles(diasBd: number[]): void {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    this.fechasDisponibles = [];

    const diasBdFiltrados = diasBd.filter(dia => dia !== 7);
    if (diasBdFiltrados.length === 0) {
      return;
    }
    
    const diasJsFiltrados = diasBdFiltrados.map(diaBd => this.bdToJs(diaBd));
    
    for (let i = 0; i < 15; i++) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() + i);
      fecha.setHours(0, 0, 0, 0);
      
      const diaJs = fecha.getDay();
      
      if (diasJsFiltrados.includes(diaJs)) {
        const fechaStr = fecha.toISOString().split('T')[0];
        const diaBd = this.jsToBd(diaJs);
        
        this.fechasDisponibles.push({
          label: fechaStr,
          value: fechaStr,
          diaSemana: diaBd,
          diaSemanaJs: diaJs,
          nombreDia: this.getNombreDiaBd(diaBd),
          diasDesdeHoy: i
        });
      }
    }
    
    this.fechasDisponibles.sort((a, b) => a.diasDesdeHoy - b.diasDesdeHoy);
  }


async seleccionarFecha(fecha: any): Promise<void> {
  console.log("🟦 seleccionarFecha() — inicio");

  this.turnoData.fecha = fecha.value;
  this.turnoData.diaSemana = fecha.diaSemana;

  console.log("fecha recibida:", fecha);
  console.log("turnoData:", this.turnoData);

  if (this.turnoData.fecha && this.turnoData.especialistaId) {
    console.log("🟨 limpiando suscripciones...");
    this.cleanupSubscriptions();
    this.disponibilidadSrv.limpiarSuscripcion();

    console.log("🟩 cargando horarios disponibles...");
    this.horariosDisponibles = await this.disponibilidadSrv.generarHorariosDisponibles(
      this.turnoData.especialistaId,
      this.turnoData.fecha
    );
    console.log("horariosDisponibles:", this.horariosDisponibles);

    console.log("🟪 cargando turnos ocupados...");
    await this.cargarTurnosDelDia();

    console.log("🟧 seteando realtime...");
this.turnosSrv.suscribirseATurnos(
  this.turnoData.especialistaId,
  this.turnoData.fecha,
  async (evento) => {
    console.log("📡 Cambio en turno:", evento);

    await this.cargarTurnosDelDia(); 

    this.horariosDisponibles = await this.disponibilidadSrv.generarHorariosDisponibles(
      this.turnoData.especialistaId!,
      this.turnoData.fecha!
    );
  }
);


    console.log("🟫 suscribiendo al BehaviorSubject...");
    this.horarioSubscription = this.disponibilidadSrv.horariosDisponibles$
      .subscribe(async (horarios) => {
        console.log("📡 actualización realtime horarios:", horarios);

        // ❗ FIX: si viene null o array vacío → NO pisar horarios correctos
        if (!horarios || horarios.length === 0) return;

        this.horariosDisponibles = horarios;
        await this.cargarTurnosDelDia();
      });
  }

  this.pasoActual = 4;
  console.log("🟦 seleccionarFecha() — FIN");
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
        console.log('📋 Turnos del día cargados:', this.turnosDelDia);
      }
    } catch (error) {
      console.error('Error cargando turnos del día:', error);
    }
  }

  seleccionarHorario(horario: string): void {
    // Solo permitir seleccionar si el horario está disponible
    if (!this.esHorarioDisponible(horario)) {
      MensajeComponent.show({
        titulo: 'Horario no disponible',
        mensaje: 'Este horario ya está ocupado',
        tipo: 'warning',
      });
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
    
    // Validar que el horario aún esté disponible
    if (this.turnoData.hora && !this.esHorarioDisponible(this.turnoData.hora)) {
      MensajeComponent.show({
        titulo: 'Horario ocupado',
        mensaje: 'Este horario ya fue tomado por otro paciente',
        tipo: 'error',
      });
      return;
    }

    if (this.esAdmin && !this.turnoData.pacienteId) {
      console.error('❌ Admin sin paciente seleccionado');
      MensajeComponent.show({
        titulo: 'Error',
        mensaje: 'Debes seleccionar un paciente',
        tipo: 'error',
      });
      return;
    }

    if (!this.esAdmin && this.usuarioLogueado?.id) {
      this.turnoData.pacienteId = this.usuarioLogueado.id;
      console.log('✅ Paciente ID asignado:', this.turnoData.pacienteId);
    }

    console.log('🔍 Validando datos requeridos...');
    console.log('- pacienteId:', this.turnoData.pacienteId);
    console.log('- especialidadId:', this.turnoData.especialidadId);
    console.log('- especialistaId:', this.turnoData.especialistaId);
    console.log('- fecha:', this.turnoData.fecha);
    console.log('- hora:', this.turnoData.hora);
    console.log('- duracion:', this.turnoData.duracion);

    if (
      !this.turnoData.pacienteId ||
      !this.turnoData.especialidadId ||
      !this.turnoData.especialistaId ||
      !this.turnoData.fecha ||
      !this.turnoData.hora
    ) {
      console.error('❌ Faltan datos requeridos');
      MensajeComponent.show({
        titulo: 'Error',
        mensaje: 'Faltan datos para solicitar el turno',
        tipo: 'error',
      });
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

      MensajeComponent.show({
        titulo: 'Turno creado',
        mensaje: 'Turno registrado correctamente',
        tipo: 'success',
      });

      console.log('✅ Turno creado exitosamente');
      
      // Agregar el nuevo turno a la lista local
      if (resp.data) {
        this.turnosDelDia.push(resp.data);
      }
      
      // No resetear el formulario completamente, solo volver al paso 1
      this.resetearFormularioParcial();
      
    } catch (error: any) {
      console.error('💥 Error creando turno:', error);
      MensajeComponent.show({
        titulo: 'Error',
        mensaje: error.message || 'Problema al crear turno',
        tipo: 'error',
      });
    } finally {
      this.procesando = false;
      console.log('🏁 Proceso finalizado');
    }
  }

  resetearFormularioParcial(): void {
    // Solo resetea datos básicos, manteniendo especialista y fecha si se quiere agendar otro turno
    this.pasoActual = 1;
    this.pacienteSeleccionado = null;
    this.turnoData.pacienteId = null;
    this.turnoData.hora = null;
    this.turnoData.duracion = null;
    
    // Si es admin, limpia todo
    if (this.esAdmin) {
      this.resetearFormulario();
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
    
    // Limpia suscripciones
    this.cleanupSubscriptions();
  }

  getNombreDia(diaSemana: number | null | undefined): string {
    return this.getNombreDiaBd(diaSemana);
  }

  volverPasoAnterior(): void {
    if (this.pasoActual > 1) this.pasoActual--;
    
    // Si volvemos al paso 3 o anterior, limpiamos datos de fecha/horario
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