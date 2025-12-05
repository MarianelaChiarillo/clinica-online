import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MenuComponent } from './../componentes/menu/menu.component';
import { SpinnerComponent } from './../componentes/spinner/spinner.component';
import { MensajeComponent } from './../componentes/mensaje/mensaje.component';
import { FiltroGeneralComponent } from './../componentes/filtro-general/filtro-general.component';
import { UsuarioService } from './../../services/usuarios/usuario.service';
import { EspecialistaService } from './../../services/usuarios/especialista.service';
import { AdministradorService } from '../../services/usuarios/administrador.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { TurnoService } from '../../services/turnos.service';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';
import { ArchivosService } from '../../services/archivos.service';
import { HighlightCoincidenciaDirective } from '../../directives/coincidencias.directive';
import { AccionesTurnoDirective } from '../../directives/acciones.directive';
import { EstadoTurnoDirectiva } from '../../directives/estados.directive';
import { AccionesTurnoPipe } from '../../pipes/acciones.pipe';
import { CaptchaWrapperComponent } from './../componentes/captchaC/captcha-wrapper.component';
import { CaptchaDirectiva } from './../../directives/captcha.directive';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MensajeComponent,
    MenuComponent,
    SpinnerComponent,
    FiltroGeneralComponent,
    MenuComponent,
    HighlightCoincidenciaDirective,  
    AccionesTurnoDirective,          
    EstadoTurnoDirectiva,          
    AccionesTurnoPipe,
        CaptchaWrapperComponent,
        CaptchaDirectiva,
    
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
})

export class UsuarioComponente implements OnInit {
  @ViewChild('captchaWrapper') captchaWrapper!: CaptchaWrapperComponent;

  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  cargando = false;
  mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;
mostrarModalAdmin: boolean = false;
verClave: boolean = false;
verClaveR: boolean = false;
nombreArchivo: string = "";
cargandoAdmin: boolean = false;
 captchaPassed = false;
  captchaEnabled = true;
  // Modal admin
  formAdmin!: FormGroup;
  archivoSeleccionado: File | null = null;

  // Filtro
  textoFiltro: string = '';

  // Detalle usuario
  mostrarDetalleUsuario = false;
  usuarioSeleccionado: any = null;

  // Historia clínica por turno
  mostrarHistoriaTurno = false;
  historiaTurnoSeleccionada: any = null;
fileURL: string | null = null;

  constructor(
    private usuarioSrv: UsuarioService,
    private especialistaSrv: EspecialistaService,
    private adminSrv: AdministradorService,
    private authSrv: AuthService,
    private storage: StorageService,
    private turnosService: TurnoService,
    private historiaClinicaService: HistoriaClinicaService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private archivosService: ArchivosService,
    private usuarioService: UsuarioService
  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    await this.cargarUsuarios();
    
    this.initFormAdmin();

    this.cargando = false;
    
  }
 ngOnDestroy(): void {
    this.captchaWrapper?.limpiarCaptchaCompleto();
  }
ngAfterViewInit(): void {
  this.cargarCaptchaPersistente();
}

  // ================== CARGA DE USUARIOS ==================
async cargarUsuarios(): Promise<void> {
  try {
    this.usuarios = await this.usuarioSrv.obtenerTodos();
    console.log('Usuarios crudos desde DB:', this.usuarios);

    for (const usuario of this.usuarios) {
      usuario.imagen_perfil_url = usuario.imagen_perfil || './assets/user-default.png';

      if (usuario.tipo_usuario === 'paciente') {
        // Primero obtenemos el id de la tabla 'pacientes'
        const paciente = await this.usuarioSrv.obtenerRelacionado('pacientes', usuario.id);
        const pacienteId = paciente.data?.id;

        if (pacienteId) {
          const turnosData = await this.turnosService.obtenerTurnosDePacienteConDatos(pacienteId);
          console.log(`Turnos del paciente ${usuario.nombre} ${usuario.apellido}:`, turnosData.data);
          usuario.turnos = turnosData.data || [];
          usuario.historiasClinicas = await this.historiaClinicaService.obtenerPorPaciente(usuario.id);
        } else {
          usuario.turnos = [];
          usuario.historiasClinicas = [];
        }
      } else if (usuario.tipo_usuario === 'especialista') {
        const turnosData = await this.turnosService.obtenerTurnosDeEspecialista(usuario.id);
        console.log(`Turnos del especialista ${usuario.nombre} ${usuario.apellido}:`, turnosData.data);
        usuario.turnos = turnosData.data || [];
        usuario.historiasClinicas = [];
      } else {
        usuario.turnos = [];
        usuario.historiasClinicas = [];
      }
    }

    this.aplicarFiltro();
  } catch (error) {
    console.error(error);
    this.mostrarMensaje('Error', 'No se pudieron cargar los usuarios.', 'error');
  }
}


  // ================== FILTRO ==================
  onFiltroChange(texto: string): void {
    this.textoFiltro = texto.toLowerCase().trim();
    this.aplicarFiltro();
  }

  aplicarFiltro(): void {
    if (!this.textoFiltro) {
      this.usuariosFiltrados = [...this.usuarios];
      return;
    }

    this.usuariosFiltrados = this.usuarios.filter(u => {
      const nombreCompleto = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
      const tipo = u.tipo_usuario?.toLowerCase() || '';
      const email = u.email?.toLowerCase() || '';
      const dni = u.dni?.toString() || '';
      const obraSocial = u.obra_social?.toLowerCase() || '';
      const especialidades = u.especialidades?.join(' ').toLowerCase() || '';
      return [nombreCompleto, tipo, email, dni, obraSocial, especialidades].some(v => v.includes(this.textoFiltro));
    });
  }

  getTextoFiltro(): string {
    return this.textoFiltro;
  }

  // ================== DETALLE USUARIO ==================
  seleccionarUsuario(usuario: any) {
    this.usuarioSeleccionado = usuario;
    this.mostrarDetalleUsuario = true;
  }

  volverALista() {
    this.usuarioSeleccionado = null;
    this.mostrarDetalleUsuario = false;
  }

  verHistoriaClinica(usuario: any) {
    if (usuario.tipo_usuario !== 'paciente') {
      this.mostrarMensaje('Info', 'Solo los pacientes tienen historia clínica', 'info');
      return;
    }
    this.seleccionarUsuario(usuario);
  }

  tieneHistoriaClinica(turno: any): boolean {
    return !!this.usuarioSeleccionado?.historiasClinicas?.find((h: any) => h.turno_id === turno.id);
  }

  getHistoriaClinicaDelTurno(turno: any): any {
    return this.usuarioSeleccionado?.historiasClinicas?.find((h: any) => h.turno_id === turno.id) || null;
  }

  verHistoriaClinicaDelTurno(turno: any) {
    const historia = this.getHistoriaClinicaDelTurno(turno);
    if (!historia) {
      this.mostrarMensaje('Info', 'Este turno no tiene historia clínica registrada', 'info');
      return;
    }
    this.historiaTurnoSeleccionada = historia;
    this.mostrarHistoriaTurno = true;
  }

  cerrarHistoriaTurno() {
    this.historiaTurnoSeleccionada = null;
    this.mostrarHistoriaTurno = false;
  }

  // ================== MODAL ADMIN ==================
  private initFormAdmin() {
    this.formAdmin = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      dni: ['', [Validators.required, Validators.minLength(7)]],
      edad: ['', [Validators.required, Validators.min(18)]],
      clave: ['', [Validators.required, Validators.minLength(6)]],
      repiteClave: ['', Validators.required]
    }, { validators: this.confirmarClaveValidator });
  }

  private confirmarClaveValidator(form: FormGroup) {
    const clave = form.get('clave')?.value;
    const repite = form.get('repiteClave')?.value;
    return clave === repite ? null : { clavesNoCoinciden: true };
  }


  abrirModalAdmin() {
  this.mostrarModalAdmin = true;
}



  cerrarModalAdmin() {
    this.mostrarModalAdmin = false;
  }

  toggleVerClave() { this.verClave = !this.verClave; }
  toggleVerClaveR() { this.verClaveR = !this.verClaveR; }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      this.nombreArchivo = file.name;
    }
  }

  getErrorAdmin(campo: string): string {
    const control = this.formAdmin.get(campo);
    if (!control?.touched || !control.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Este campo es requerido';
    if (e['email']) return 'Email inválido';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['min']) return `Edad mínima: ${e['min'].min} años`;
    if (e['clavesNoCoinciden']) return 'Las contraseñas no coinciden';
    return 'Campo inválido';
  }

  async registrarAdmin() {
    Object.keys(this.formAdmin.controls).forEach(k => this.formAdmin.get(k)?.markAsTouched());
    if (this.formAdmin.invalid) {
      this.mostrarMensaje('Error', 'Por favor completá todos los campos requeridos.', 'error');
      return;
    } if (this.captchaEnabled && !this.captchaPassed) {
      this.mostrarMensaje('Error', 'Por favor completa el captcha.', 'error');
      return;
    }

    this.cargandoAdmin = true;

    try {
      const valores = this.formAdmin.value;
      const { data: usuarioExistente } = await this.usuarioSrv.obtenerPorEmail(valores.email);

if (usuarioExistente) {
  throw new Error('Ya existe un usuario registrado con este email.');
}


      const { user, error: authError } = await this.authSrv.registrar(valores.email, valores.clave);
      if (authError || !user) throw new Error(authError?.message || 'Error al registrar usuario.');

      const imagenUrl = this.archivoSeleccionado ? await this.storage.subirImagen(this.archivoSeleccionado) : undefined;

      await this.adminSrv.crearAdministrador({
        nombre: valores.nombre,
        apellido: valores.apellido,
        edad: valores.edad,
        dni: valores.dni,
        email: valores.email,
        auth_id: user.id,
        imagen_perfil: imagenUrl
      });

      this.mostrarMensaje('Éxito', 'Administrador creado correctamente.', 'success');
      this.cerrarModalAdmin();
      await this.cargarUsuarios();
    } catch (error: any) {
      console.error(error);
      this.mostrarMensaje('Error', error.message || 'No se pudo registrar el administrador.', 'error');
            this.cargarNuevoCaptcha();

    } finally {
      this.cargandoAdmin = false;
    }
  }
abrirAltaAdmin() {
  this.captchaPassed = false;
  this.captchaWrapper?.generarNuevoCaptchaWrapper();
}

async crearAdministradorDesdeAdmin() {

  const valores = this.formAdmin.value;

  const form = {
    nombre: valores.nombre,
    apellido: valores.apellido,
    edad: valores.edad,
    dni: valores.dni,
    email: valores.email,
    password: valores.password,
    imagen_perfil: this.fileURL || null
  };

  const resp = await this.usuarioService.crearAdministradorCompleto(form);

  if (!resp.ok) {
    this.mostrarMensaje('Error', 'No se pudo crear.', 'error');
    return;
  }

    this.mostrarMensaje('Éxito', 'Creado correctamente.', 'success');
  this.cerrarModalAdmin();
  this.cargarUsuarios();
}


  // ================== MENSAJES ==================
  mostrarMensaje(titulo: string, texto: string, tipo: 'error' | 'success' | 'info') {
    this.mensaje = { titulo, texto, tipo };
    setTimeout(() => this.mensaje = null, 4000);
  }

  // ================== TURNOS ==================
  getTotalTurnos(user: any): number {
    return user?.turnos?.length || 0;
  }

  getTurnosRealizados(user: any): number {
    return user?.turnos?.filter((t: any) => t.estado === 'realizado' || t.estado === 'completado')?.length || 0;
  }

  verturnos() { this.router.navigate(['/turnos/administrador']); }

  // ================== DESCARGA ==================
  async descargarHistoriaClinicaPDF(usuario: any) {
    if (usuario.tipo_usuario !== 'paciente') {
      this.mostrarMensaje('Info', 'Solo los pacientes tienen historia clínica', 'info');
      return;
    }
    try {
      await this.archivosService.descargarHistoriaClinicaCompleta(usuario, usuario.historiasClinicas, `historia-clinica-${usuario.nombre}.pdf`);
      this.mostrarMensaje('Éxito', 'PDF descargado correctamente', 'success');
    } catch {
      this.mostrarMensaje('Error', 'No se pudo generar el PDF', 'error');
    }
  }

  async descargarHistoriaClinicaTurno(historia: any) {
    try {
      await this.archivosService.descargarHistoriaClinicaIndividual(
        this.usuarioSeleccionado,
        historia,
        `historia-clinica-${this.usuarioSeleccionado.nombre}-${historia.turno?.fecha_turno}.pdf`
      );
      this.mostrarMensaje('Éxito', 'PDF descargado correctamente', 'success');
    } catch {
      this.mostrarMensaje('Error', 'No se pudo generar el PDF', 'error');
    }
  }


  // ================== ESPECIALISTAS ==================
  async toggleEstado(usuario: any) {
    if (usuario.tipo_usuario !== 'especialista') return;

    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';

    try {
      await this.especialistaSrv.actualizarDatos(usuario.auth_id, { estado: nuevoEstado });
      usuario.estado = nuevoEstado;
      this.mostrarMensaje('Actualizado', `El especialista ${usuario.nombre} ahora está ${nuevoEstado}.`, 'success');
    } catch (error) {
      console.error(error);
      this.mostrarMensaje('Error', 'No se pudo actualizar el estado del especialista.', 'error');
    }
  }


  // ================== DESCARGA TURNOS DEL PACIENTE ==================
async descargarTurnosPaciente(usuario: any) {
  try {
    if (usuario.tipo_usuario !== 'paciente') {
      this.mostrarMensaje('Info', 'Solo los pacientes tienen turnos', 'info');
      return;
    }

    // Llamamos al servicio para generar Excel de los turnos
    await this.archivosService.generarExcelTurnosPaciente(usuario);

    this.mostrarMensaje('Éxito', `Turnos de ${usuario.nombre} descargados correctamente`, 'success');
  } catch (error: any) {
    console.error(error);
    this.mostrarMensaje('Error', error.message || 'No se pudieron descargar los turnos', 'error');
  }
}
// En UsuarioComponente, actualiza estas funciones:

descargarExcelGeneral() {
  try {
    console.log('Descargando Excel General...');
    console.log('Usuarios filtrados:', this.usuariosFiltrados.length);
    
    if (this.usuariosFiltrados.length === 0) {
      this.mostrarMensaje('Info', 'No hay datos para exportar', 'info');
      return;
    }
    
    // Verifica que el servicio esté disponible
    if (!this.archivosService) {
      console.error('ArchivosService no está disponible');
      this.mostrarMensaje('Error', 'Servicio no disponible', 'error');
      return;
    }
    
    // Usa el nuevo método
    this.archivosService.exportarExcelUsuarios(
      this.usuariosFiltrados, 
      'usuarios_general'
    );
    
    this.mostrarMensaje('Éxito', 'Excel general descargado correctamente', 'success');
  } catch (error: any) {
    console.error('Error al descargar Excel:', error);
    this.mostrarMensaje('Error', error.message || 'No se pudo generar el Excel', 'error');
  }
}

async descargarExcelUsuario(usuario: any) {
  try {
    console.log('Descargando Excel para:', usuario.nombre);
    
    if (!usuario || usuario.tipo_usuario !== 'paciente') {
      this.mostrarMensaje('Info', 'Solo los pacientes tienen turnos', 'info');
      return;
    }
    
    // Verifica que haya turnos
    if (!usuario.turnos || usuario.turnos.length === 0) {
      this.mostrarMensaje('Info', 'No hay turnos para exportar', 'info');
      return;
    }
    
    console.log('Turnos del paciente:', usuario.turnos);
    
    // Llamada al servicio
    await this.archivosService.generarExcelTurnosPaciente(usuario);
    
    this.mostrarMensaje('Éxito', `Excel de ${usuario.nombre} descargado`, 'success');
  } catch (error: any) {
    console.error('Error:', error);
    this.mostrarMensaje('Error', error.message || 'No se pudo generar el Excel', 'error');
  }
}

ejecutarAccionTurno(accion: string, turno: any) {
  console.log(`Acción ejecutada: ${accion} para turno:`, turno);
  
  switch(accion) {
    case 'aceptar':
      this.mostrarMensaje('Info', 'Función aceptar turno', 'info');
      break;
    case 'rechazar':
      this.mostrarMensaje('Info', 'Función rechazar turno', 'info');
      break;
    case 'cancelar':
      this.mostrarMensaje('Info', 'Función cancelar turno', 'info');
      break;
    case 'finalizar':
      this.mostrarMensaje('Info', 'Función finalizar turno', 'info');
      break;
    case 'ver_resena':
      this.mostrarMensaje('Info', 'Función ver reseña', 'info');
      break;
    case 'completar_encuesta':
      this.mostrarMensaje('Info', 'Función completar encuesta', 'info');
      break;
    case 'calificar':
      this.mostrarMensaje('Info', 'Función calificar turno', 'info');
      break;
  }
}

// Método para filtrar turnos por estado
filtrarTurnosPorEstado(event: any) {
  const estado = event.target.value;
  // Implementa la lógica de filtrado según necesites
  console.log('Filtrar por estado:', estado);
}


onCaptchaSolved(esValido: boolean) { this.captchaPassed = esValido; }


  async cargarCaptchaPersistente(): Promise<void> {
    if (!this.captchaWrapper) {
      console.log('CaptchaWrapper no disponible aún');
      return;
    }
    
    try {
      const tokenGuardado = localStorage.getItem('captcha_token');
      if (tokenGuardado) {
        console.log('Intentando recuperar captcha persistente');
        const captchaData = await this.captchaWrapper.recuperarCaptcha(tokenGuardado);
        if (captchaData) {
          console.log('Captcha recuperado exitosamente');
          this.captchaPassed = true;
          return;
        }
      }
      
      // Si no hay token o no se pudo recuperar, generar uno nuevo
      console.log('Generando nuevo captcha');
      await this.cargarNuevoCaptcha();
    } catch (error) {
      console.error('Error al cargar captcha persistente:', error);
      await this.cargarNuevoCaptcha();
    }
  }

  async cargarNuevoCaptcha(): Promise<void> {
    if (!this.captchaWrapper) {
      console.error('CaptchaWrapper no disponible');
      return;
    }
    
    try {
      await this.captchaWrapper.generarNuevoCaptchaWrapper();
      this.captchaPassed = false;
      localStorage.removeItem('captcha_token');
    } catch (error) {
      console.error('Error al generar nuevo captcha:', error);
    }
  }

  onToggleCaptcha(): void {
    if (!this.captchaEnabled) {
      this.captchaPassed = true;
    } else {
      this.captchaPassed = false;
    }
    
    if (this.captchaWrapper) {
      this.captchaWrapper.toggleCaptcha();
    }
  }
}