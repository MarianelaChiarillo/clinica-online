import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { utils, writeFile } from 'xlsx';
import { ExcelService } from '../../services/excel.service'; // ← Nueva importación
import { MenuComponent } from './../componentes/menu/menu.component';
import { LayoutComponent } from './../componentes/layout/layout.component';
import { SpinnerComponent } from './../componentes/spinner/spinner.component';
import { MensajeComponent } from './../componentes/mensaje/mensaje.component';
import { FiltroGeneralComponent } from './../componentes/filtro-general/filtro-general.component';
import { UsuarioService } from './../../services/usuarios/usuario.service';
import { EspecialistaService } from './../../services/usuarios/especialista.service';
import { AdministradorService } from '../../services/usuarios/administrador.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { TurnosService } from '../../services/turnos.service';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-administrador',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    MensajeComponent, 
    MenuComponent, 
    SpinnerComponent,
    LayoutComponent,
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
  
  // Control del modal y formulario
  mostrarModalAdmin = false;
  formAdmin!: FormGroup;
  cargandoAdmin = false;
  verClave = false;
  verClaveR = false;
  nombreArchivo: string | null = null;
  archivoSeleccionado: File | null = null;

  // Filtro actual
  textoFiltro: string = '';

  // Propiedades para Excel y detalle
  mostrarDetalleUsuario = false;
  usuarioSeleccionado: any = null;

  // 👇 NUEVAS PROPIEDADES PARA HISTORIA CLÍNICA DE TURNOS
  mostrarHistoriaTurno = false;
  historiaTurnoSeleccionada: any = null;
turno: any = null;
  constructor(
    private usuarioSrv: UsuarioService,
    private especialistaSrv: EspecialistaService,
    private adminSrv: AdministradorService,
    private authSrv: AuthService,
    private storage: StorageService,
    private turnosService: TurnosService,
    private historiaClinicaService: HistoriaClinicaService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
        private pdfService: PdfService,
          private excelService: ExcelService,


  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    await this.cargarUsuarios();
    this.cargando = false;
    this.initFormAdmin();
  }

  // ========== MÉTODOS EXISTENTES (gestión de usuarios) ==========
  
  async cargarUsuarios(): Promise<void> {
    try {
      this.usuarios = await this.usuarioSrv.obtenerTodos();
      // Cargar datos completos para Excel
      await this.cargarDatosCompletosUsuarios();
      this.aplicarFiltro();
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      this.mostrarMensaje('Error', 'No se pudieron cargar los usuarios.', 'error');
    }
  }

  // MÉTODO: Cargar datos completos para Excel
// En el método cargarDatosCompletosUsuarios - CORREGIR
async cargarDatosCompletosUsuarios(): Promise<void> {
  for (let usuario of this.usuarios) {
    try {
      console.log(`🔄 Cargando datos para usuario: ${usuario.nombre} (${usuario.tipo_usuario})`);
      
      if (usuario.tipo_usuario === 'paciente') {
        // IMPORTANTE: Usar el ID correcto del paciente
        const pacienteId = usuario.id || usuario.paciente_id;
        usuario.turnos = await this.turnosService.obtenerTurnosPorPacienteId(pacienteId);
        
        // Cargar historia clínica usando el usuario_id
        usuario.historiasClinicas = await this.historiaClinicaService.obtenerHistoriaClinicaDePaciente(usuario.id);
        
      } else if (usuario.tipo_usuario === 'especialista') {
        const especialistaId = usuario.id || usuario.especialista_id;
        usuario.turnos = await this.turnosService.obtenerTurnosPorEspecialistaId(especialistaId);
        usuario.historiasClinicas = []; // Especialistas no tienen historia clínica
      } else {
        usuario.turnos = [];
        usuario.historiasClinicas = [];
      }
      
      console.log(`✅ Usuario ${usuario.nombre}:`, {
        turnos: usuario.turnos?.length || 0,
        historias: usuario.historiasClinicas?.length || 0,
        tipo: usuario.tipo_usuario
      });
      
    } catch (error) {
      console.error(`❌ Error cargando datos para usuario ${usuario.id}:`, error);
      usuario.turnos = [];
      usuario.historiasClinicas = [];
    }
  }
}
  async toggleEstado(usuario: any): Promise<void> {
    if (usuario.tipo_usuario !== 'especialista') return;

    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';

    try {
      await this.especialistaSrv.actualizarEstadoYEspecialidades(usuario.auth_id, nuevoEstado);
      usuario.estado = nuevoEstado;

      this.mostrarMensaje(
        'Actualizado',
        `El especialista ${usuario.nombre ?? ''} ${
          usuario.apellido ?? ''
        } ahora está ${nuevoEstado}.`,
        'success'
      );
    } catch (error) {
      console.error(error);
      this.mostrarMensaje('Error', 'No se pudo actualizar el estado del especialista.', 'error');
    }
  }

  mostrarMensaje(titulo: string, texto: string, tipo: 'error' | 'success' | 'info') {
    this.mensaje = { titulo, texto, tipo };
    setTimeout(() => (this.mensaje = null), 4000);
  }

  verturnos() {
    this.router.navigate(['/turnos/administrador']);
  }

  // ========== MÉTODOS DE FILTRO MEJORADOS ==========

  onFiltroChange(texto: string): void {
    this.textoFiltro = texto.toLowerCase().trim();
    this.aplicarFiltro();
  }

  aplicarFiltro(): void {
    if (!this.textoFiltro) {
      this.usuariosFiltrados = [...this.usuarios];
      return;
    }

    this.usuariosFiltrados = this.usuarios.filter(usuario => 
      this.coincideConFiltro(usuario, this.textoFiltro)
    );
  }

  private coincideConFiltro(usuario: any, texto: string): boolean {
    // Buscar en nombre y apellido
    const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.toLowerCase();
    if (nombreCompleto.includes(texto)) {
      return true;
    }

    // Buscar en tipo de usuario
    const tipoUsuario = usuario.tipo_usuario?.toLowerCase() || '';
    if (tipoUsuario.includes(texto)) {
      return true;
    }

    // Buscar en email
    const email = usuario.email?.toLowerCase() || '';
    if (email.includes(texto)) {
      return true;
    }

    // Buscar en DNI
    const dni = usuario.dni?.toString() || '';
    if (dni.includes(texto)) {
      return true;
    }

    // Buscar en especialidades (para especialistas)
    if (usuario.especialidades && Array.isArray(usuario.especialidades)) {
      const especialidades = usuario.especialidades.join(' ').toLowerCase();
      if (especialidades.includes(texto)) {
        return true;
      }
    }

    // Buscar en obra social (para pacientes)
    const obraSocial = usuario.obra_social?.toLowerCase() || '';
    if (obraSocial.includes(texto)) {
      return true;
    }

    return false;
  }

  getTextoFiltro(): string {
    return this.textoFiltro;
  }

  // ========== MÉTODOS PARA TURNOS EN CARDS ==========


 
  // ========== MÉTODOS PARA HISTORIA CLÍNICA DE TURNOS ==========

  // 👇 MÉTODO QUE FALTABA - VERIFICAR SI UN TURNO TIENE HISTORIA CLÍNICA
  tieneHistoriaClinica(turno: any): boolean {
    if (!this.usuarioSeleccionado?.historiasClinicas || !Array.isArray(this.usuarioSeleccionado.historiasClinicas)) {
      return false;
    }
    
    // Buscar si existe una historia clínica para este turno
    const historia = this.usuarioSeleccionado.historiasClinicas.find(
      (h: any) => h.turno_id === turno.id
    );
    
    return !!historia;
  }

  // 👇 MÉTODO PARA OBTENER LA HISTORIA CLÍNICA DE UN TURNO ESPECÍFICO
  getHistoriaClinicaDelTurno(turno: any): any {
    if (!this.usuarioSeleccionado?.historiasClinicas || !Array.isArray(this.usuarioSeleccionado.historiasClinicas)) {
      return null;
    }
    
    return this.usuarioSeleccionado.historiasClinicas.find(
      (h: any) => h.turno_id === turno.id
    );
  }

  // 👇 MÉTODO PARA VER LA HISTORIA CLÍNICA DE UN TURNO
  verHistoriaClinicaDelTurno(turno: any): void {
    if (!this.tieneHistoriaClinica(turno)) {
      this.mostrarMensaje('Info', 'Este turno no tiene historia clínica registrada', 'info');
      return;
    }
    
    this.historiaTurnoSeleccionada = this.getHistoriaClinicaDelTurno(turno);
    this.mostrarHistoriaTurno = true;
    
    console.log('📋 Historia clínica del turno:', this.historiaTurnoSeleccionada);
  }

  // 👇 MÉTODO PARA CERRAR EL MODAL DE HISTORIA CLÍNICA
  cerrarHistoriaTurno(): void {
    this.mostrarHistoriaTurno = false;
    this.historiaTurnoSeleccionada = null;
  }

  // 👇 MÉTODO PARA DESCARGAR PDF DE HISTORIA CLÍNICA ESPECÍFICA

  // ========== MÉTODOS PARA HISTORIA CLÍNICA GENERAL ==========

  verHistoriaClinica(usuario: any) {
    if (usuario.tipo_usuario !== 'paciente') {
      this.mostrarMensaje('Info', 'Solo los pacientes tienen historia clínica', 'info');
      return;
    }
    this.usuarioSeleccionado = usuario;
    this.mostrarDetalleUsuario = true;
  }

 



  volverALista() {
    this.mostrarDetalleUsuario = false;
    this.usuarioSeleccionado = null;
  }

  // ========== MÉTODOS NUEVOS (formulario admin modal) ==========

  private initFormAdmin(): void {
    this.formAdmin = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      dni: ['', [Validators.required, Validators.minLength(7)]],
      edad: ['', [Validators.required, Validators.min(18)]],
      clave: ['', [Validators.required, Validators.minLength(6)]],
      repiteClave: ['', Validators.required],
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
    this.nombreArchivo = null;
    this.archivoSeleccionado = null;
  }

  cerrarModalAdmin() {
    this.mostrarModalAdmin = false;
  }

  toggleVerClave() {
    this.verClave = !this.verClave;
  }

  toggleVerClaveR() {
    this.verClaveR = !this.verClaveR;
  }

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

    const errores = control.errors;
    if (errores['required']) return 'Este campo es requerido';
    if (errores['email']) return 'Email inválido';
    if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
    if (errores['min']) return `Edad mínima: ${errores['min'].min} años`;
    if (errores['clavesNoCoinciden']) return 'Las contraseñas no coinciden';
    
    return 'Campo inválido';
  }

  async registrarAdmin() {
    Object.keys(this.formAdmin.controls).forEach(key => {
      this.formAdmin.get(key)?.markAsTouched();
    });

    if (this.formAdmin.invalid) {
      this.mostrarMensaje('Error', 'Por favor completá todos los campos requeridos.', 'error');
      return;
    }

    this.cargandoAdmin = true;

    try {
      const valores = this.formAdmin.value;

      // Verificar si el email ya existe
      const usuarioExistente = await this.authSrv.obtenerPorEmail(valores.email);
      if (usuarioExistente) {
        throw new Error('Ya existe un usuario registrado con este email.');
      }

      // Registrar en Auth
      const { user, error: authError } = await this.authSrv.registrar(valores.email, valores.clave);
      if (authError || !user) throw new Error(authError?.message || 'Error al registrar usuario.');

      // Subir imagen
      const imagenUrl = this.archivoSeleccionado
        ? await this.storage.subirImagen(this.archivoSeleccionado)
        : undefined;

      // Crear administrador
      await this.adminSrv.crearAdministrador({
        nombre: valores.nombre,
        apellido: valores.apellido,
        edad: valores.edad,
        dni: valores.dni,
        email: valores.email,
        auth_id: user.id,
        imagen_perfil: imagenUrl,
      });

      this.mostrarMensaje('Éxito', 'Administrador creado correctamente.', 'success');
      this.cerrarModalAdmin();
      await this.cargarUsuarios();
      this.aplicarFiltro();

    } catch (error: any) {
      console.error('Error registrando admin:', error);
      this.mostrarMensaje('Error', error.message || 'No se pudo registrar el administrador.', 'error');
    } finally {
      this.cargandoAdmin = false;
    }
  }

  async descargarHistoriaClinicaPDF(usuario: any) {
    if (usuario.tipo_usuario !== 'paciente') {
      this.mostrarMensaje('Info', 'Solo los pacientes tienen historia clínica', 'info');
      return;
    }

    try {
      await this.pdfService.descargarHistoriaClinicaCompleta(
        usuario,
        usuario.historiasClinicas,
        `historia-clinica-${usuario.nombre}.pdf`
      );
      this.mostrarMensaje('Éxito', 'PDF descargado correctamente', 'success');
    } catch (error) {
      console.error('Error generando PDF:', error);
      this.mostrarMensaje('Error', 'No se pudo generar el PDF', 'error');
    }
  }

  // ============================================================
  // PDF PARA HISTORIA CLÍNICA INDIVIDUAL (del modal)
  // ============================================================
  async descargarHistoriaClinicaTurno(historia: any) {
    try {
      await this.pdfService.descargarHistoriaClinicaIndividual(
        this.usuarioSeleccionado,
        historia,
        `historia-clinica-${this.usuarioSeleccionado.nombre}-${historia.turno?.fecha_turno}.pdf`
      );
      this.mostrarMensaje('Éxito', 'PDF descargado correctamente', 'success');
    } catch (error) {
      console.error('Error generando PDF:', error);
      this.mostrarMensaje('Error', 'No se pudo generar el PDF', 'error');
    }
  }
descargarExcelGeneral() {
  try {
    this.excelService.generarExcelUsuariosGeneral(this.usuariosFiltrados);
    this.mostrarMensaje('Éxito', 'Excel general descargado correctamente', 'success');
  } catch (error: any) {
    console.error('Error generando Excel general:', error);
    this.mostrarMensaje('Error', error.message || 'No se pudo generar el Excel', 'error');
  }
}

// En usuarios.component.ts - Método corregido
async descargarExcelUsuario(usuario: any) {
  try {
    console.log('🎯 Iniciando descarga de Excel para:', usuario.nombre);
    
    // Debug: ver estructura de turnos
    
    await this.excelService.generarExcelTurnosPaciente(usuario);
    this.mostrarMensaje('Éxito', `Excel de turnos de ${usuario.nombre} descargado`, 'success');
    
  } catch (error: any) {
    console.error('❌ Error generando Excel individual:', error);
    this.mostrarMensaje('Error', error.message || 'No se pudo generar el Excel', 'error');
  }
}
getTotalTurnos(user: any): number {
  if (!user || !user.turnos || !Array.isArray(user.turnos)) {
    console.log(`❌ No hay turnos para usuario: ${user?.nombre}`, user?.turnos);
    return 0;
  }
  console.log(`✅ ${user.nombre} tiene ${user.turnos.length} turnos`);
  return user.turnos.length;
}

getTurnosRealizados(user: any): number {
  if (!user || !user.turnos || !Array.isArray(user.turnos)) {
    return 0;
  }
  
  const realizados = user.turnos.filter((t: any) => 
    t.estado === 'realizado' || t.estado === 'completado'
  ).length;
  
  console.log(`📊 ${user.nombre}: ${realizados} turnos realizados de ${user.turnos.length}`);
  return realizados;
}

// Agregar este método para debug
debugUsuario(usuario: any): void {
  console.log('🔍 DEBUG USUARIO:', {
    id: usuario.id,
    nombre: usuario.nombre,
    tipo: usuario.tipo_usuario,
    turnos: usuario.turnos,
    countTurnos: usuario.turnos?.length,
    historias: usuario.historiasClinicas,
    countHistorias: usuario.historiasClinicas?.length
  });
  
  if (usuario.turnos && Array.isArray(usuario.turnos)) {
    usuario.turnos.forEach((turno: any, index: number) => {
      console.log(`   Turno ${index + 1}:`, {
        id: turno.id,
        fecha: turno.fecha_turno,
        estado: turno.estado,
        especialidad: turno.especialidad_id
      });
    });
  }
}

// Llamar este método cuando selecciones un usuario
seleccionarUsuario(usuario: any) {
  this.usuarioSeleccionado = usuario;
  this.mostrarDetalleUsuario = true;
  
  // DEBUG: Verificar datos del usuario
  this.debugUsuario(usuario);
}


// En tu servicio de turnos, verifica que estos métodos funcionen correctamente
async verificarServicioTurnos(): Promise<void> {
  try {
    // Test con un usuario específico
    const testPacienteId = 1; // Cambia por un ID real
    const turnos = await this.turnosService.obtenerTurnosPorPacienteId(testPacienteId);
    console.log('🧪 TEST Servicio Turnos:', turnos);
  } catch (error) {
    console.error('❌ ERROR Servicio Turnos:', error);
  }
}
}
