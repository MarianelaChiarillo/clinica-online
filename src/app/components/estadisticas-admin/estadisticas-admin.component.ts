import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { EstadisticasService } from '../../services/usuarios/estadisticas.service';
import { TurnosService } from '../../services/turnos.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportacionService } from '../../services/usuarios/exportacion.service';

@Component({
  selector: 'app-estadisticas-admin',
  imports: [DatePipe, FormsModule, CommonModule],
  templateUrl: './estadisticas-admin.component.html',
  styleUrls: ['./estadisticas-admin.component.scss']
})

export class EstadisticasAdminComponent implements OnInit, OnDestroy {
 @ViewChild('chartEspecialidadCanvas') chartRef!: ElementRef<HTMLCanvasElement>;
 @ViewChild('chartPorDiaCanvas') chartPorDiaRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private estadisticasService: EstadisticasService,
    private turnosService: TurnosService,
    private usuariosService: UsuarioService,
      private exportacionService: ExportacionService

  ) {}

  // ---------------------------------------------------------------------------
  // VARIABLES
  // ---------------------------------------------------------------------------

  logIngresos: any[] = [];
  especialidadesDisponibles: any[] = [];
  filtroEspecialidadSeleccionada: string = "todas";
turnosPorEspecialidad: any[] = [];
hayturnos = false;
  turnosPorDia: any[] = [];
  chartPorDia: Chart | null = null;
medicoSeleccionado: string = 'todos';
fechaInicio: string = '';
fechaFin: string = '';

turnosSolicitadosPorMedico: any[] = [];
turnosFinalizadosPorMedico: any[] = [];

chartMedicosSolicitados: Chart | null = null;
chartMedicosFinalizados: Chart | null = null;
  chartEspecialidad: Chart | null = null;
 
  filtrosAplicados = false;
  loading = false;



  turnosPorMedicoEspecifico: any[] = [];
  chartMedicoEspecifico: Chart | null = null;

  medicos: any[] = [];
  datosDisponibles = {
    tieneTurnos: true
  };
turnosEspecialidadOriginal: any[] = [];

  // ---------------------------------------------------------------------------
  // MÉTODOS DEL CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.cargarLogs();
    this.cargarEspecialidades();
    this.cargarTurnosEspecialidadGeneral();
      this.cargarTurnosPorEspecialidad();
          this.cargarTurnosPorDiaSemana();
  this.cargarMedicos(); // 🔥 Agregar aquí


  }

  ngOnDestroy(): void {
    if (this.chartEspecialidad) {
      this.chartEspecialidad.destroy();
    }
  }

  // ---------------------------------------------------------------------------
  // LOG DE INGRESOS
  // ---------------------------------------------------------------------------

  cargarLogs() {
    this.estadisticasService.obtenerLogIngresos().then((data) => {
      this.logIngresos = data || [];
    });
  }
get hayTurnos(): boolean {
  return this.turnosPorEspecialidad && this.turnosPorEspecialidad.some(t => t.cantidad > 0);
}

  exportarLogIngresos() {
    const doc = new jsPDF();
    doc.text("Log de Ingresos", 10, 10);

    autoTable(doc, {
      head: [["Usuario", "Primer ingreso", "Último ingreso"]],
      body: this.logIngresos.map((l) => [
        l.usuario_email,
        l.primer_ingreso_fecha_hora,
        l.ultimo_ingreso_fecha_hora
      ])
    });

    doc.save("log_ingresos.pdf");
  }

  // ---------------------------------------------------------------------------
  // SECCIÓN — TURNOS POR ESPECIALIDAD
  // ---------------------------------------------------------------------------
// En el componente



 async cargarEspecialidades() {
    console.log('🔍 [SERVICE] Solicitando ESPECIALIDADES...');
    const esp = await this.estadisticasService.obtenerEspecialidades();
    this.especialidadesDisponibles = esp;
    console.log('✅ [COMPONENT] Especialidades disponibles:', this.especialidadesDisponibles);
  }

  async filtrarGraficoEspecialidad() {
    console.log('🎯 [COMPONENT] Especialidad seleccionada:', this.filtroEspecialidadSeleccionada);

    if (!this.filtroEspecialidadSeleccionada) {
      this.turnosPorEspecialidad = [];
      this.hayturnos = false;
      return;
    }

    const data = await this.estadisticasService.obtenerTurnosPorEspecialidad(this.filtroEspecialidadSeleccionada);
    console.log('📊 [COMPONENT] Turnos filtrados:', data);

    if (data.length > 0) {
      this.turnosPorEspecialidad = data;
      this.hayturnos = true;

      // Esperar a que Angular renderice el canvas
      setTimeout(() => {
        this.renderizarGraficoEspecialidad();
      }, 0);
    } else {
      this.turnosPorEspecialidad = [];
      this.hayturnos = false;
    }
  }

  renderizarGraficoEspecialidad() {
    if (!this.chartRef) return;

    if (this.chartEspecialidad) {
      this.chartEspecialidad.destroy();
    }

    this.chartEspecialidad = new Chart(this.chartRef.nativeElement, {
      type: 'pie',
      data: {
        labels: this.turnosPorEspecialidad.map(t => t.especialidad),
        datasets: [{
          data: this.turnosPorEspecialidad.map(t => t.cantidad),
          backgroundColor: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"]
        }]
      }
    });
  }
async cargarMedicos() {
  const data = await this.estadisticasService.obtenerMedicos();
  console.log('📌 Datos crudos del servicio:', data); // Mira exactamente qué llega
  this.medicos = data || [];
  console.log('✅ Médicos cargados en this.medicos:', this.medicos);
}


  /** Cargar gráfica con TODOS los turnos por especialidad */
  async cargarTurnosEspecialidadGeneral() {
    const data = await this.estadisticasService.obtenerTurnosPorEspecialidad();
    this.turnosPorEspecialidad = data || [];
  }

  /** Se ejecuta cuando se cambia el select */


  

  // ---------------------------------------------------------------------------
  // TODAS LAS DEMÁS ESTADÍSTICAS (Ya estaban bien, no se tocan)
  // ---------------------------------------------------------------------------



  
  dibujarChartPorDia() {
    const ctx = document.getElementById('chartPorDia') as HTMLCanvasElement;

    if (this.chartPorDia) this.chartPorDia.destroy();

    this.chartPorDia = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.turnosPorDia.map(d => d.dia),
        datasets: [
          {
            label: 'Turnos',
            data: this.turnosPorDia.map(d => d.cantidad),
            backgroundColor: 'rgba(75,192,192,0.6)'
          }
        ]
      }
    });
  }



  dibujarChartMedicoEspecifico() {
    const ctx = document.getElementById("chartMedicoEspecifico") as HTMLCanvasElement;

    if (this.chartMedicoEspecifico) this.chartMedicoEspecifico.destroy();

    this.chartMedicoEspecifico = new Chart(ctx, {
      type: "pie",
      data: {
        labels: this.turnosPorMedicoEspecifico.map((t) => t.estado),
        datasets: [
          {
            data: this.turnosPorMedicoEspecifico.map((t) => t.cantidad),
            backgroundColor: ["#4bc0c0", "#ffcd56", "#ff6384"]
          }
        ]
      }
    });
  }
exportarPDFEspecialidad() {
  if (!this.hayTurnos || !this.turnosPorEspecialidad.length) {
    alert('No hay turnos para la especialidad seleccionada');
    return;
  }

  // 1️⃣ Crear documento PDF
  const doc = new jsPDF('p', 'mm', 'a4');
  const titulo = `Turnos - Especialidad: ${this.filtroEspecialidadSeleccionada}`;
  doc.setFontSize(16);
  doc.text(titulo, 14, 15);

  // 2️⃣ Convertir gráfico a imagen
  if (this.chartRef && this.chartRef.nativeElement) {
    const canvas = this.chartRef.nativeElement;
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 14, 25, 90, 90); // ajustar tamaño
  }

  // 3️⃣ Tabla de turnos
  const body = this.turnosPorEspecialidad.map(t => [t.especialidad, t.cantidad]);
autoTable(doc, {
  startY: 120,
  head: [['Especialidad/Estado', 'Cantidad']],
  body: body,
  theme: 'grid',
  headStyles: { fillColor: [66, 135, 245] },
  styles: { fontSize: 10, cellPadding: 3 },
  margin: { top: 120 }
});


  // 4️⃣ Guardar archivo con fecha
  const fecha = new Date().toISOString().split('T')[0];
  doc.save(`turnos_${this.filtroEspecialidadSeleccionada}_${fecha}.pdf`);
}


async cargarTurnosPorEspecialidad() {
  try {
    // 1️⃣ Traer todas las especialidades
    const especialidades = await this.estadisticasService.obtenerEspecialidades();

    // 2️⃣ Traer los turnos por especialidad
    const turnos = await this.estadisticasService.obtenerTurnosPorEspecialidad();

    // 3️⃣ Combinar: si no hay turnos para una especialidad, poner cantidad 0
    this.turnosPorEspecialidad = especialidades.map(esp => {
      const t = turnos.find(turno => turno.especialidad === esp.nombre);
      return {
        especialidad: esp.nombre,
        cantidad: t ? t.cantidad : 0
      };
    });

    // 4️⃣ Dibujar gráfico
    this.dibujarGrafico();
  } catch (error) {
    console.error('Error cargando turnos por especialidad:', error);
    this.turnosPorEspecialidad = [];
  }
}


  dibujarGrafico() {
    if (!this.chartRef) return;
    if (this.chartEspecialidad) this.chartEspecialidad.destroy();

    this.chartEspecialidad = new Chart(this.chartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.turnosPorEspecialidad.map(t => t.especialidad),
        datasets: [{
          label: 'Cantidad de turnos',
          data: this.turnosPorEspecialidad.map(t => t.cantidad),
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  exportarTurnosPorEspecialidadPDF() {
    if (!this.turnosPorEspecialidad.length) {
      alert('No hay datos de turnos para exportar');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');

    // Título
    doc.setFontSize(16);
    doc.text('Turnos por Especialidad', 14, 15);

    // Convertir gráfico a imagen
    if (this.chartRef && this.chartRef.nativeElement) {
      const imgData = this.chartRef.nativeElement.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 25, 180, 90); // ajustar tamaño
    }

    // Tabla de datos
    const body = this.turnosPorEspecialidad.map(t => [t.especialidad, t.cantidad]);
    autoTable(doc, {
      startY: 120,
      head: [['Especialidad', 'Cantidad']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245] },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`turnos_por_especialidad_${fecha}.pdf`);
  }

  exportarTurnosPorEspecialidadExcel() {
    if (!this.turnosPorEspecialidad.length) {
      alert('No hay datos de turnos para exportar');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(this.turnosPorEspecialidad);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turnos Especialidad');
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `turnos_por_especialidad_${fecha}.xlsx`);
  }
  exportarPDF() {
    if (!this.turnosPorEspecialidad || this.turnosPorEspecialidad.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');

    // Título
    doc.setFontSize(16);
    doc.text('Turnos por Especialidad', 14, 15);

    // Convertir gráfico a imagen
    if (this.chartRef && this.chartRef.nativeElement) {
      const canvas = this.chartRef.nativeElement;
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 25, 180, 90); // ancho y alto ajustable
    }

    // Agregar tabla debajo del gráfico
    const body = this.turnosPorEspecialidad.map(t => [t.especialidad, t.cantidad]);
    autoTable(doc, {
      startY: 120,
      head: [['Especialidad', 'Cantidad']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245] },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    // Guardar PDF
    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`turnos_por_especialidad_${fecha}.pdf`);
  }


   async cargarTurnosPorDiaSemana() {
  this.turnosPorDia = await this.estadisticasService.obtenerTurnosPorDiaSemana();

  if (!this.turnosPorDia || this.turnosPorDia.length === 0) return;

  if (this.chartPorDia) this.chartPorDia.destroy();

  this.chartPorDia = new Chart(this.chartPorDiaRef.nativeElement, {
    type: 'bar',
    data: {
      labels: this.turnosPorDia.map(t => t.dia),
      datasets: [{
        label: 'Turnos',
        data: this.turnosPorDia.map(t => t.cantidad),
        backgroundColor: 'rgba(75,192,192,0.6)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

  /** Dibujar gráfico de barras */
  renderizarGraficoPorDia() {
    if (!this.chartPorDiaRef) return;

    if (this.chartPorDia) this.chartPorDia.destroy();

    this.chartPorDia = new Chart(this.chartPorDiaRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.turnosPorDia.map(t => t.dia),
        datasets: [{
          label: 'Turnos',
          data: this.turnosPorDia.map(t => t.cantidad),
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  /** Exportar PDF con gráfico + tabla */
  exportarPDFTurnosPorDia() {
    if (!this.turnosPorDia || this.turnosPorDia.length === 0) {
      alert('No hay turnos para exportar');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Turnos por Día', 14, 15);

    // Convertir gráfico a imagen
    if (this.chartPorDiaRef && this.chartPorDiaRef.nativeElement) {
      const canvas = this.chartPorDiaRef.nativeElement;
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 25, 180, 90); // ajustar tamaño
    }

    // Tabla
    const body = this.turnosPorDia.map(t => [t.dia, t.cantidad]);
    autoTable(doc, {
      startY: 120,
      head: [['Día', 'Cantidad de Turnos']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245] },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`turnos_por_dia_${fecha}.pdf`);
  }


async cargarTurnosPorMedicoSolicitados() {
  if (!this.medicoSeleccionado || !this.fechaInicio || !this.fechaFin) return;

  this.turnosSolicitadosPorMedico = await this.estadisticasService.obtenerTurnosPorMedico(
    this.medicoSeleccionado, // ahora es id
    'solicitado',
    this.fechaInicio,
    this.fechaFin
  );

  this.dibujarChartMedicosSolicitados();
}

// Método para cargar los turnos finalizados
async cargarTurnosPorMedicoFinalizados() {
  if (!this.medicoSeleccionado || !this.fechaInicio || !this.fechaFin) return;

  this.turnosFinalizadosPorMedico = await this.estadisticasService.obtenerTurnosPorMedico(
    this.medicoSeleccionado,
    'realizado',
    this.fechaInicio,
    this.fechaFin
  );

  this.dibujarChartMedicosFinalizados();
}

// Graficar solicitados
dibujarChartMedicosSolicitados() {
  const ctx = document.getElementById("chartMedicosSolicitados") as HTMLCanvasElement;
  if (!ctx) return;

  if (this.chartMedicosSolicitados) this.chartMedicosSolicitados.destroy();

  this.chartMedicosSolicitados = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: this.turnosSolicitadosPorMedico.map(t => t.medico),
      datasets: [{
        label: 'Solicitados',
        data: this.turnosSolicitadosPorMedico.map(t => t.cantidad),
        backgroundColor: 'rgba(255,159,64,0.6)',
        
      }]
    },
options: {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      ticks: {
        autoSkip: false // mostrar todas las etiquetas
      }
    },
    y: {
      beginAtZero: true
    }
  }
}

    
  });
}

// Graficar finalizados
dibujarChartMedicosFinalizados() {
  const ctx = document.getElementById("chartMedicosFinalizados") as HTMLCanvasElement;
  if (!ctx) return;

  if (this.chartMedicosFinalizados) this.chartMedicosFinalizados.destroy();

  this.chartMedicosFinalizados = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: this.turnosFinalizadosPorMedico.map(t => t.medico),
      datasets: [{
        label: 'Finalizados',
        data: this.turnosFinalizadosPorMedico.map(t => t.cantidad),
        backgroundColor: 'rgba(153,102,255,0.6)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}
exportarTurnosPorMedicoPDF() {
  if ((!this.turnosSolicitadosPorMedico || this.turnosSolicitadosPorMedico.length === 0) &&
      (!this.turnosFinalizadosPorMedico || this.turnosFinalizadosPorMedico.length === 0)) {
    alert('No hay datos de turnos para exportar');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 15;

  doc.setFontSize(16);
  doc.text('Turnos por Médico', 14, y);

  y += 10;

  // Gráfico de solicitados
  if (this.chartMedicosSolicitados) {
    const imgSolicitados = this.chartMedicosSolicitados.canvas.toDataURL('image/png');
    doc.addImage(imgSolicitados, 'PNG', 14, y, 180, 90);
    y += 95;
  }

  // Tabla de solicitados
  if (this.turnosSolicitadosPorMedico.length) {
    const bodySolicitados = this.turnosSolicitadosPorMedico.map(t => [t.medico, t.cantidad]);
    autoTable(doc, {
      startY: y,
      head: [['Médico', 'Solicitados']],
      body: bodySolicitados,
      theme: 'grid',
      headStyles: { fillColor: [255, 159, 64] },
      styles: { fontSize: 10, cellPadding: 3 }
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Gráfico de finalizados
  if (this.chartMedicosFinalizados) {
    const imgFinalizados = this.chartMedicosFinalizados.canvas.toDataURL('image/png');
    doc.addImage(imgFinalizados, 'PNG', 14, y, 180, 90);
    y += 95;
  }

  // Tabla de finalizados
  if (this.turnosFinalizadosPorMedico.length) {
    const bodyFinalizados = this.turnosFinalizadosPorMedico.map(t => [t.medico, t.cantidad]);
    autoTable(doc, {
      startY: y,
      head: [['Médico', 'Finalizados']],
      body: bodyFinalizados,
      theme: 'grid',
      headStyles: { fillColor: [153, 102, 255] },
      styles: { fontSize: 10, cellPadding: 3 }
    });
  }

  const fecha = new Date().toISOString().split('T')[0];
  doc.save(`turnos_por_medico_${fecha}.pdf`);
}

}