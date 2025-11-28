import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { EstadisticasService } from '../../services/usuarios/estadisticas.service';
import { ExportacionService } from '../../services/usuarios/exportacion.service';

Chart.register(...registerables);

@Component({
  selector: 'app-estadisticas-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas-admin.component.html',
  styleUrls: ['./estadisticas-admin.component.scss']
})
export class EstadisticasAdminComponent implements OnInit, AfterViewInit, OnDestroy {
  // Filtros
  fechaInicio: string = '';
  fechaFin: string = '';
  medicoSeleccionado: string = 'todos';
  
  // NUEVO: Filtro para seleccionar la Especialidad en el gráfico
  filtroEspecialidadSeleccionada: string = 'todos'; 
  
  // Lista de médicos
  medicos: any[] = [];
  // NUEVO: Lista de especialidades únicas para el dropdown
  especialidadesDisponibles: { id: string, nombre: string }[] = []; 
  
  // Datos
  logIngresos: any[] = [];
  turnosPorEspecialidad: any[] = []; // Usado para mostrar: Especialidad/Estado y Cantidad
  turnosPorDia: any[] = [];
  turnosSolicitadosPorMedico: any[] = [];
  turnosFinalizadosPorMedico: any[] = [];
  turnosPorMedicoEspecifico: any[] = [];
  // NECESARIO: Almacena los turnos crudos para poder aplicar filtros en el componente
  turnosSinAgrupar: any[] = []; 

  // Charts
  chartEspecialidad: Chart | null = null;
  chartPorDia: Chart | null = null;
  chartMedicosSolicitados: Chart | null = null;
  chartMedicosFinalizados: Chart | null = null;
  chartMedicoEspecifico: Chart | null = null;

  loading = false;
  filtrosAplicados = false;
  datosDisponibles: any = {};

  // Colores para gráficos de torta
  coloresTorta = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
    '#FF9F40', '#FF6384', '#C9CBCF', '#7EBF7F', '#E87B7B',
    '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71', '#F39C12'
  ];

  constructor(
    private estadisticasService: EstadisticasService,
    private exportacionService: ExportacionService
  ) {}

// estadisticas-admin.component.ts

// ...

async ngOnInit() {
    await this.verificarDatos();
    this.establecerFechasPorDefecto();
    await this.cargarDatosIniciales();
    // 🛑 QUITA ESTA LÍNEA si ya la llamas dentro de cargarDatosIniciales()
    // this.crearGraficosIniciales(); 
}

ngAfterViewInit() {
    // 🛑 QUITA ESTA LÍNEA, la inicialización debe esperar a los datos en ngOnInit
    // this.crearGraficosIniciales(); 
}



  ngOnDestroy() {
    this.destruirGraficos();
  }

  async verificarDatos() {
    this.datosDisponibles = await this.estadisticasService.verificarDatosDisponibles();
    console.log('📊 Datos disponibles:', this.datosDisponibles);
    
    if (!this.datosDisponibles.tieneTurnos) {
      console.warn('⚠️ No hay turnos en la base de datos');
    }
  }

  establecerFechasPorDefecto() {
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 30);
    
    this.fechaFin = fechaFin.toISOString().split('T')[0];
    this.fechaInicio = fechaInicio.toISOString().split('T')[0];
  }

  async cargarDatosIniciales() {
    this.loading = true;
    try {
      // Cargar médicos
      this.medicos = await this.estadisticasService.obtenerMedicos();
      this.medicos.unshift({
        id: 'todos',
        nombre_completo: '👥 Todos los médicos',
        especialidad: 'Resumen general'
      });

      // Cargar datos sin filtro (se espera 'turnosCompletos' del servicio)
      const datosSinFiltro = await this.estadisticasService.obtenerDatosSinFiltro();
      this.logIngresos = datosSinFiltro.logIngresos;
      this.turnosSinAgrupar = datosSinFiltro.turnosCompletos; 
      
      // NUEVO: Generar la lista de especialidades para el SELECT
      this.especialidadesDisponibles = this.getUniqueSpecialties(this.turnosSinAgrupar);

      // Inicializar el gráfico con la distribución general por especialidad
      this.turnosPorEspecialidad = this.procesarTurnosPorEspecialidadGeneral(this.turnosSinAgrupar);

      this.crearGraficosIniciales();
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    } finally {
      this.loading = false;
    }
  }

  async cargarDatosConFiltro() {
    if (!this.fechaInicio || !this.fechaFin) {
      alert('Por favor, selecciona ambas fechas');
      return;
    }

    this.loading = true;
    this.destruirGraficosFiltrados();
    
    try {
      const datos = await this.estadisticasService.obtenerDatosConFiltro(
        this.fechaInicio, 
        this.fechaFin, 
        this.medicoSeleccionado
      );

      this.turnosPorDia = datos.turnosPorDia;
      this.turnosSolicitadosPorMedico = datos.turnosSolicitados;
      this.turnosFinalizadosPorMedico = datos.turnosFinalizados;
      this.turnosPorMedicoEspecifico = datos.turnosMedicoEspecifico;

      this.filtrosAplicados = true;

      setTimeout(() => {
        this.crearGraficosFiltrados();
      }, 100);

    } catch (error) {
      console.error('Error cargando datos con filtro:', error);
    } finally {
      this.loading = false;
    }
  }

  async aplicarFiltros() {
    await this.cargarDatosConFiltro();
  }
  
  /** Lógica del nuevo filtro de especialidad */
  filtrarGraficoEspecialidad() {
    const selectedSpecialty = this.filtroEspecialidadSeleccionada;
    
    if (selectedSpecialty === 'todos') {
      // Muestra el resumen general por especialidad
      this.turnosPorEspecialidad = this.procesarTurnosPorEspecialidadGeneral(this.turnosSinAgrupar);
    } else {
      // Muestra la distribución por ESTADO para la especialidad seleccionada
      const datosPorEstado = this.procesarTurnosPorEstadoPorEspecialidad(
        this.turnosSinAgrupar,
        selectedSpecialty
      );
      // Adaptamos la estructura para que la tabla y el gráfico puedan usarla, 
      // usando 'especialidad' para el nombre del estado.
      this.turnosPorEspecialidad = datosPorEstado.map(item => ({
        especialidad: this.translateStatus(item.estado), 
        cantidad: item.cantidad
      }));
    }

    this.crearGraficoEspecialidad(); 
  }
  
  /** * Procesa la lista de turnos para agrupar por Especialidad. 
   * Se usa para la opción 'Todas las Especialidades' del filtro.
   */
  private procesarTurnosPorEspecialidadGeneral(turnos: any[]): any[] {
    const agrupado = (turnos || []).reduce((acc: any, turno: any) => {
        const especialidadNombre = turno.especialidades?.nombre || 'Sin especialidad';
        acc[especialidadNombre] = (acc[especialidadNombre] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(agrupado).map(([especialidad, cantidad]) => ({
        especialidad,
        cantidad
    }));
  }

  /** * Procesa la lista de turnos para filtrar por una Especialidad 
   * y luego agrupar por Estado del turno.
   */
 // ... (dentro de tu clase EstadisticasAdminComponent)

  // ... (dentro de tu clase EstadisticasAdminComponent)

private procesarTurnosPorEstadoPorEspecialidad(turnos: any[], especialidadNombre: string): { estado: string, cantidad: number }[] {
    
    // 1. DECLARACIÓN E INICIALIZACIÓN DE LA VARIABLE
    let turnosFiltrados = turnos; // Inicializamos con la lista completa

    // 2. Filtrar por la Especialidad si no es 'todos'
    if (especialidadNombre !== 'todos') {
        // En este caso, ya no usamos 'const' o 'let' aquí, sino que reasignamos:
        turnosFiltrados = turnos.filter((t: any) => t.especialidades?.nombre === especialidadNombre);
    }
    
    // 3. Agrupar por Estado (estado)
    // El resto del código que usa 'turnosFiltrados' ahora tendrá acceso a la variable
    const agrupado = (turnosFiltrados || []).reduce((acc: any, turno: any) => {
        const estado = turno.estado || 'desconocido';
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
    }, {});
    
    // 4. Convertir a array de objetos { estado, cantidad }
    return Object.entries(agrupado).map(([estado, cantidad]) => ({
        estado,
        cantidad: cantidad as number 
    }));
}
  
  /** Genera la lista única de especialidades para el dropdown */
  private getUniqueSpecialties(turnos: any[]): { id: string, nombre: string }[] {
    const specialtiesSet = new Set();
    // Opción por defecto
    const uniqueSpecs = [{ id: 'todos', nombre: 'Todas las Especialidades' }];

    (turnos || []).forEach(turno => {
        const specName = turno.especialidades?.nombre;
        if (specName && !specialtiesSet.has(specName)) {
            specialtiesSet.add(specName);
            uniqueSpecs.push({ id: specName, nombre: specName });
        }
    });
    return uniqueSpecs;
  }
  
  /** Traduce la clave del estado (ej. 'solicitado') a un nombre para mostrar ('Solicitados') */
  private translateStatus(statusKey: string): string {
    const estados: { [key: string]: string } = {
      'solicitado': 'Solicitados',
      'aceptado': 'Aceptados',
      'realizado': 'Realizados',
      'cancelado': 'Cancelados',
      'rechazado': 'Rechazados',
      'desconocido': 'Desconocido'
    };
    return estados[statusKey] || statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
  }
  
  getMedicoSeleccionadoNombre(): string {
    if (this.medicoSeleccionado === 'todos') {
      return 'Todos los médicos';
    }
    const medico = this.medicos.find(m => m.id === this.medicoSeleccionado);
    return medico ? medico.nombre_completo : 'Médico no encontrado';
  }

  // CREACIÓN DE GRÁFICOS DE TORTA
  crearGraficosIniciales() {
    this.crearGraficoEspecialidad();
  }

  crearGraficosFiltrados() {
    this.crearGraficoPorDia();
    this.crearGraficosMedicos();
    
    if (this.medicoSeleccionado !== 'todos') {
      this.crearGraficoMedicoEspecifico();
    }
  }

  crearGraficoEspecialidad() {
    this.destruirChart(this.chartEspecialidad);
    
    const ctx = document.getElementById('chartEspecialidad') as HTMLCanvasElement;
    if (!ctx) return;
    
    const selectedSpecialty = this.filtroEspecialidadSeleccionada;
    
    // Título dinámico
    const chartTitle = selectedSpecialty === 'todos' 
        ? 'Distribución General por Especialidad' 
        : `Distribución de Estados para: ${selectedSpecialty}`;

    if (this.turnosPorEspecialidad.length === 0) {
      this.crearGraficoVacio(ctx, `No hay datos para: ${selectedSpecialty}`);
      return;
    }

    this.chartEspecialidad = new Chart(ctx, {
      type: 'pie',
      data: {
        // Los labels son dinámicos (Especialidad o Estado)
        labels: this.turnosPorEspecialidad.map(item => item.especialidad),
        datasets: [{
          data: this.turnosPorEspecialidad.map(item => item.cantidad),
          backgroundColor: this.coloresTorta,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: chartTitle,
            font: { size: 16 }
          },
          tooltip: {
            callbacks: {
 label: (context) => {
   const label = context.label || '';
   const value = context.parsed;
   const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
   const percentage = Math.round((value / total) * 100);
   return `${label}: ${value} (${percentage}%)`;
 }
            }
          }
        }
      }
    });
  }

  crearGraficoPorDia() {
// ... (resto de funciones de gráficos y auxiliares)
    this.destruirChart(this.chartPorDia);
    
    const ctx = document.getElementById('chartPorDia') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.turnosPorDia.length === 0) {
      this.crearGraficoVacio(ctx, 'No hay turnos en el período seleccionado');
      return;
    }

    this.chartPorDia = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.turnosPorDia.map(item => item.dia),
        datasets: [{
          data: this.turnosPorDia.map(item => item.cantidad),
          backgroundColor: this.coloresTorta,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: `Distribución por Día de la Semana (${this.fechaInicio} al ${this.fechaFin})`,
            font: { size: 14 }
          }
        }
      }
    });
  }

  crearGraficosMedicos() {
    this.crearGraficoMedicosSolicitados();
    this.crearGraficoMedicosFinalizados();
  }

  crearGraficoMedicosSolicitados() {
    this.destruirChart(this.chartMedicosSolicitados);
    
    const ctx = document.getElementById('chartMedicosSolicitados') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.turnosSolicitadosPorMedico.length === 0) {
      this.crearGraficoVacio(ctx, 'No hay turnos solicitados');
      return;
    }

    this.chartMedicosSolicitados = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.turnosSolicitadosPorMedico.map(item => item.medico),
        datasets: [{
          data: this.turnosSolicitadosPorMedico.map(item => item.cantidad),
          backgroundColor: this.coloresTorta,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: `Turnos Solicitados por Médico (${this.fechaInicio} al ${this.fechaFin})`,
            font: { size: 14 }
          }
        }
      }
    });
  }

  crearGraficoMedicosFinalizados() {
    this.destruirChart(this.chartMedicosFinalizados);
    
    const ctx = document.getElementById('chartMedicosFinalizados') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.turnosFinalizadosPorMedico.length === 0) {
      this.crearGraficoVacio(ctx, 'No hay turnos finalizados');
      return;
    }

    this.chartMedicosFinalizados = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.turnosFinalizadosPorMedico.map(item => item.medico),
        datasets: [{
          data: this.turnosFinalizadosPorMedico.map(item => item.cantidad),
          backgroundColor: this.coloresTorta,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: `Turnos Finalizados por Médico (${this.fechaInicio} al ${this.fechaFin})`,
            font: { size: 14 }
          }
        }
      }
    });
  }

  crearGraficoMedicoEspecifico() {
    this.destruirChart(this.chartMedicoEspecifico);
    
    const ctx = document.getElementById('chartMedicoEspecifico') as HTMLCanvasElement;
    if (!ctx) return;

    const medicoNombre = this.getMedicoSeleccionadoNombre();

    if (!this.turnosPorMedicoEspecifico || this.turnosPorMedicoEspecifico.length === 0) {
      this.crearGraficoVacio(ctx, `No hay turnos para ${medicoNombre}`);
      return;
    }

    this.chartMedicoEspecifico = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.turnosPorMedicoEspecifico.map(item => {
          // Traducir estados a español
          const estados: { [key: string]: string } = {
            'solicitado': 'Solicitados',
            'aceptado': 'Aceptados',
            'realizado': 'Realizados',
            'cancelado': 'Cancelados',
            'rechazado': 'Rechazados'
          };
          return estados[item.estado] || item.estado;
        }),
        datasets: [{
          data: this.turnosPorMedicoEspecifico.map(item => item.cantidad),
          backgroundColor: this.coloresTorta,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: `Estado de Turnos - ${medicoNombre} (${this.fechaInicio} al ${this.fechaFin})`,
            font: { size: 14 }
          }
        }
      }
    });
  }

  private crearGraficoVacio(ctx: HTMLCanvasElement, mensaje: string) {
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sin datos'],
        datasets: [{
          data: [1],
          backgroundColor: ['#f8f9fa']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { 
            display: true, 
            text: mensaje,
            font: { size: 14 }
          }
        }
      }
    });
  }

  private destruirChart(chart: Chart | null) {
    if (chart) chart.destroy();
  }

  private destruirGraficos() {
    this.destruirChart(this.chartEspecialidad);
    this.destruirChart(this.chartPorDia);
    this.destruirChart(this.chartMedicosSolicitados);
    this.destruirChart(this.chartMedicosFinalizados);
    this.destruirChart(this.chartMedicoEspecifico);
  }

  private destruirGraficosFiltrados() {
    this.destruirChart(this.chartPorDia);
    this.destruirChart(this.chartMedicosSolicitados);
    this.destruirChart(this.chartMedicosFinalizados);
    this.destruirChart(this.chartMedicoEspecifico);
  }

  // Métodos de exportación
  exportarLogIngresos() {
    this.exportacionService.exportarLogIngresos(this.logIngresos);
  }

  exportarTurnosPorEspecialidad() {
    this.exportacionService.exportarTurnosPorEspecialidad(this.turnosPorEspecialidad);
  }

  exportarTurnosPorDia() {
    this.exportacionService.exportarTurnosPorDia(this.turnosPorDia);
  }

  exportarTurnosPorMedico(tipo: 'solicitados' | 'finalizados') {
    const data = tipo === 'solicitados' ? 
      this.turnosSolicitadosPorMedico : this.turnosFinalizadosPorMedico;
    this.exportacionService.exportarTurnosPorMedico(data, tipo);
  }

  exportarTurnosMedicoEspecifico() {
    const medicoNombre = this.getMedicoSeleccionadoNombre();
    this.exportacionService.exportarTurnosMedicoEspecifico(
      this.turnosPorMedicoEspecifico, 
      medicoNombre
    );
  }
}