import { Injectable } from '@angular/core';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import supabase from './supabase.client';

@Injectable({ providedIn: 'root' })
export class ArchivosService {
  // Logo de la clínica en Base64 (deberás reemplazar esto con tu logo real)
  private readonly LOGO_CLINICA_BASE64 = 'assets/images/icon.png';

  crearArchivoExcel(datos: any[], nombreArchivo: string, nombreHoja: string = 'Datos'): any {
    const hoja = utils.json_to_sheet(datos);
    const libro = utils.book_new();
    utils.book_append_sheet(libro, hoja, nombreHoja);
    return libro;
  }

  guardarArchivoExcel(libro: any, nombreArchivo: string): void {
    writeFile(libro, `${nombreArchivo}_${this.obtenerFechaActual()}.xlsx`);
  }

  exportarExcel(datos: any[], nombreArchivo: string, nombreHoja: string = 'Datos'): void {
    if (!datos || datos.length === 0) return;
    const libro = this.crearArchivoExcel(datos, nombreArchivo, nombreHoja);
    this.guardarArchivoExcel(libro, nombreArchivo);
  }

  formatearTurnos(turnos: any[], paciente?: any): any[] {
    return turnos.map((turno, indice) => ({
      Numero: indice + 1,
      Paciente: paciente ? `${paciente.nombre || ''} ${paciente.apellido || ''}`.trim() : 'N/A',
      DNI: paciente ? paciente.dni : 'N/A',
      Especialidad: turno.especialidad?.nombre || 
                   turno.especialidades?.nombre || 
                   turno.especialidad_nombre || 
                   'N/A',
      Especialista: turno.especialista ? 
                   `${turno.especialista.nombre || ''} ${turno.especialista.apellido || ''}`.trim() :
                   turno.especialistas ? 
                   `${turno.especialistas.nombre || ''} ${turno.especialistas.apellido || ''}`.trim() :
                   turno.especialista_nombre || 'N/A',
      Fecha: turno.fecha_turno || 'N/A',
      HoraInicio: turno.hora_inicio || 'N/A',
      HoraFin: turno.hora_fin || 'N/A',
      Estado: turno.estado || 'N/A'
    }));
  }

  crearDocumentoPDF(titulo: string): jsPDF {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(titulo, 10, 15);
    return doc;
  }

  agregarTablaPDF(doc: jsPDF, datos: any[], columnas: { key: string; header: string }[]): void {
    const cuerpo = datos.map(fila => columnas.map(columna => fila[columna.key] || ''));
    autoTable(doc, {
      startY: 25,
      head: [columnas.map(columna => columna.header)],
      body: cuerpo,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' }
    });
  }

  guardarPDF(doc: jsPDF, nombreArchivo: string): void {
    doc.save(`${nombreArchivo}_${this.obtenerFechaActual()}.pdf`);
  }

  exportarPDF(titulo: string, datos: any[], columnas: { key: string; header: string }[], nombreArchivo: string): void {
    if (!datos || datos.length === 0) return;
    const doc = this.crearDocumentoPDF(titulo);
    this.agregarTablaPDF(doc, datos, columnas);
    this.guardarPDF(doc, nombreArchivo);
  }

  formatearUsuarios(usuarios: any[]): any[] {
    return usuarios.map((usuario, indice) => ({
      Numero: indice + 1,
      Nombre: usuario.nombre || 'N/A',
      Apellido: usuario.apellido || 'N/A',
      DNI: usuario.dni || 'N/A',
      Email: usuario.email || 'N/A',
      TipoUsuario: usuario.tipo_usuario || 'N/A',
      Estado: usuario.estado || 'N/A',
      ObraSocial: usuario.obra_social || 'N/A'
    }));
  }

  async obtenerTurnosPaciente(pacienteId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha_turno', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async obtenerTurnosEspecialista(especialistaId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('especialista_id', especialistaId)
      .order('fecha_turno', { ascending: false });
    if (error) return [];
    return data || [];
  }

  obtenerFechaActual(): string {
    return new Date().toISOString().split('T')[0];
  }

  generarExcelUsuariosGeneral(usuarios: any[]) {
    const datos = this.formatearUsuarios(usuarios);
    this.exportarExcel(datos, 'usuarios_general');
  }

  exportarExcelUsuarios(usuarios: any[], nombreArchivo: string): void {
    const datosFormateados = this.formatearUsuariosParaExcel(usuarios);
    this.exportarExcel(datosFormateados, nombreArchivo, 'Usuarios');
  }

  formatearUsuariosParaExcel(usuarios: any[]): any[] {
    return usuarios.map((usuario, indice) => ({
      'N°': indice + 1,
      'Nombre': usuario.nombre || 'N/A',
      'Apellido': usuario.apellido || 'N/A',
      'DNI': usuario.dni || 'N/A',
      'Email': usuario.email || 'N/A',
      'Tipo de Usuario': usuario.tipo_usuario || 'N/A',
      'Estado': usuario.estado || 'N/A',
      'Obra Social': usuario.obra_social || 'N/A',
      'Especialidades': usuario.especialidades?.join(', ') || 'N/A',
    }));
  }

  private getTurnosRealizados(usuario: any): number {
    return usuario?.turnos?.filter((t: any) => 
      t.estado === 'realizado' || t.estado === 'completado'
    )?.length || 0;
  }

  // ==================== DESCARGA DE HISTORIA CLÍNICA COMPLETA ====================
  async descargarHistoriaClinicaCompleta(usuario: any, historias: any[], nombreArchivo: string) {
    if (!historias || historias.length === 0) {
      throw new Error('El paciente no tiene historias clínicas registradas');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    this.agregarEncabezadoConLogo(doc, pageWidth);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Paciente: ${usuario.nombre} ${usuario.apellido}`, 20, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`DNI: ${usuario.dni || 'N/A'}`, 20, 60);
    doc.text(`Email: ${usuario.email || 'N/A'}`, 20, 65);
    doc.text(`Obra Social: ${usuario.obra_social || 'N/A'}`, 20, 70);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 75, pageWidth - 20, 75);
    
    let yPos = 85;

    historias.forEach((historia, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
        this.agregarEncabezadoConLogo(doc, pageWidth);
        yPos = 30;
      }
      
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      
      const fechaConsulta = this.formatearFecha(
        historia.fecha_creacion || historia.turno?.fecha_turno
      );
      
      doc.text(`Consulta del ${fechaConsulta}`, 20, yPos);
      yPos += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const especialista = this.obtenerNombreEspecialista(historia);
      const especialidad = this.obtenerEspecialidad(historia);
      
      doc.text(`Dr. ${especialista} - ${especialidad}`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Datos Fijos:', 20, yPos);
      yPos += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const datosFijos = [
        `Altura: ${historia.altura || 'N/A'} cm`,
        `Peso: ${historia.peso || 'N/A'} kg`,
        `Temperatura: ${historia.temperatura || 'N/A'} °C`,
        `Presión: ${historia.presion || 'N/A'}`
      ];
      
      datosFijos.forEach(dato => {
        doc.text(dato, 25, yPos);
        yPos += 6;
      });
      
      if (historia.datos_dinamicos?.length > 0) {
        yPos += 3;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Datos Adicionales:', 20, yPos);
        yPos += 7;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        historia.datos_dinamicos.forEach((dato: any) => {
          const clave = dato.clave || 'Sin clave';
          const valor = this.obtenerValorDato(dato);
          
          doc.text(`${clave}: ${valor}`, 25, yPos);
          yPos += 6;
          
          if (yPos > 270 && index < historias.length - 1) {
            doc.addPage();
            yPos = 20;
            this.agregarEncabezadoConLogo(doc, pageWidth);
            yPos = 30;
          }
        });
      }
      
      if (index < historias.length - 1) {
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 10;
      }
    });
    
    this.agregarNumeroPagina(doc);
    
    const fechaDescarga = new Date().toISOString().split('T')[0];
    doc.save(`${nombreArchivo}_${fechaDescarga}.pdf`);
  }

  // ==================== DESCARGA DE HISTORIA CLÍNICA INDIVIDUAL ====================
  async descargarHistoriaClinicaIndividual(usuario: any, historia: any, nombreArchivo: string) {
    if (!historia) {
      throw new Error('No hay historia clínica para descargar');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    this.agregarEncabezadoConLogo(doc, pageWidth);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Paciente: ${usuario.nombre} ${usuario.apellido}`, 20, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`DNI: ${usuario.dni || 'N/A'}`, 20, 60);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 65, pageWidth - 20, 65);
    
    let yPos = 75;
    
    const fechaConsulta = this.formatearFecha(
      historia.fecha_creacion || historia.turno?.fecha_turno
    );
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Consulta del ${fechaConsulta}`, 20, yPos);
    yPos += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const especialista = this.obtenerNombreEspecialista(historia);
    const especialidad = this.obtenerEspecialidad(historia);
    
    doc.text(`Dr. ${especialista} - ${especialidad}`, 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos Fijos:', 20, yPos);
    yPos += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const datosFijos = [
      `Altura: ${historia.altura || 'N/A'} cm`,
      `Peso: ${historia.peso || 'N/A'} kg`,
      `Temperatura: ${historia.temperatura || 'N/A'} °C`,
      `Presión: ${historia.presion || 'N/A'}`
    ];
    
    datosFijos.forEach(dato => {
      doc.text(dato, 25, yPos);
      yPos += 6;
    });
    
    if (historia.datos_dinamicos && historia.datos_dinamicos.length > 0) {
      yPos += 3;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Datos Adicionales:', 20, yPos);
      yPos += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      historia.datos_dinamicos.forEach((dato: any) => {
        const clave = dato.clave || 'Sin clave';
        let valor = dato.valor || '';
        
        if (!valor) {
          if (dato.valor_texto !== undefined && dato.valor_texto !== null) valor = dato.valor_texto;
          else if (dato.valor_numerico !== undefined && dato.valor_numerico !== null) valor = dato.valor_numerico.toString();
          else if (dato.valor_rango !== undefined && dato.valor_rango !== null) valor = `${dato.valor_rango}%`;
          else if (dato.valor_switch !== undefined && dato.valor_switch !== null) valor = dato.valor_switch ? 'Sí' : 'No';
        }
        
        doc.text(`${clave}: ${valor}`, 25, yPos);
        yPos += 6;
      });
    }
    
    doc.setFontSize(10);
    doc.text('Página 1 de 1', pageWidth / 2, 285, { align: 'center' });
    
    doc.save(`${nombreArchivo}.pdf`);
  }

  // ==================== MÉTODOS PRIVADOS AUXILIARES ====================
  private agregarEncabezadoConLogo(doc: jsPDF, pageWidth: number): void {
    if (this.LOGO_CLINICA_BASE64) {
      try {
        doc.addImage(this.LOGO_CLINICA_BASE64, 'PNG', 15, 10, 35, 35);
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 152, 219);
        doc.text('CLÍNICA SALUD INTEGRAL', 55, 25);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Centro Médico Especializado', 55, 32);
      } catch (error) {
        this.agregarEncabezadoTexto(doc, pageWidth);
      }
    } else {
      this.agregarEncabezadoTexto(doc, pageWidth);
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const fechaEmision = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - 60, 20);
  }

  private agregarEncabezadoTexto(doc: jsPDF, pageWidth: number): void {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 152, 219);
    doc.text('CLÍNICA SALUD INTEGRAL', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Historia Clínica Digital', pageWidth / 2, 28, { align: 'center' });
    
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(1);
    doc.line(pageWidth / 2 - 40, 32, pageWidth / 2 + 40, 32);
    
    doc.setTextColor(0, 0, 0);
  }

  private formatearFecha(fechaString: string): string {
    if (!fechaString) return 'Fecha no disponible';
    
    try {
      const fecha = new Date(fechaString);
      return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Fecha no disponible';
    }
  }

  private obtenerNombreEspecialista(historia: any): string {
    const especialista = historia.turno?.especialista || historia.turno?.especialistas;
    if (especialista) {
      return `${especialista.nombre || ''} ${especialista.apellido || ''}`.trim();
    }
    return 'N/A';
  }

  private obtenerEspecialidad(historia: any): string {
    return historia.turno?.especialidad?.nombre || 
           historia.turno?.especialidades?.nombre || 
           'N/A';
  }

  private obtenerValorDato(dato: any): string {
    let valor = dato.valor || '';
    
    if (!valor) {
      if (dato.valor_texto !== undefined && dato.valor_texto !== null) {
        valor = dato.valor_texto;
      } else if (dato.valor_numerico !== undefined && dato.valor_numerico !== null) {
        valor = dato.valor_numerico.toString();
      } else if (dato.valor_rango !== undefined && dato.valor_rango !== null) {
        valor = `${dato.valor_rango}%`;
      } else if (dato.valor_switch !== undefined && dato.valor_switch !== null) {
        valor = dato.valor_switch ? 'Sí' : 'No';
      }
    }
    
    return valor || 'N/A';
  }

  private agregarNumeroPagina(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pagina = `Página ${i} de ${pageCount}`;
      const fecha = new Date().toLocaleDateString('es-AR');
      
      doc.text(pagina, pageWidth / 2, 285, { align: 'center' });
      doc.text(`Documento generado: ${fecha}`, pageWidth - 20, 285, { align: 'right' });
      
      doc.setDrawColor(220, 220, 220);
      doc.line(20, 275, pageWidth - 20, 275);
      
      doc.setTextColor(0, 0, 0);
    }
  }

  // ==================== EXCEL TURNOS PACIENTE ====================
  async generarExcelTurnosPaciente(usuario: any) {
    try {
      let turnos = usuario.turnos;
      if (!turnos || turnos.length === 0) {
        turnos = await this.obtenerTurnosPaciente(usuario.id);
      }
      
      if (!turnos || turnos.length === 0) {
        throw new Error('No hay turnos para exportar');
      }
      
      const datos = this.formatearTurnosParaExcel(turnos, usuario);
      
      const nombreArchivo = `turnos_${usuario.nombre}_${usuario.apellido}`.replace(/\s+/g, '_');
      
      this.exportarExcel(datos, nombreArchivo, 'Turnos');
      
    } catch (error) {
      throw error;
    }
  }

  formatearTurnosParaExcel(turnos: any[], paciente?: any): any[] {
    return turnos.map((turno, indice) => {
      return {
        'N°': indice + 1,
        'Paciente': paciente ? `${paciente.nombre || ''} ${paciente.apellido || ''}`.trim() : 'N/A',
        'DNI Paciente': paciente ? paciente.dni : 'N/A',
        'Especialidad': this.obtenerEspecialidadExcel(turno),
        'Especialista': this.obtenerEspecialistaExcel(turno),
        'Fecha': turno.fecha_turno || 'N/A',
        'Hora Inicio': turno.hora_inicio || 'N/A',
        'Hora Fin': turno.hora_fin || 'N/A',
        'Estado': turno.estado || 'N/A',
      };
    });
  }

  private obtenerEspecialidadExcel(turno: any): string {
    if (turno.especialidad?.nombre) return turno.especialidad.nombre;
    if (turno.especialidades?.nombre) return turno.especialidades.nombre;
    if (turno.especialidad_nombre) return turno.especialidad_nombre;
    return 'N/A';
  }

  private obtenerEspecialistaExcel(turno: any): string {
    if (turno.especialista) {
      return `${turno.especialista.nombre || ''} ${turno.especialista.apellido || ''}`.trim();
    }
    if (turno.especialistas) {
      return `${turno.especialistas.nombre || ''} ${turno.especialistas.apellido || ''}`.trim();
    }
    if (turno.especialista_nombre) return turno.especialista_nombre;
    return 'N/A';
  }

  // En tu ArchivosService
async descargarHistoriaClinicaCompletaP(usuario: any, historias: any[], nombreArchivo: string, especialista?: string) {
  if (!historias || historias.length === 0) {
    throw new Error('No hay historias clínicas para descargar');
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // ENCABEZADO
  if (this.LOGO_CLINICA_BASE64) {
    try {
      doc.addImage(this.LOGO_CLINICA_BASE64, 'PNG', 15, 10, 35, 35);
    } catch (error) {
      console.warn('Error al cargar logo:', error);
    }
  }
  
  // TÍTULO DEL INFORME
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  
  let titulo = 'HISTORIA CLÍNICA DEL PACIENTE';
  if (especialista && especialista !== 'todos') {
    titulo = `HISTORIA CLÍNICA - Dr. ${especialista}`;
  }
  
  doc.text(titulo, pageWidth / 2, 40, { align: 'center' });
  
  // FECHA DE EMISIÓN
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const fechaEmision = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth / 2, 50, { align: 'center' });
  
  // INFORMACIÓN DEL PACIENTE
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Paciente: ${usuario.nombre} ${usuario.apellido}`, 20, 70);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`DNI: ${usuario.dni || 'N/A'}`, 20, 80);
  doc.text(`Obra Social: ${usuario.obra_social || 'N/A'}`, 20, 85);
  
  if (especialista && especialista !== 'todos') {
    doc.text(`Especialista: ${especialista}`, 20, 90);
  }
  
  doc.text(`Total de atenciones: ${historias.length}`, 20, 95);
  
  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 100, pageWidth - 20, 100);
  
  let yPos = 110;
  
  // ITERAR POR CADA HISTORIA CLÍNICA
  historias.forEach((historia, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // FECHA DE LA CONSULTA
    const fechaConsulta = historia.turno?.fecha_turno 
      ? new Date(historia.turno.fecha_turno).toLocaleDateString('es-AR')
      : 'Fecha no disponible';
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Atención #${index + 1} - ${fechaConsulta}`, 20, yPos);
    yPos += 7;
    
    // ESPECIALIDAD
    if (historia.turno?.especialidad?.nombre) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Especialidad: ${historia.turno.especialidad.nombre}`, 20, yPos);
      yPos += 6;
    }
    
    // DATOS FIJOS
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos Fijos:', 20, yPos);
    yPos += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const datosFijos = [
      `Altura: ${historia.altura || 'N/A'} cm`,
      `Peso: ${historia.peso || 'N/A'} kg`,
      `Temperatura: ${historia.temperatura || 'N/A'} °C`,
      `Presión: ${historia.presion || 'N/A'}`
    ];
    
    datosFijos.forEach(dato => {
      doc.text(dato, 25, yPos);
      yPos += 6;
    });
    
    // DATOS DINÁMICOS
    if (historia.datos_dinamicos?.length > 0) {
      yPos += 3;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Datos Adicionales:', 20, yPos);
      yPos += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      historia.datos_dinamicos.forEach((dato: any) => {
        const clave = dato.clave || 'Sin clave';
        let valor = dato.valor || '';
        
        if (!valor) {
          if (dato.valor_texto !== undefined) valor = dato.valor_texto;
          else if (dato.valor_numerico !== undefined) valor = dato.valor_numerico.toString();
          else if (dato.valor_rango !== undefined) valor = `${dato.valor_rango}%`;
          else if (dato.valor_switch !== undefined) valor = dato.valor_switch ? 'Sí' : 'No';
        }
        
        doc.text(`${clave}: ${valor}`, 25, yPos);
        yPos += 6;
      });
    }
    
    // COMENTARIO
    if (historia.comentario) {
      yPos += 3;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text(`Comentario: ${historia.comentario}`, 20, yPos);
      yPos += 10;
    }
    
    // SEPARADOR ENTRE CONSULTAS
    if (index < historias.length - 1) {
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;
    }
  });
  
  // NÚMERO DE PÁGINA
  this.agregarNumeroPagina(doc);
  
  // GUARDAR
  const fechaDescarga = new Date().toISOString().split('T')[0];
  doc.save(`${nombreArchivo}_${fechaDescarga}.pdf`);
}
}