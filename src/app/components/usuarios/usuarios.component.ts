import { Component, OnInit } from '@angular/core';
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
    FiltroGeneralComponent
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
})
export class UsuarioComponente implements OnInit {

  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  cargando = false;
  mensaje: { titulo: string; texto: string; tipo: 'error' | 'success' | 'info' } | null = null;

  // Modal admin
  mostrarModalAdmin = false;
  formAdmin!: FormGroup;
  cargandoAdmin = false;
  verClave = false;
  verClaveR = false;
  nombreArchivo: string | null = null;
  archivoSeleccionado: File | null = null;

  // Filtro
  textoFiltro: string = '';

  // Detalle usuario
  mostrarDetalleUsuario = false;
  usuarioSeleccionado: any = null;

  // Historia clínica por turno
  mostrarHistoriaTurno = false;
  historiaTurnoSeleccionada: any = null;

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
    private archivosService: ArchivosService
  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    await this.cargarUsuarios();
    this.initFormAdmin();
    this.cargando = false;
  }

  // ================== CARGA DE USUARIOS ==================
async cargarUsuarios(): Promise<void> {
  try {
    this.usuarios = await this.usuarioSrv.obtenerTodos();

    // Asignar la imagen de perfil directamente desde la DB o fallback
    this.usuarios.forEach(u => {
      u.imagen_perfil_url = u.imagen_url || './assets/user-default.png';
    });

    // Cargar turnos e historias
    for (const usuario of this.usuarios) {
      if (usuario.tipo_usuario === 'paciente') {
        usuario.turnos = (await this.turnosService.obtenerTurnosDePaciente(usuario.id)).data || [];
        usuario.historiasClinicas = await this.historiaClinicaService.obtenerPorPaciente(usuario.id);
      } else if (usuario.tipo_usuario === 'especialista') {
        usuario.turnos = (await this.turnosService.obtenerTurnosDeEspecialista(usuario.id)).data || [];
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
    this.formAdmin.reset();
    this.archivoSeleccionado = null;
    this.nombreArchivo = null;
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
    }

    this.cargandoAdmin = true;

    try {
      const valores = this.formAdmin.value;
      const usuarioExistente = await this.usuarioSrv.obtenerPorEmail(valores.email);
      if (usuarioExistente) throw new Error('Ya existe un usuario registrado con este email.');

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
    } finally {
      this.cargandoAdmin = false;
    }
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

  descargarExcelGeneral() {
    try {
      this.archivosService.generarExcelUsuariosGeneral(this.usuariosFiltrados);
      this.mostrarMensaje('Éxito', 'Excel general descargado correctamente', 'success');
    } catch (error: any) {
      this.mostrarMensaje('Error', error.message || 'No se pudo generar el Excel', 'error');
    }
  }

  async descargarExcelUsuario(usuario: any) {
    try {
      await this.archivosService.generarExcelTurnosPaciente(usuario);
      this.mostrarMensaje('Éxito', `Excel de turnos de ${usuario.nombre} descargado`, 'success');
    } catch (error: any) {
      this.mostrarMensaje('Error', error.message || 'No se pudo generar el Excel', 'error');
    }
  }

  // ================== ESPECIALISTAS ==================
  async toggleEstado(usuario: any) {
    if (usuario.tipo_usuario !== 'especialista') return;

    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';

    try {
      // actualizar solo estado
      await this.especialistaSrv.actualizarDatos(usuario.auth_id, { estado: nuevoEstado });
      usuario.estado = nuevoEstado;
      this.mostrarMensaje('Actualizado', `El especialista ${usuario.nombre} ahora está ${nuevoEstado}.`, 'success');
    } catch (error) {
      console.error(error);
      this.mostrarMensaje('Error', 'No se pudo actualizar el estado del especialista.', 'error');
    }
  }
}
