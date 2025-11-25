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
import supabase from '../../services/supabase.client';

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  templateUrl: './solicitar-turno.component.html',
  styleUrl: './solicitar-turno.component.scss',
  imports: [CommonModule, FormsModule, FiltroGeneralComponent]
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


  turnoData: any = {
    pacienteId: null,
    especialidadId: null,
    especialistaId: null,
    fecha: null,
    hora: null,
    duracion: null
  };

  constructor(
    private authSrv: AuthService,
    private usuarioSrv: UsuarioService,
    private especialistaSrv: EspecialistaService,
    private especialidadSrv: EspecialidadService,
    private horariosService: HorariosService,
    private turnosService: TurnosService
  ){}
async ngOnInit() {
  console.log('🔵 Iniciando Solicitar Turno');

  // 1️⃣ Obtener sesión
  const user = await this.authSrv.getUsuarioActual();
  if (!user) {
    console.error('❌ No hay sesión activa');
    return;
  }

  // 2️⃣ Obtener usuario por authId
  const { data: usuario } = await this.usuarioSrv.obtenerPorAuthId(user.id);

  if (!usuario) {
    console.error('❌ Usuario no encontrado en BD');
    return;
  }

  this.usuarioLogueado = usuario;  // ← Guardamos el usuario en memoria

  // 3️⃣ Detectar rol
  this.esAdmin = usuario.tipo_usuario === 'administrador';
  console.log('🔐 Rol detectado → esAdmin:', this.esAdmin);

  // 4️⃣ Si es ADMIN → cargar pacientes
  if (this.esAdmin) {
    await this.cargarPacientes();
  } 
  else {
    // 5️⃣ Si es PACIENTE → buscar su registro real en la tabla pacientes
    const { data: pacienteReal, error } = await this.usuarioSrv.obtenerPacientePorUsuarioId(usuario.id);

    if (error || !pacienteReal) {
      console.error('❌ No se encontró paciente para este usuario');
    } else {
      console.log("🧍 Paciente logueado encontrado:", pacienteReal);
      this.usuarioLogueado = pacienteReal.id;  // ← ESTE ES EL IMPORTANTE
    }
  }

  // 6️⃣ Cargar especialidades
  await this.cargarEspecialidades();
}


  // =======================================================
  // PACIENTES
  // =======================================================

  async cargarPacientes() {
  try {
    const pacientes = await this.usuarioSrv.obtenerPacientes(); // devuelve array

    if (!pacientes) {
      console.warn('⚠️ No llegó lista de pacientes');
      return;
    }

    this.pacientes = pacientes;
    this.pacientesFiltrados = [...pacientes];

    console.log('📌 Pacientes cargados:', this.pacientes);

  } catch (error) {
    console.error('❌ Error cargando pacientes:', error);
  }
}

  filtrarPacientes(texto: string){
    if(!texto){
      this.pacientesFiltrados = this.pacientes;
      return;
    }

    const f = texto.toLowerCase();

    this.pacientesFiltrados = this.pacientes.filter(p =>{
      return (
        p.nombre?.toLowerCase().includes(f) ||
        p.apellido?.toLowerCase().includes(f) ||
        p.dni?.toString().includes(f)
      );
    });
  }

async seleccionarPaciente(usuario: any) {
  const { data: pacienteData, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('usuario_id', usuario.id)
    .single();

  if (error || !pacienteData) {
    console.error("❌ No se encontró el paciente en la tabla pacientes", error);
    return;
  }

  console.log("Paciente real encontrado:", pacienteData);

  this.pacienteSeleccionado = pacienteData;

  // 🟩 ESTA ERA LA LÍNEA QUE FALTABA
  this.turnoData.pacienteId = pacienteData.id;

  console.log("✔ pacienteId seteado:", this.turnoData.pacienteId);
}


  // =======================================================
  // ESPECIALIDADES
  // =======================================================

async cargarEspecialidades() {
  try {
    const especialidades = await this.especialidadSrv.obtenerTodas(); // devuelve array

    this.especialidades = especialidades || [];

    console.log('📚 Especialidades cargadas:', this.especialidades);
  } catch (error) {
    console.error('❌ Error cargando especialidades:', error);
  }
}

  onEspecialidadSelect(){
    console.log('➡️ Selección de especialidad ID:', this.turnoData.especialidadId);

    this.turnoData.especialistaId = null;
    this.especialistaSeleccionado = null;
    this.pasoActual = 2;

    this.cargarEspecialistas();
  }

  // =======================================================
  // ESPECIALISTAS
  // =======================================================

 async cargarEspecialistas() {
  try {
    const especialistas = await this.especialistaSrv.obtenerPorEspecialidad(
      this.turnoData.especialidadId
    ); // también devuelve array

    this.especialistas = especialistas || [];

    console.log('👨‍⚕️ Especialistas cargados:', this.especialistas);
  } catch (error) {
    console.error('❌ Error cargando especialistas:', error);
  }
}

  async onEspecialistaSelect(){
    console.log('➡️ Entró a onEspecialistaSelect');

    if(!this.turnoData.especialistaId) return;

    this.especialistaSeleccionado = this.especialistas.find(
      e => e.id == this.turnoData.especialistaId
    );

    console.log('👨‍⚕️ Especialista seleccionado:', this.especialistaSeleccionado);

    const horarios = await this.horariosService.obtenerHorariosPorEspecialista(
      this.turnoData.especialistaId
    );

    console.log('📅 Horarios recibidos del backend:', horarios);

    this.horariosConfigurados = horarios.filter(
      h => h.especialidad_id == this.turnoData.especialidadId && h.activo
    );

    console.log('🔍 Horarios filtrados:', this.horariosConfigurados);

    const dias = this.horariosConfigurados.map(h => h.dia_semana);
    console.log('📅 Días donde trabaja:', dias);

    this.generarFechasDisponibles(dias);

    this.pasoActual = 3;
  }

  // =======================================================
  // FECHAS DISPONIBLES
  // =======================================================

  generarFechasDisponibles(diasPermitidos: number[]){
    this.fechasDisponibles = [];

    const hoy = new Date();

    for(let i=0; i<15; i++){
      const fecha = new Date();
      fecha.setDate(hoy.getDate() + i);

      if(diasPermitidos.includes(fecha.getDay())){
        this.fechasDisponibles.push({
          label: fecha.toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'short'
          }),
          value: fecha.toISOString().split('T')[0]
        });
      }
    }

    console.log('📆 Fechas generadas:', this.fechasDisponibles);
  }

  seleccionarFecha(f:any){
    console.log('📌 Seleccionaste fecha:', f);

    this.turnoData.fecha = f.value;

    console.log('📅 turnoData.fecha luego de asignar:', this.turnoData.fecha);

    this.onFechaSelect();
  }

  // =======================================================
  // HORARIOS
  // =======================================================

async onFechaSelect() {
  console.log('🟦 Entró a onFechaSelect()');
  console.log('📅 turnoData.fecha:', this.turnoData.fecha);

  if (!this.turnoData.fecha) return;

  const dia = this.getDiaSemana(this.turnoData.fecha);

  const horario = this.horariosConfigurados.find(h => h.dia_semana === dia);

  if (!horario) {
    console.warn('⚠️ No existe horario para este día');
    this.horariosDisponibles = [];
    return;
  }

  console.log('🟧 Horario elegido:', horario);

  // ✅ GUARDAR DURACIÓN DEL TURNO (lo que te faltaba)
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

  this.horariosDisponibles = this.todosLosHorarios
    .filter(h => !this.horariosOcupados.includes(h));

  console.log('🟢 Horarios disponibles:', this.horariosDisponibles);

  this.pasoActual = 4;
}

getDiaSemana(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

  generarSlots(inicio:string, fin:string, duracion:number): string[]{
    const lista:string[] = [];

    let [h, m] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);

    while(h < hFin || (h === hFin && m < mFin)){
      lista.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);

      m += duracion;
      if(m >= 60){ h++; m -= 60; }
    }

    return lista;
  }
volverPasoAnterior() {
    if (this.pasoActual > 1) {
      this.pasoActual--;
    }
  }
esHorarioOcupado(hora: string): boolean {
    return this.horariosOcupados.includes(hora);
  }
async solicitarTurno() {
  console.log('📤 Enviar turno:', this.turnoData);

  // ------------------------------------------------------------------
  // 1️⃣ ASIGNAR PACIENTE ANTES DE TODO
  // ------------------------------------------------------------------
  if (!this.esAdmin) {
    this.turnoData.pacienteId = this.usuarioLogueado;  // ← ESTE ES EL BUENO
  } else {
    this.turnoData.pacienteId = this.pacienteSeleccionado?.id || null;
  }

  // ------------------------------------------------------------------
  // 2️⃣ VALIDACIONES
  // ------------------------------------------------------------------
  if (!this.turnoData.pacienteId) {
    console.error("❌ Falta paciente");
    return;
  }
  if (!this.turnoData.especialistaId) {
    console.error("❌ Falta especialista");
    return;
  }
  if (!this.turnoData.especialidadId) {
    console.error("❌ Falta especialidad");
    return;
  }
  if (!this.turnoData.fecha) {
    console.error("❌ Falta fecha");
    return;
  }
  if (!this.turnoData.hora) {
    console.error("❌ Falta horario");
    return;
  }
  if (!this.turnoData.duracion) {
    console.error("❌ Falta duración del turno");
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

  const horaFin = `${String(horaFinHora).padStart(2, '0')}:${String(horaFinMin).padStart(2, '0')}`;

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
    duracion: this.turnoData.duracion
  };

  console.log("📦 Payload final enviado al service:", payload);

  // ------------------------------------------------------------------
  // 5️⃣ ENVIAR AL SERVICE
  // ------------------------------------------------------------------
  const resp = await this.turnosService.crearTurno(payload);

  console.log("📥 Respuesta crearTurno():", resp);

  if (resp.error) {
    console.error("❌ Error creando turno:", resp.error.message);
    return;
  }

  console.log("✅ Turno creado correctamente:", resp.data);
}

}
