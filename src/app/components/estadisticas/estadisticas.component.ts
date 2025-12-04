import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { EstadisticasService } from '../../services/usuarios/estadisticas.service';
import { TurnoService } from '../../services/turnos.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Chart, { ChartType } from 'chart.js/auto';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EspecialidadService } from '../../services/usuarios/especialidad.service';
import { MenuComponent } from '../componentes/menu/menu.component';
@Component({
  selector: 'app-estadisticas-admin',
  imports: [DatePipe, FormsModule, CommonModule, MenuComponent],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss']
})
export class EstadisticasAdminComponent implements OnInit, OnDestroy {

  @ViewChild('chartEspecialidadCanvas') chartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartPorDiaCanvas') chartPorDiaRef!: ElementRef<HTMLCanvasElement>;


  logIngresos: any[] = [];
  especialidadesDisponibles: any[] = [];
  turnosPorEspecialidad: any[] = [];
  turnosPorDia: any[] = [];
  medicos: any[] = [];

  chartEspecialidad: Chart | null = null;
  chartPorDia: Chart | null = null;

  filtroEspecialidadSeleccionada = 'todas';
  loading = false;

  
  constructor(
    private estadisticasService: EstadisticasService,
    private turnosService: TurnoService,
    private usuariosService: UsuarioService,
      private especialidadService: EspecialidadService

  ) {}

  ngOnInit(): void {
    this.cargarLogs();
    this.cargarEspecialidades();
    this.cargarTurnosPorEspecialidad();
    this.cargarTurnosPorDiaSemana();
  }

  ngOnDestroy(): void {
    this.chartEspecialidad?.destroy();
    this.chartPorDia?.destroy();
  }

  async cargarLogs() {
    try {
      this.logIngresos = await this.estadisticasService.obtenerLogIngresos() || [];
    } catch (error) {
      console.error('Error al cargar logs de ingresos', error);
    }
  }

  exportarLogIngresosPDF() {
    if (!this.logIngresos.length) return alert('No hay logs para exportar');

    const doc = new jsPDF();
    doc.text("Log de Ingresos", 10, 10);

    autoTable(doc, {
      head: [["Usuario", "Primer ingreso", "Último ingreso"]],
      body: this.logIngresos.map(l => [
        l.usuario_email,
        l.primer_ingreso_fecha_hora,
        l.ultimo_ingreso_fecha_hora
      ])
    });

    doc.save(`log_ingresos_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async cargarEspecialidades() {
    try {
      this.especialidadesDisponibles = await this.especialidadService.obtenerTodas() || [];
    } catch (error) {
      console.error('Error al cargar especialidades', error);
    }
  }

  async cargarTurnosPorEspecialidad(filtro?: string) {
    try {
      const especialidades = await this.especialidadService.obtenerTodas();
      let turnos = await this.estadisticasService.obtenerTurnosPorEspecialidad(filtro);

      this.turnosPorEspecialidad = especialidades.map(esp => {
        const t = turnos.find(turno => turno.especialidad === esp.nombre);
        return { especialidad: esp.nombre, cantidad: t?.cantidad || 0 };
      });

      this.renderizarGraficoEspecialidad();
    } catch (error) {
      console.error('Error cargando turnos por especialidad', error);
      this.turnosPorEspecialidad = [];
    }
  }

  renderizarGraficoEspecialidad() {
    if (!this.chartRef) return;
    this.chartEspecialidad?.destroy();

    this.chartEspecialidad = this.drawChart(
      this.chartRef.nativeElement,
      'pie',
      this.turnosPorEspecialidad.map(t => t.especialidad),
      this.turnosPorEspecialidad.map(t => t.cantidad),
      'Cantidad de turnos',
      ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"]
    );
  }


  async cargarTurnosPorDiaSemana() {
    try {
      this.turnosPorDia = await this.estadisticasService.obtenerTurnosPorDiaSemana() || [];
      this.renderizarGraficoPorDia();
    } catch (error) {
      console.error('Error cargando turnos por día', error);
    }
  }

  renderizarGraficoPorDia() {
    if (!this.chartPorDiaRef) return;
    this.chartPorDia?.destroy();

    this.chartPorDia = this.drawChart(
      this.chartPorDiaRef.nativeElement,
      'bar',
      this.turnosPorDia.map(t => t.dia),
      this.turnosPorDia.map(t => t.cantidad),
      'Turnos',
      'rgba(75,192,192,0.6)'
    );
  }

  exportPDF(titulo: string, chart: Chart | null, data: any[], columns: string[], filename: string) {
    if (!data || data.length === 0) return alert('No hay datos para exportar');

    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text(titulo, 14, 15);

    if (chart) {
      const imgData = chart.canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 25, 180, 90);
    }

    autoTable(doc, {
      startY: 120,
      head: [columns],
      body: data.map(d => columns.map(col => d[col])),
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245] },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`${filename}_${fecha}.pdf`);
  }

  exportTurnosPorEspecialidadPDF() {
    this.exportPDF(
      `Turnos - Especialidad: ${this.filtroEspecialidadSeleccionada}`,
      this.chartEspecialidad,
      this.turnosPorEspecialidad,
      ['especialidad', 'cantidad'],
      'turnos_por_especialidad'
    );
  }

  exportTurnosPorEspecialidadExcel() {
    if (!this.turnosPorEspecialidad.length) return alert('No hay datos de turnos para exportar');

    const ws = XLSX.utils.json_to_sheet(this.turnosPorEspecialidad);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turnos Especialidad');
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `turnos_por_especialidad_${fecha}.xlsx`);
  }

  
  drawChart(
    canvas: HTMLCanvasElement,
    type: ChartType,
    labels: string[],
    data: number[],
    label: string,
    backgroundColor: string | string[]
  ): Chart {
    return new Chart(canvas, {
      type,
      data: { labels, datasets: [{ label, data, backgroundColor }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  get hayTurnos(): boolean {
    return this.turnosPorEspecialidad.some(t => t.cantidad > 0);
  }
}
