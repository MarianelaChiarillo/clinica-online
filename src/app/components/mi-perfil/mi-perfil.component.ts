// mi-perfil.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { PacienteService } from '../../services/usuarios/paciente.service';
import { EspecialistaService } from '../../services/usuarios/especialista.service';
import { AdministradorService } from '../../services/usuarios/administrador.service';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {

  perfil: any = null;
  cargando = true;
  editando = false;

  historiaClinica: any[] = [];
  historiaFiltrada: any[] = [];

  especialistasAtendidos: any[] = [];
  especialistaSeleccionado: string = "todos";

  datosEditados = {
    nombre: '',
    apellido: '',
    edad: 0,
    dni: '',
    obra_social: ''
  };

  archivoSeleccionado: File | null = null;
  segundaImagenSeleccionada: File | null = null;
  previewImagen: string | null = null;
  previewSegundaImagen: string | null = null;

  constructor(
    private authService: AuthService,
    private pacienteService: PacienteService,
    private especialistaService: EspecialistaService,
    private administradorService: AdministradorService,
    private historiaClinicaService: HistoriaClinicaService,
        private pdfService: PdfService // 👈 NUEVO SERVICIO

  ) {}

  // ============================================================
  // INIT
  // ============================================================
  async ngOnInit() {
    await this.cargarPerfil();

    if (this.esPaciente()) {
      await this.cargarHistoriaClinica();
    }
  }

  // ============================================================
  // PERFIL
  // ============================================================
  async cargarPerfil() {
    this.cargando = true;
    this.perfil = await this.authService.obtenerPerfilCompleto();
    this.cargando = false;
  }

  iniciarEdicion() {
    this.editando = true;
    this.datosEditados = {
      nombre: this.perfil?.nombre || '',
      apellido: this.perfil?.apellido || '',
      edad: this.perfil?.edad || 0,
      dni: this.perfil?.dni || '',
      obra_social: this.perfil?.obra_social || ''
    };
  }

  cancelarEdicion() {
    this.editando = false;
    this.archivoSeleccionado = null;
    this.segundaImagenSeleccionada = null;
    this.previewImagen = null;
    this.previewSegundaImagen = null;
  }

  async guardarCambios() {
    if (!this.perfil) return;

    try {
      if (this.archivoSeleccionado) {
        await this.authService.actualizarImagenPerfil(this.archivoSeleccionado);
      }

      if (this.perfil.tipo_usuario === 'paciente' && this.segundaImagenSeleccionada) {
        await this.authService.actualizarSegundaImagenPaciente(this.segundaImagenSeleccionada);
      }

      switch (this.perfil.tipo_usuario) {
        case 'paciente':
          await this.pacienteService.actualizarDatos(this.perfil.id, this.datosEditados);
          break;
        case 'especialista':
          await this.especialistaService.actualizarDatos(this.perfil.id, this.datosEditados);
          break;
        case 'administrador':
          await this.administradorService.actualizarDatos(this.perfil.id, this.datosEditados);
          break;
      }

      this.editando = false;
      await this.cargarPerfil();

    } catch (error) {
      console.error('Error guardando cambios:', error);
    }
  }



  // ============================================================
  // ARCHIVOS
  // ============================================================
  onFileSelected(event: any, tipo: 'principal' | 'segunda') {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (tipo === 'principal') {
        this.archivoSeleccionado = file;
        this.previewImagen = e.target.result;
      } else {
        this.segundaImagenSeleccionada = file;
        this.previewSegundaImagen = e.target.result;
      }
    };

    reader.readAsDataURL(file);
  }

  // ============================================================
  // GETTERS
  // ============================================================
  getTipoUsuarioTexto(): string {
    switch (this.perfil?.tipo_usuario) {
      case 'paciente': return 'Paciente';
      case 'especialista': return 'Especialista';
      case 'administrador': return 'Administrador';
      default: return 'Usuario';
    }
  }

  getEstadoTexto(): string {
    switch (this.perfil?.estado) {
      case 'activo': return 'Activo';
      case 'pendiente': return 'Pendiente de aprobación';
      case 'inactivo': return 'Inactivo';
      default: return this.perfil?.estado || '';
    }
  }

  esPaciente(): boolean {
    return this.perfil?.tipo_usuario === 'paciente';
  }

  // ============================================================
  // PDF
  // ============================================================
  

  descargarPDF = async () => {
    try {
      await this.pdfService.descargarHistoriaClinicaCompleta(
        this.perfil,
        this.historiaFiltrada,
        `historia-clinica-${this.perfil.nombre}.pdf`
      );
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  };


  // En mi-perfil.component.ts - CORREGIR la función cargarHistoriaClinica

// CORREGIR también la función de filtrado
filtrarPorEspecialista() {
  if (this.especialistaSeleccionado === 'todos') {
    this.historiaFiltrada = [...this.historiaClinica];
    return;
  }

  const idEspecialista = Number(this.especialistaSeleccionado);
  
  this.historiaFiltrada = this.historiaClinica.filter(h => 
    h.turno?.especialistas?.[0]?.id === idEspecialista
  );
  
  console.log('🔍 Filtrado por especialista:', idEspecialista, 'Resultados:', this.historiaFiltrada.length);
}

// En mi-perfil.component.ts - CORREGIR la función cargarHistoriaClinica
async cargarHistoriaClinica() {
  try {
    // Obtener el usuario_id del perfil, no el paciente_id
    const usuarioId = this.perfil.usuario_id || this.perfil.id;
    
    console.log('🔄 Cargando historia clínica para USUARIO ID:', usuarioId);
    console.log('📋 Datos completos del perfil:', this.perfil);
    
    this.historiaClinica = await this.historiaClinicaService.obtenerHistoriaClinicaDePaciente(usuarioId);
    
    console.log('📊 Historia clínica cargada:', this.historiaClinica);

    // Extraer especialistas únicos
    const especialistasUnicos = new Map();
    
    this.historiaClinica.forEach(h => {
      if (h.turno?.especialista) {
        const esp = h.turno.especialista;
        if (!especialistasUnicos.has(esp.id)) {
          especialistasUnicos.set(esp.id, esp);
        }
      }
    });

    this.especialistasAtendidos = Array.from(especialistasUnicos.values());
    this.historiaFiltrada = [...this.historiaClinica];

    console.log('👨‍⚕️ Especialistas encontrados:', this.especialistasAtendidos);
    console.log('📋 Historias filtradas:', this.historiaFiltrada.length);

  } catch (error) {
    console.error('❌ Error cargando historia clínica:', error);
    this.historiaClinica = [];
    this.historiaFiltrada = [];
  }
}

// En mi-perfil.component.ts - AGREGAR este método
contarHistoriasPorEspecialista(especialistaId: number): number {
  return this.historiaClinica.filter(h => 
    h.turno?.especialista?.id === especialistaId
  ).length;
}

}
