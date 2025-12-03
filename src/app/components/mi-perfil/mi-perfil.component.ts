import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { PacienteService } from '../../services/usuarios/paciente.service';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';
import { ArchivosService } from '../../services/archivos.service';
import { MenuComponent } from './../componentes/menu/menu.component';
import { SpinnerComponent } from '../componentes/spinner/spinner.component';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent, SpinnerComponent],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {

  perfil: any = null;
  cargando = true;

  historiaClinica: any[] = [];
  historiaFiltrada: any[] = [];

  especialistasAtendidos: any[] = [];
  especialistaSeleccionado: string = "todos";

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private pacienteService: PacienteService,
    private historiaClinicaService: HistoriaClinicaService,
    private archivoService: ArchivosService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.cargando = true;

    const usuarioActual = await this.authService.getUsuarioActual();
    if (!usuarioActual) {
      this.router.navigate(['/login']);
      return;
    }

    this.perfil = await this.usuarioService.obtenerPerfilCompleto(usuarioActual.id);

    if (this.esPaciente()) {
      await this.cargarHistoriaClinica();
    }

    this.cargando = false;
  }

  esPaciente(): boolean {
    return this.perfil?.tipo_usuario === 'paciente';
  }

  esEspecialista(): boolean {
    return this.perfil?.tipo_usuario === 'especialista';
  }

  async cargarHistoriaClinica() {
    const usuarioId = this.perfil.usuario_id ?? this.perfil.id;
    this.historiaClinica = await this.historiaClinicaService.obtenerPorPaciente(usuarioId);
    this.historiaFiltrada = [...this.historiaClinica];

    const map = new Map();
    this.historiaClinica.forEach(h => {
      const esp = h.turno?.especialista;
      if (esp && !map.has(esp.id)) map.set(esp.id, esp);
    });

    this.especialistasAtendidos = Array.from(map.values());
  }

  filtrarPorEspecialista() {
    if (this.especialistaSeleccionado === 'todos') {
      this.historiaFiltrada = [...this.historiaClinica];
    } else {
      this.historiaFiltrada = this.historiaClinica.filter(
        h => h.turno?.especialista?.id?.toString() === this.especialistaSeleccionado.toString()
      );
    }
  }

  contarHistoriasPorEspecialista(id: string): number {
    return this.historiaClinica.filter(h => h.turno?.especialista?.id === id).length;
  }


descargarPDF() {
  const columnas = [
    { key: 'fecha_turno', header: 'Fecha' },
    { key: 'especialidad', header: 'Especialidad' },
    { key: 'especialista', header: 'Especialista' },
    { key: 'altura', header: 'Altura' },
    { key: 'peso', header: 'Peso' },
    { key: 'temperatura', header: 'Temperatura' },
    { key: 'presion', header: 'Presión' },
  ];

  const datos = this.historiaFiltrada.map(h => ({
    fecha_turno: h.turno?.fecha_turno || '',
    especialidad: h.turno?.especialidad?.nombre || '',
    especialista: h.turno?.especialista ? `${h.turno.especialista.nombre} ${h.turno.especialista.apellido}` : '',
    altura: h.altura,
    peso: h.peso,
    temperatura: h.temperatura,
    presion: h.presion
  }));

  this.archivoService.exportarPDF(
    `Historia Clínica - ${this.perfil.nombre} ${this.perfil.apellido}`,
    datos,
    columnas,
    `HistoriaClinica-${this.perfil.apellido}`
  );
}


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

  navegarAHorarios() {
    this.router.navigate(['/horarios']);
  }
}
