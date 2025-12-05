import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { EstadisticasService } from '../../services/usuarios/estadisticas.service';
import { TurnoService } from '../../services/turnos.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EspecialidadService } from '../../services/usuarios/especialidad.service';
import { MenuComponent } from '../componentes/menu/menu.component';
import supabase from '../../services/supabase.client';
import { EspecialistaService } from '../../services/usuarios/especialista.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { FechaFormatoPipe } from '../../pipes/fecha-formato.pipe';
import { SpinnerComponent } from '../componentes/spinner/spinner.component';
@Component({
  selector: 'app-estadisticas-admin',
  imports: [
    DatePipe, FormsModule, CommonModule, MenuComponent,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    FechaFormatoPipe, MatButtonModule, MatIconModule, MatSelectModule, SpinnerComponent
  ],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss']
})
export class EstadisticasAdminComponent implements OnInit, OnDestroy {

  /*** CANVAS DE CHARTS ***/
  @ViewChild('chartEspecialidadCanvas') chartEspecialidadRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartPorDiaSemanaCanvas') chartPorDiaRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartSolicitadoEspecialidadesCanvas') chartSolicitadoRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartFinalizadoEspecialidadesCanvas') chartFinalizadoRef!: ElementRef<HTMLCanvasElement>;

  /*** DATOS ***/
  logIngresos: any[] = [];
  turnosPorEspecialidad: any[] = [];
  turnosPorDiaSemana: any[] = [];
  medicos: any[] = [];

  /*** CHARTS ***/
  chartEspecialidad: Chart | null = null;
  chartPorDiaSemana: Chart | null = null;
  chartSolicitadoEspecialidades: Chart | null = null;
  chartFinalizadoEspecialidades: Chart | null = null;

  /*** SELECCIONES Y FILTROS ***/
  medicoSeleccionado: any = null;
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;

  /*** ESTADO DE SECCIONES ***/
  mostrarLogIngresos = true; // Log activo por defecto
  mostrarTurnosEspecialidad = false;
  mostrarTurnosDiaSemana = false;
  mostrarTurnosMedicoSolicitado = false;
  mostrarTurnosMedicoRealizado = false;
  seccionActiva = 'log'; // Para botón activo

  /*** CONTROL DE DATOS VACÍOS ***/
  turnosEspecialidadVacios = true;
  turnosDiaSemanaVacios = true;
  turnosSolicitadosVacios = true;
  turnosRealizadosVacios = true;

turnosPorMedicoSolicitados: { especialidad: string; cantidad: number }[] = [];

  // Turnos solicitados
medicoSeleccionadoSolicitados: any = null;
fechaDesdeSolicitados: Date | null = null;
fechaHastaSolicitados: Date | null = null;

// Turnos realizados
medicoSeleccionadoRealizados: any = null;
fechaDesdeRealizados: Date | null = null;
fechaHastaRealizados: Date | null = null;
// Agregar estas variables en tu clase
turnosPorMedicoRealizados: { especialidad: string; cantidad: number }[] = [];

cargando = true;
  private canalTurnos: any;

  constructor(
    private estadisticasService: EstadisticasService,
    private turnosService: TurnoService,
    private usuariosService: UsuarioService,
    private especialidadService: EspecialidadService,
    private especialistaService: EspecialistaService
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    this.cargarLogs();
    this.cargarEspecialidades();
    this.cargarTurnosPorEspecialidad();
    this.cargarTurnosPorDiaSemana();
    this.cargarMedicos();
    this.iniciarLogsRealtime();
    this.estadisticaRealtime();
    this.cargando = false;
  }

  ngOnDestroy(): void {
    this.chartEspecialidad?.destroy();
    this.chartPorDiaSemana?.destroy();
    this.chartSolicitadoEspecialidades?.destroy();
    this.chartFinalizadoEspecialidades?.destroy();

    if (this.canalTurnos) this.canalTurnos.unsubscribe();
  }

  /*** TOGGLE SECCIONES Y BOTÓN ACTIVO ***/
 toggleSeccion(seccion: string) {
  // Actualizamos la sección activa
  this.seccionActiva = seccion;

  // Mostrar solo la sección activa
  this.mostrarLogIngresos = seccion === 'log';
  this.mostrarTurnosEspecialidad = seccion === 'especialidad';
  this.mostrarTurnosDiaSemana = seccion === 'dias';
  this.mostrarTurnosMedicoSolicitado = seccion === 'medicoSolicitado';
  this.mostrarTurnosMedicoRealizado = seccion === 'medicoRealizado';

setTimeout(() => {
  if (seccion === 'especialidad') this.renderizarGraficoEspecialidad();
  if (seccion === 'dias') this.renderizarGraficoPorDiaSemana();
  if (seccion === 'medicoSolicitado' && !this.turnosSolicitadosVacios) {
    // Renderizar gráficos de solicitados y realizados
    if (this.chartSolicitadoRef?.nativeElement) {
      this.renderizarGraficoTorta(
        this.chartSolicitadoRef, // <-- PASAR EL ElementRef, no nativeElement
        this.turnosPorMedicoSolicitados,
        'solicitado'
      );
    }
    if (this.chartFinalizadoRef?.nativeElement) {
      this.renderizarGraficoTorta(
        this.chartFinalizadoRef, // <-- PASAR EL ElementRef, no nativeElement
        this.turnosPorMedicoRealizados,
        'realizado'
      );
    }
  }
}, 0);



}

  /*** CARGA DE DATOS ***/
  async cargarLogs() {
    try {
      this.logIngresos = await this.estadisticasService.obtenerLogIngresos() || [];
    } catch (err) {
      console.error('Error cargando logs:', err);
    }
  }

  async cargarMedicos() {
    this.medicos = await this.especialistaService.obtenerTodosEspecialistas();
  }

  async cargarEspecialidades() {
    this.turnosPorEspecialidad = await this.estadisticasService.obtenerTurnosPorEspecialidadConNombre() || [];
  }

  async cargarTurnosPorEspecialidad() {
    try {
      this.turnosPorEspecialidad = await this.estadisticasService.obtenerTurnosPorEspecialidadConNombre() || [];
      this.turnosEspecialidadVacios = this.turnosPorEspecialidad.length === 0;
      this.renderizarGraficoEspecialidad();
    } catch (err) {
      console.error(err);
      this.turnosEspecialidadVacios = true;
    }
  }

  async cargarTurnosPorDiaSemana() {
    try {
      this.turnosPorDiaSemana = await this.estadisticasService.obtenerTurnosPorDiaSemana() || [];
      this.turnosDiaSemanaVacios = this.turnosPorDiaSemana.length === 0;
      this.renderizarGraficoPorDiaSemana();
    } catch (err) {
      console.error(err);
      this.turnosDiaSemanaVacios = true;
    }
  }

  /*** RENDERIZAR GRÁFICOS ***/
  renderizarGraficoEspecialidad() {
    if (!this.chartEspecialidadRef) return;
    this.chartEspecialidad?.destroy();
    if (!this.turnosPorEspecialidad.length) return;

    this.chartEspecialidad = new Chart(this.chartEspecialidadRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.turnosPorEspecialidad.map(t => t.especialidad),
        datasets: [{
          label: 'Cantidad de turnos',
          data: this.turnosPorEspecialidad.map(t => t.cantidad),
          backgroundColor: '#4e79a7'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Cantidad de turnos' } },
          x: { title: { display: true, text: 'Especialidad' } }
        }
      }
    });
  }

  renderizarGraficoPorDiaSemana() {
    if (!this.chartPorDiaRef) return;
    this.chartPorDiaSemana?.destroy();
    if (!this.turnosPorDiaSemana.length) return;

    this.chartPorDiaSemana = new Chart(this.chartPorDiaRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.turnosPorDiaSemana.map(t => t.dia),
        datasets: [{ label: 'Cantidad de turnos', data: this.turnosPorDiaSemana.map(t => t.cantidad), backgroundColor: '#f28e2b' }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { ticks: { autoSkip: false } } } }
    });
  }

async consultarTurnosPorMedico() {
  if (!this.medicoSeleccionado || !this.fechaDesde || !this.fechaHasta) return;

  // Convertir fechas a formato SQL (yyyy-MM-dd)
  const desde = this.convertirFechaAFormatoSQL(this.fechaDesde);
  const hasta = this.convertirFechaAFormatoSQL(this.fechaHasta);

  try {
    // Turnos solicitados por el médico
    this.turnosPorMedicoSolicitados = await this.turnosService.obtenerTurnosPorEspecialidadDeMedico(
      this.medicoSeleccionado.id,
      desde,
      hasta,
      'solicitado'
    );

    // Turnos realizados por el médico
    this.turnosPorMedicoRealizados = await this.turnosService.obtenerTurnosPorEspecialidadDeMedico(
      this.medicoSeleccionado.id,
      desde,
      hasta,
      'realizado'
    );

  if (this.turnosPorMedicoSolicitados.length > 0 && this.chartSolicitadoRef?.nativeElement) {
  this.turnosSolicitadosVacios = false;
  this.renderizarGraficoTorta(this.chartSolicitadoRef, this.turnosPorMedicoSolicitados, 'solicitado');
} else {
  this.turnosSolicitadosVacios = true;
}
if (this.turnosPorMedicoRealizados.length > 0 && this.chartFinalizadoRef?.nativeElement) {
  this.turnosRealizadosVacios = false;
  this.renderizarGraficoTorta(this.chartFinalizadoRef, this.turnosPorMedicoRealizados, 'realizado');
} else {
  this.turnosRealizadosVacios = true;
}

  } catch (error) {
    console.error('Error consultando turnos por médico:', error);
    this.turnosSolicitadosVacios = true;
    this.turnosRealizadosVacios = true;
  }
}




  convertirFechaAFormatoSQL(fecha: Date | string): string {
    if (!fecha) return '';
    if (fecha instanceof Date) {
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const anio = fecha.getFullYear();
      return `${anio}-${mes}-${dia}`;
    }
    return fecha;
  }

  /*** EXPORT PDF/EXCEL ***/
 
// Función genérica dentro de la clase
exportPDF(
  titulo: string,
  chart: Chart | null,
  data: any[],
  columns: string[],
  filename: string
) {
  if (!data || !data.length) {
    alert('No hay datos para exportar');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');

  // Logo de la clínica
  const logoUrl = 'assets/logo-clinica.png'; // ajusta la ruta
  const img = new Image();
  img.src = logoUrl;
  img.onload = () => {
    doc.addImage(img, 'PNG', 10, 10, 30, 30);

    // Título
    doc.setFontSize(18);
    doc.text(titulo, 50, 20);

    // Fecha de emisión
    doc.setFontSize(11);
    const fechaEmision = new Date();
    doc.text(`Fecha de emisión: ${fechaEmision.toLocaleString()}`, 50, 28);

    // Gráfico
    if (chart) {
      const imgData = chart.canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 40, 180, 90);
    }

    // Tabla de datos
    autoTable(doc, {
      startY: 140,
      head: [columns],
      body: data.map(d => columns.map(c => d[c])),
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245] },
      styles: { fontSize: 10 }
    });

    doc.save(`${filename}_${fechaEmision.toISOString().split('T')[0]}.pdf`);
  };
}

// Función específica para Turnos por Especialidad
exportTurnosPorEspecialidadPDF() {
  this.exportPDF(
    'Turnos por Especialidad',
    this.chartEspecialidad,
    this.turnosPorEspecialidad,
    ['especialidad', 'cantidad'],
    'turnos_por_especialidad'
  );
}


  exportTurnosPorEspecialidadExcel() {
    if (!this.turnosPorEspecialidad.length) return;
    const ws = XLSX.utils.json_to_sheet(this.turnosPorEspecialidad);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turnos');
    XLSX.writeFile(wb, `turnos_por_especialidad_${new Date().toISOString().split('T')[0]}.xlsx`);
  }


  /*** REALTIME SUPABASE ***/
  private iniciarLogsRealtime() {
    this.canalTurnos = supabase.channel('logs')
      .on('postgres_changes',{ event:'*', schema:'public', table:'logs_ingresos' }, async payload => {
        await this.cargarLogs();
      }).subscribe();
  }

  private estadisticaRealtime() {
    this.canalTurnos = supabase.channel('estadisticas-realtime')
      .on('postgres_changes',{ event:'*', schema:'public', table:'turnos' }, async payload => {
        this.cargarTurnosPorEspecialidad();
        this.cargarTurnosPorDiaSemana();
      }).subscribe();
  }
renderizarGraficoTorta(
  canvasRef: ElementRef<HTMLCanvasElement>,
  data: { especialidad: string; cantidad: number }[],
  tipo: 'solicitado' | 'realizado'
) {
  console.log(`🔄 Renderizando gráfico ${tipo} con datos:`, data);
  
  if (!canvasRef?.nativeElement) {
    console.error('❌ Canvas no disponible');
    return null;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ Sin datos para renderizar gráfico');
    return null;
  }

  // Destruir chart previo si existe
  if (tipo === 'solicitado' && this.chartSolicitadoEspecialidades) {
    console.log('🗑️ Destruyendo gráfico anterior de solicitados');
    this.chartSolicitadoEspecialidades.destroy();
    this.chartSolicitadoEspecialidades = null;
  }
  
  if (tipo === 'realizado' && this.chartFinalizadoEspecialidades) {
    this.chartFinalizadoEspecialidades.destroy();
    this.chartFinalizadoEspecialidades = null;
  }

  try {
    const ctx = canvasRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('❌ Contexto 2D no disponible');
      return null;
    }

    console.log('🎨 Creando nuevo gráfico...');
    const chartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.map(d => d.especialidad),
        datasets: [{
          label: tipo === 'solicitado' ? 'Turnos solicitados' : 'Turnos realizados',
          data: data.map(d => d.cantidad),
          backgroundColor: ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc949']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              font: {
                size: 12
              }
            }
          } 
        }
      }
    });

    // Guardar instancia para exportar después
    if (tipo === 'solicitado') {
      this.chartSolicitadoEspecialidades = chartInstance;
      console.log('💾 Gráfico de solicitados guardado:', chartInstance);
    } else {
      this.chartFinalizadoEspecialidades = chartInstance;
    }

    return chartInstance;
    
  } catch (error) {
    console.error('❌ Error creando gráfico:', error);
    return null;
  }
}
exportTurnosPorDiaSemanaExcel() {
  if (!this.turnosPorDiaSemana || !this.turnosPorDiaSemana.length) {
    alert('No hay datos para exportar');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(this.turnosPorDiaSemana);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Turnos por Día');

  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `turnos_por_dia_semana_${fecha}.xlsx`);
}


async consultarTurnosSolicitados() {
  if (!this.medicoSeleccionadoSolicitados || !this.fechaDesdeSolicitados || !this.fechaHastaSolicitados) {
    alert('Por favor, selecciona médico y fechas');
    return;
  }

  const desde = this.convertirFechaAFormatoSQL(this.fechaDesdeSolicitados);
  const hasta = this.convertirFechaAFormatoSQL(this.fechaHastaSolicitados);

  try {
    console.log('🔍 Consultando turnos solicitados...');
    
    // 1. Obtener datos del servicio
    const data = await this.turnosService.obtenerTurnosPorEspecialidadDeMedico(
      this.medicoSeleccionadoSolicitados.id, 
      desde, 
      hasta, 
      'solicitado'
    );

    console.log('📊 Datos recibidos del servicio:', data);
    
    // 2. ASIGNAR los datos a la variable del componente
    this.turnosPorMedicoSolicitados = data || [];
    
    console.log('💾 Datos asignados a turnosPorMedicoSolicitados:', this.turnosPorMedicoSolicitados);
    
    // 3. Actualizar estado
    this.turnosSolicitadosVacios = this.turnosPorMedicoSolicitados.length === 0;
    
    // 4. Renderizar gráfico si hay datos
    if (!this.turnosSolicitadosVacios) {
      console.log('🎨 Renderizando gráfico...');
      
      // Esperar un ciclo para asegurar que el canvas esté disponible
      setTimeout(() => {
        this.renderizarGraficoTorta(
          this.chartSolicitadoRef, 
          this.turnosPorMedicoSolicitados, // <-- Usar los datos asignados
          'solicitado'
        );
        console.log('✅ Gráfico renderizado con:', this.turnosPorMedicoSolicitados);
      }, 100);
    } else {
      console.warn('⚠️ No hay datos para mostrar');
      alert('No se encontraron turnos solicitados con los filtros seleccionados');
    }
    
  } catch (error) {
    console.error('❌ Error consultando turnos:', error);
    alert('Error al consultar los turnos');
    this.turnosSolicitadosVacios = true;
    this.turnosPorMedicoSolicitados = []; // Asegurar array vacío
  }
}

exportTurnosRealizadosPDF() {
  console.log('📤 ========== EXPORTACIÓN REALIZADOS ==========');
  
  // ... tus verificaciones actuales ...

  console.log('✅ Todas las verificaciones pasadas, generando PDF...');
  
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const fecha = new Date();
    
    // URL del logo (ajusta la ruta según tu estructura)
    const logoUrl = 'assets/images/icon.png'; // o 'assets/logo.png', etc.
    
    // Cargar y agregar el logo
    const img = new Image();
    img.src = logoUrl;
    
    img.onload = () => {
      try {
        // Agregar logo en la esquina superior izquierda
        doc.addImage(img, 'PNG', 10, 10, 30, 30); // x, y, width, height
        
        // Cabecera del documento (al lado del logo)
        doc.setFontSize(18);
        doc.text('Turnos Realizados por Médico', 50, 20);
        
        doc.setFontSize(11);
        doc.text(`Fecha de emisión: ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`, 50, 28);
        
        if (this.medicoSeleccionadoRealizados) {
          doc.text(`Médico: ${this.medicoSeleccionadoRealizados.nombre} ${this.medicoSeleccionadoRealizados.apellido}`, 50, 35);
        }
        
        doc.text(`Período: ${this.fechaDesdeRealizados?.toLocaleDateString()} - ${this.fechaHastaRealizados?.toLocaleDateString()}`, 50, 42);
        
        // Gráfico (debajo del encabezado)
        const imgData = this.chartFinalizadoEspecialidades!.canvas.toDataURL('image/png', 1.0);
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth() - 20;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        doc.addImage(imgData, 'PNG', 10, 55, pdfWidth, Math.min(pdfHeight, 90));
        
        // Tabla (debajo del gráfico)
        const startY = 55 + Math.min(pdfHeight, 90) + 10;
        
        autoTable(doc, {
          startY: startY,
          head: [['Especialidad', 'Cantidad']],
          body: this.turnosPorMedicoRealizados.map(t => [t.especialidad, t.cantidad]),
          theme: 'grid',
          headStyles: { fillColor: [245, 66, 66] },
          styles: { fontSize: 10 }
        });
        
        const nombreArchivo = `turnos_realizados_${fecha.toISOString().split('T')[0]}`;
        console.log('💾 Guardando PDF como:', nombreArchivo);
        
        doc.save(`${nombreArchivo}.pdf`);
        console.log('✅ PDF de realizados generado exitosamente');
        
      } catch (error: any) {
        alert('Error al generar el PDF: ' + error.message);
        console.error(error);
      }
    };
    
    // Si falla la carga del logo, continuar sin él
    img.onerror = () => {
      console.warn('⚠️ No se pudo cargar el logo, generando PDF sin logo');
    };
    
  } catch (error: any) {
    alert('Error al generar el PDF: ' + error.message);
    console.error(error);
  }
}

/*** EXPORT LOG DE INGRESOS EXCEL ***/
exportarLogIngresosExcel() {
  if (!this.logIngresos || !this.logIngresos.length) {
    alert('No hay logs para exportar');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(this.logIngresos.map(l => ({
    Nombre: l.nombre,
    Apellido: l.apellido,
    Email: l.email,
    Fecha: l.fecha_hora
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Logs de Ingresos');
  XLSX.writeFile(wb, `log_ingresos_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/*** EXPORT TURNOS SOLICITADOS PDF ***/




exportarDatosDirectosRealizadosPDF() {
  // Esta función omite el gráfico y solo exporta la tabla (para debugging)
  if (!this.turnosPorMedicoRealizados || this.turnosPorMedicoRealizados.length === 0) {
    alert('No hay datos de realizados');
    return;
  }
  
  console.log('🔍 Exportando datos directos de realizados:', this.turnosPorMedicoRealizados);
  
  const doc = new jsPDF();
  
  // Cabecera
  doc.setFontSize(16);
  doc.text('Turnos Realizados - Datos Directos', 10, 10);
  
  // Solo tabla
  autoTable(doc, {
    startY: 20,
    head: [['Especialidad', 'Cantidad']],
    body: this.turnosPorMedicoRealizados.map(t => [t.especialidad, t.cantidad]),
    headStyles: { fillColor: [245, 66, 66] },
  });
  
  doc.save('datos_directos_realizados.pdf');
}

exportarLogIngresosPDF() {
  if (!this.logIngresos || !this.logIngresos.length) {
    alert('No hay logs para exportar');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');

  // Logo de la clínica (suponiendo que tenés la URL o base64)
  const logoUrl = 'assets/images/icon.png'; // ruta de tu logo
  const img = new Image();
  img.src = logoUrl;
  img.onload = () => {
    doc.addImage(img, 'PNG', 10, 10, 30, 30); // x, y, width, height

    // Título del informe
    doc.setFontSize(18);
    doc.text('Log de Ingresos', 50, 20);

    // Fecha de emisión
    doc.setFontSize(11);
    const fechaEmision = new Date();
    doc.text(`Fecha de emisión: ${fechaEmision.toLocaleString()}`, 50, 28);

    // Tabla con los datos formateados
    const dataFormateada = this.logIngresos.map(l => {
      const fecha = new Date(l.fecha_hora);
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const anio = fecha.getFullYear();
      const hora = fecha.getHours().toString().padStart(2,'0');
      const min = fecha.getMinutes().toString().padStart(2,'0');
      const seg = fecha.getSeconds().toString().padStart(2,'0');

      return [
        l.nombre,
        l.apellido,
        l.email,
        `${dia}/${mes}/${anio} ${hora}:${min}:${seg}`
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['Nombre', 'Apellido', 'Email', 'Fecha']],
      body: dataFormateada,
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245] },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    doc.save(`log_ingresos_${fechaEmision.toISOString().split('T')[0]}.pdf`);
  };
}
exportarDatosDirectosPDF() {
  // Esta función omite el gráfico y solo exporta la tabla
  if (!this.turnosPorMedicoSolicitados || this.turnosPorMedicoSolicitados.length === 0) {
    alert('No hay datos');
    return;
  }
  
  const doc = new jsPDF();
  
  // Solo tabla
  autoTable(doc, {
    head: [['Especialidad', 'Cantidad']],
    body: this.turnosPorMedicoSolicitados.map(t => [t.especialidad, t.cantidad]),
  });
  
  doc.save('datos_directos.pdf');
}


exportTurnosSolicitadosPDF() {
  console.log('📤 ========== INICIO EXPORTACIÓN ==========');
  console.log('1. Datos disponibles:', this.turnosPorMedicoSolicitados);
  console.log('2. Longitud de datos:', this.turnosPorMedicoSolicitados?.length);
  console.log('3. Gráfico disponible:', !!this.chartSolicitadoEspecialidades);
  console.log('4. Canvas del gráfico:', this.chartSolicitadoEspecialidades?.canvas);
  console.log('5. Turnos vacíos flag:', this.turnosSolicitadosVacios);
  
  // Verificación más robusta
  if (!this.turnosPorMedicoSolicitados || this.turnosPorMedicoSolicitados.length === 0) {
    console.error('❌ ERROR: No hay datos en turnosPorMedicoSolicitados');
    alert('No hay datos para exportar. Por favor, primero consulta los turnos solicitados.');
    return;
  }

  if (!this.chartSolicitadoEspecialidades?.canvas) {
    console.error('❌ ERROR: Gráfico no disponible o canvas no accesible');
    alert('El gráfico no está disponible. Por favor, genera el gráfico primero.');
    return;
  }

  console.log('✅ Todas las verificaciones pasadas, generando PDF...');
  
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const fecha = new Date();
    
    // URL del logo (ajusta según tu estructura de carpetas)
    const logoUrl = 'assets/images/icon.png'; 
    // Alternativas comunes:
    // 'assets/logo.png'
    // 'assets/images/logo.jpg'
    // 'assets/iconos/logo.svg' (si es SVG, necesitarás convertirlo)
    
    const img = new Image();
    img.src = logoUrl;
    
    img.onload = () => {
      try {
        // Agregar logo en la esquina superior izquierda
        doc.addImage(img, 'PNG', 10, 10, 30, 30);
        
        // Cabecera del documento (al lado del logo)
        doc.setFontSize(18);
        doc.text('Turnos Solicitados por Médico', 50, 20);
        
        doc.setFontSize(11);
        doc.text(`Fecha de emisión: ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`, 50, 28);
        
        if (this.medicoSeleccionadoSolicitados) {
          doc.text(`Médico: ${this.medicoSeleccionadoSolicitados.nombre} ${this.medicoSeleccionadoSolicitados.apellido}`, 50, 35);
        }
        
        doc.text(`Período: ${this.fechaDesdeSolicitados?.toLocaleDateString()} - ${this.fechaHastaSolicitados?.toLocaleDateString()}`, 50, 42);
        
        // Gráfico
        console.log('🖼️ Capturando imagen del gráfico...');
        const imgData = this.chartSolicitadoEspecialidades!.canvas.toDataURL('image/png', 1.0);
        console.log('📸 Imagen capturada:', imgData?.substring(0, 50) + '...');
        
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth() - 20;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // Posición Y del gráfico (debajo del encabezado)
        doc.addImage(imgData, 'PNG', 10, 55, pdfWidth, Math.min(pdfHeight, 90));
        
        // Tabla
        console.log('📋 Generando tabla con datos:', this.turnosPorMedicoSolicitados);
        const startY = 55 + Math.min(pdfHeight, 90) + 10;
        
        autoTable(doc, {
          startY: startY,
          head: [['Especialidad', 'Cantidad']],
          body: this.turnosPorMedicoSolicitados.map(t => [t.especialidad, t.cantidad]),
          theme: 'grid',
          headStyles: { fillColor: [66, 135, 245] }, // Azul para solicitados
          styles: { fontSize: 10 }
        });
        
        // Pie de página opcional con logo pequeño
        const pageHeight = doc.internal.pageSize.height;
        doc.addImage(img, 'PNG', 10, pageHeight - 20, 15, 15);
        doc.setFontSize(9);
        doc.text('Clinica Médica - Sistema de Gestión', 30, pageHeight - 15);
        
        const nombreArchivo = `turnos_solicitados_${fecha.toISOString().split('T')[0]}`;
        console.log('💾 Guardando PDF como:', nombreArchivo);
        
        doc.save(`${nombreArchivo}.pdf`);
        console.log('✅ PDF generado exitosamente');
        
      } catch (error: any) {
        alert('Error al generar el PDF: ' + error.message);
        console.error(error);
      }
    };
    
    // Si falla la carga del logo, continuar sin él
    img.onerror = () => {
      console.warn('⚠️ No se pudo cargar el logo, generando PDF sin logo');
    };
    
  } catch (error: any) {
    alert('Error al generar el PDF: ' + error.message);
    console.error(error);
  }
}



exportTurnosPorDiaSemanaPDF() {
  if (!this.turnosPorDiaSemana || !this.turnosPorDiaSemana.length) {
    alert('No hay datos para exportar');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');

  // Logo de la clínica
  const logoUrl = 'assets/logo-clinica.png'; // ajusta la ruta de tu logo
  const img = new Image();
  img.src = logoUrl;
  img.onload = () => {
    doc.addImage(img, 'PNG', 10, 10, 30, 30); // x, y, width, height

    // Título del informe
    doc.setFontSize(18);
    doc.text('Turnos por Día de la Semana', 50, 20);

    // Fecha de emisión
    doc.setFontSize(11);
    const fechaEmision = new Date();
    doc.text(`Fecha de emisión: ${fechaEmision.toLocaleString()}`, 50, 28);

    // Gráfico
    if (this.chartPorDiaSemana) {
      const imgData = this.chartPorDiaSemana.canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 40, 180, 90); // ajusta posición según necesites
    }

    // Tabla de datos
    const dataFormateada = this.turnosPorDiaSemana.map(d => [d.dia, d.cantidad]);
    autoTable(doc, {
      startY: 140, // debajo del gráfico
      head: [['Día', 'Cantidad de turnos']],
      body: dataFormateada,
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245] },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    doc.save(`turnos_por_dia_semana_${fechaEmision.toISOString().split('T')[0]}.pdf`);
  };
}

async consultarTurnosRealizados() {
  if (!this.medicoSeleccionadoRealizados || !this.fechaDesdeRealizados || !this.fechaHastaRealizados) {
    alert('Por favor, selecciona médico y fechas');
    return;
  }

  const desde = this.convertirFechaAFormatoSQL(this.fechaDesdeRealizados);
  const hasta = this.convertirFechaAFormatoSQL(this.fechaHastaRealizados);

  try {
    console.log('🔍 Consultando turnos realizados...');
    
    // 1. Obtener datos del servicio
    const data = await this.turnosService.obtenerTurnosPorEspecialidadDeMedico(
      this.medicoSeleccionadoRealizados.id, 
      desde, 
      hasta, 
      'realizado'
    );

    console.log('📊 Datos recibidos del servicio (realizados):', data);
    
    // 2. ASIGNAR los datos a la variable del componente
    this.turnosPorMedicoRealizados = data || [];
    
    console.log('💾 Datos asignados a turnosPorMedicoRealizados:', this.turnosPorMedicoRealizados);
    
    // 3. Actualizar estado
    this.turnosRealizadosVacios = this.turnosPorMedicoRealizados.length === 0;
    
    // 4. Renderizar gráfico si hay datos
    if (!this.turnosRealizadosVacios) {
      console.log('🎨 Renderizando gráfico de realizados...');
      
      // Esperar un ciclo para asegurar que el canvas esté disponible
      setTimeout(() => {
        this.renderizarGraficoTorta(
          this.chartFinalizadoRef, 
          this.turnosPorMedicoRealizados, // <-- Usar los datos asignados
          'realizado'
        );
        console.log('✅ Gráfico de realizados renderizado con:', this.turnosPorMedicoRealizados);
      }, 100);
    } else {
      console.warn('⚠️ No hay datos de realizados para mostrar');
      alert('No se encontraron turnos realizados con los filtros seleccionados');
    }
    
  } catch (error) {
    console.error('❌ Error consultando turnos realizados:', error);
    alert('Error al consultar los turnos realizados');
    this.turnosRealizadosVacios = true;
    this.turnosPorMedicoRealizados = []; // Asegurar array vacío
  }
}


}
