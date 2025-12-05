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
import { ActivatedRoute } from '@angular/router';
import { HistoriaResumenPipe } from '../../pipes/historia-clinica.pipe'; // Ajusta la ruta

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent, SpinnerComponent,HistoriaResumenPipe],
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
    private router: Router,
      private route: ActivatedRoute,

  ) {}

async ngOnInit() {
  this.cargando = true;

  const usuarioActual = await this.authService.getUsuarioActual();
  if (!usuarioActual) {
    this.router.navigate(['/login']);
    return;
  }

  // Primero cargamos el perfil completo
  this.perfil = await this.usuarioService.obtenerPerfilCompleto(usuarioActual.id);

  // Ahora sí podemos comparar con el rol de la ruta
  const rolRuta = this.route.snapshot.data['rol']; // 'paciente', 'especialista' o 'administrador'
  if (rolRuta && this.perfil?.tipo_usuario !== rolRuta) {
    // Redirigir si no coincide
    this.router.navigate(['/home/' + this.perfil.tipo_usuario]);
    return;
  }

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



 async descargarPDF() {
    if (!this.historiaFiltrada || this.historiaFiltrada.length === 0) {
      this.mostrarMensaje('Info', 'No hay historias clínicas para descargar', 'info');
      return;
    }

    try {
      this.cargando = true;
      
      // Obtener el nombre del especialista seleccionado
      let nombreEspecialista = 'todos';
      let tituloPDF = '';
      
      if (this.especialistaSeleccionado !== 'todos') {
        const especialista = this.especialistasAtendidos.find(
          esp => esp.id.toString() === this.especialistaSeleccionado
        );
        
        if (especialista) {
          nombreEspecialista = `${especialista.nombre} ${especialista.apellido}`;
          tituloPDF = `Historias clínicas con Dr. ${nombreEspecialista}`;
        }
      } else {
        tituloPDF = 'Todas mis historias clínicas';
      }
      
      // Preparar datos para el PDF
      const datosPDF = {
        paciente: {
          nombre: this.perfil.nombre,
          apellido: this.perfil.apellido,
          dni: this.perfil.dni,
          obraSocial: this.perfil.obra_social
        },
        especialista: nombreEspecialista,
        historias: this.historiaFiltrada,
        fechaGeneracion: new Date().toLocaleDateString('es-AR'),
        totalAtenciones: this.historiaFiltrada.length
      };
      
      // Llamar al servicio para generar PDF
      await this.archivoService.descargarHistoriaClinicaCompletaP(
        this.perfil,
        this.historiaFiltrada,
        `historia-clinica-${this.perfil.nombre}-${nombreEspecialista}`
      );
      
      this.mostrarMensaje('Éxito', `PDF descargado correctamente (${this.historiaFiltrada.length} atenciones)`, 'success');
      
    } catch (error: any) {
      console.error('Error al descargar PDF:', error);
      this.mostrarMensaje('Error', 'No se pudo generar el PDF', 'error');
    } finally {
      this.cargando = false;
    }
  }
  
  // Método para mostrar mensajes
  private mostrarMensaje(titulo: string, texto: string, tipo: 'error' | 'success' | 'info') {
    // Implementa tu lógica de mensajes aquí
    console.log(`${tipo}: ${titulo} - ${texto}`);
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
    this.router.navigate(['/horarios/especialista']);
  }
}
