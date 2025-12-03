import { Injectable } from '@angular/core';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import supabase from './supabase.client';

@Injectable({ providedIn: 'root' })
export class ArchivosService {

 
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

  formatearTurnos(turnos: any[]): any[] {
    return turnos.map((turno, indice) => ({
      Numero: indice + 1,
      Paciente: turno.paciente_nombre || 'N/A',
      DNI: turno.paciente_dni || 'N/A',
      Especialidad: turno.especialidad_nombre || 'N/A',
      Especialista: turno.especialista_nombre || 'N/A',
      Fecha: turno.fecha_turno || 'N/A',
      HoraInicio: turno.hora_inicio || 'N/A',
      HoraFin: turno.hora_fin || 'N/A',
      Estado: turno.estado || 'N/A'
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


  
  async descargarHistoriaClinicaCompleta(usuario: any, historias: any[], nombreArchivo: string) {
    if (!historias || historias.length === 0) return;

    const doc = this.crearDocumentoPDF(`Historia clínica completa de ${usuario.nombre} ${usuario.apellido}`);

    historias.forEach((h, i) => {
      doc.text(`Historia #${i + 1} - Turno: ${h.turno?.fecha_turno || 'N/A'}`, 10, 25 + i * 10);
      const datos = h.datos_dinamicos?.map((d: any) => ({ Clave: d.clave, Valor: d.valor })) || [];
      this.agregarTablaPDF(doc, datos, [{ key: 'Clave', header: 'Clave' }, { key: 'Valor', header: 'Valor' }]);
    });

    this.guardarPDF(doc, nombreArchivo);
  }

  async descargarHistoriaClinicaIndividual(usuario: any, historia: any, nombreArchivo: string) {
    const doc = this.crearDocumentoPDF(`Historia clínica de ${usuario.nombre} ${usuario.apellido}`);
    doc.text(`Turno: ${historia.turno?.fecha_turno || 'N/A'}`, 10, 25);

    const datos = historia.datos_dinamicos?.map((d: any) => ({ Clave: d.clave, Valor: d.valor })) || [];
    this.agregarTablaPDF(doc, datos, [{ key: 'Clave', header: 'Clave' }, { key: 'Valor', header: 'Valor' }]);

    this.guardarPDF(doc, nombreArchivo);
  }

  generarExcelUsuariosGeneral(usuarios: any[]) {
    const datos = this.formatearUsuarios(usuarios);
    this.exportarExcel(datos, 'usuarios_general');
  }

  async generarExcelTurnosPaciente(usuario: any) {
    const turnos = usuario.turnos || await this.obtenerTurnosPaciente(usuario.id);
    const datos = this.formatearTurnos(turnos);
    this.exportarExcel(datos, `turnos_${usuario.nombre}`);
  }

}
