// services/exportacion.service.ts
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class ExportacionService {

  exportarAExcel(data: any[], nombreArchivo: string, hojaNombre: string = 'Datos'): void {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar');
      alert('No hay datos para exportar');
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, hojaNombre);
      
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `${nombreArchivo}_${fecha}.xlsx`);
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      alert('Error al exportar a Excel');
    }
  }

  exportarAPDF(titulo: string, data: any[], columns: any[], nombreArchivo: string): void {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar a PDF');
      alert('No hay datos para exportar a PDF');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(16);
      doc.text(titulo, 14, 15);
      
      // Preparar datos para la tabla
      const body = data.map(row => 
        columns.map(col => row[col.key]?.toString() || '')
      );

      // Tabla
      (doc as any).autoTable({
        startY: 25,
        head: [columns.map(col => col.header)],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [66, 135, 245] },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { top: 25 }
      });

      const fecha = new Date().toISOString().split('T')[0];
      doc.save(`${nombreArchivo}_${fecha}.pdf`);
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      alert('Error al exportar a PDF');
    }
  }

  // Métodos específicos para cada tipo de informe
// services/exportacion.service.ts - Actualizar método de exportación
exportarLogIngresos(data: any[]): void {
  if (!data || data.length === 0) {
    alert('No hay datos de logs para exportar');
    return;
  }

  // Se corrige el mapeo para manejar fechas nulas o indefinidas de forma segura.
  const datosFormateados = data.map(item => {
    // Definimos el valor de la fecha de forma segura
    const fechaHora = item.ultimo_ingreso_fecha_hora;
    
    // Verificamos si la fecha existe antes de formatearla
    const fechaFormateada = fechaHora 
                              ? new Date(fechaHora).toLocaleDateString('es-ES') 
                              : 'N/A';
    const horaFormateada = fechaHora 
                            ? new Date(fechaHora).toLocaleTimeString('es-ES') 
                            : 'N/A';

    return {
      'Usuario Email': item.usuario_email,
      'Nombre Completo': item.usuario_email, // Usamos email ya que no traemos nombre/apellido
      'Tipo Usuario': item.tipo, 
      'Estado': item.estado || 'N/A',
      
      // Usamos los valores seguros para la exportación
      'Fecha Ingreso': fechaFormateada,
      'Hora Ingreso': horaFormateada,
      
      'Fuente': 'Sistema'
    };
  });

  // Exportación a Excel
  this.exportarAExcel(datosFormateados, 'log_ingresos_sistema', 'Ingresos');
  
}

exportarTurnosPorEspecialidad(data: any[]): void {
    
    // 🛑 QUITAR: this.exportarAExcel(data, 'turnos_por_especialidad', 'Especialidades');
    
    this.exportarAPDF(
      'Turnos por Especialidad',
      data,
      [
        { key: 'especialidad', header: 'Especialidad/Estado' }, // Ajuste de título para reflejar la lógica
        { key: 'cantidad', header: 'Cantidad' }
      ],
      'turnos_por_especialidad'
    );
}
  exportarTurnosPorDia(data: any[]): void {
    const datosFormateados = data.map(item => ({
      'Fecha': new Date(item.fecha).toLocaleDateString('es-ES'),
      'Cantidad': item.cantidad
    }));

    this.exportarAExcel(datosFormateados, 'turnos_por_dia', 'Turnos por Día');
    
    this.exportarAPDF(
      'Turnos por Día',
      datosFormateados,
      [
        { key: 'Fecha', header: 'Fecha' },
        { key: 'Cantidad', header: 'Cantidad' }
      ],
      'turnos_por_dia'
    );
  }

  exportarTurnosPorMedico(data: any[], tipo: string): void {
    const nombreTipo = tipo === 'solicitados' ? 'Solicitados' : 'Finalizados';
    this.exportarAExcel(data, `turnos_${tipo}_por_medico`, `Turnos ${nombreTipo}`);
    
    this.exportarAPDF(
      `Turnos ${nombreTipo} por Médico`,
      data,
      [
        { key: 'medico', header: 'Médico' },
        { key: 'cantidad', header: 'Cantidad' }
      ],
      `turnos_${tipo}_por_medico`
    );
  }

  exportarTurnosMedicoEspecifico(data: any[], medicoNombre: string): void {
    const datosFormateados = data.flatMap(grupo => 
      grupo.datos.map((dato: any) => ({
        'Médico': medicoNombre,
        'Tipo': grupo.tipo,
        'Fecha': new Date(dato.fecha).toLocaleDateString('es-ES'),
        'Cantidad': dato.cantidad
      }))
    );

    const nombreArchivo = `turnos_${medicoNombre.replace(/\s+/g, '_')}`;
    this.exportarAExcel(datosFormateados, nombreArchivo, 'Turnos Médico');
    
    this.exportarAPDF(
      `Turnos de ${medicoNombre}`,
      datosFormateados,
      [
        { key: 'Tipo', header: 'Tipo' },
        { key: 'Fecha', header: 'Fecha' },
        { key: 'Cantidad', header: 'Cantidad' }
      ],
      nombreArchivo
    );
  }
}