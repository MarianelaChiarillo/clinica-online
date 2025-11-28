import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';
import { PdfService } from '../../services/pdf.service';
import { MenuComponent } from './../componentes/menu/menu.component';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {

  perfil: any = null;
  cargando = true;

  // Historia clínica
  historiaClinica: any[] = [];
  historiaFiltrada: any[] = [];

  // Filtro especialistas
  especialistasAtendidos: any[] = [];
  especialistaSeleccionado: string = "todos";

  constructor(
    private authService: AuthService,
    private historiaClinicaService: HistoriaClinicaService,
    private pdfService: PdfService
  ) {}

  // ============================================================
  // INIT
  // ============================================================
// En mi-perfil.component.ts - temporalmente
async ngOnInit() {
  await this.cargarPerfil();

  if (this.esPaciente()) {
    // Llamar al debug temporalmente
    await this.historiaClinicaService.debugHistoriaClinicaEstructura(this.perfil.usuario_id ?? this.perfil.id);
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

  esPaciente(): boolean {
    return this.perfil?.tipo_usuario === 'paciente';
  }

  // ============================================================
  // HISTORIA CLÍNICA COMPLETA CON TURNOS Y ESPECIALISTAS
  // ============================================================

  async cargarHistoriaClinica() {
  const usuarioId = this.perfil.usuario_id ?? this.perfil.id;

  this.historiaClinica =
    await this.historiaClinicaService.obtenerHistoriaClinicaDePaciente(usuarioId);

  this.historiaFiltrada = [...this.historiaClinica];

  /// extraer especialistas
  const map = new Map();

  this.historiaClinica.forEach(h => {
    const esp = h.turno?.especialista;
    if (esp && !map.has(esp.id)) {
      map.set(esp.id, esp);
    }
  });

  this.especialistasAtendidos = Array.from(map.values());

        console.log("HISTORIA CLÍNICA:", this.historiaClinica);
console.log("ESPECIALISTAS ATENDIDOS:", this.especialistasAtendidos);

}


  // ============================================================
  // FILTRAR HISTORIA POR ESPECIALISTA
  // ============================================================
 // En mi-perfil.component.ts - MÉTODO MEJORADO
filtrarPorEspecialista() {
  console.log('🔍 Filtrando por especialista:', this.especialistaSeleccionado);
  
  if (this.especialistaSeleccionado === 'todos') {
    this.historiaFiltrada = [...this.historiaClinica];
  } else {
    this.historiaFiltrada = this.historiaClinica.filter(
      h => h.turno?.especialista?.id?.toString() === this.especialistaSeleccionado.toString()
    );
  }
  
  console.log('✅ Resultados filtrados:', this.historiaFiltrada.length);
}

  contarHistoriasPorEspecialista(id: string): number {
    return this.historiaClinica.filter(
      h => h.turno?.especialista?.id === id
    ).length;
  }

  // ============================================================
  // DESCARGAR PDF
  // ============================================================
  descargarPDF() {
    this.pdfService.descargarHistoriaClinicaCompleta(
      this.perfil,
      this.historiaFiltrada,
      `HistoriaClinica-${this.perfil.apellido}.pdf`
    );
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

}
