// pdf.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  private async cargarLogo(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = './icon.png'; // Ruta de tu logo
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = reject;
    });
  }

  // ============================================================
  // HISTORIA CLÍNICA COMPLETA (como la de mi-perfil)
  // ============================================================
  async generarHistoriaClinicaCompleta(
    paciente: any, 
    historiasClinicas: any[], 
    titulo: string = 'Historia Clínica'
  ): Promise<jsPDF> {
    const doc = new jsPDF();

    // Logo
    try {
      const logo = await this.cargarLogo();
      doc.addImage(logo, 'PNG', 10, 10, 35, 35);
    } catch (error) {
      console.warn('No se pudo cargar el logo, continuando sin él...');
    }

    // Título y datos del paciente
    doc.setFontSize(18);
    doc.text(`${titulo} - ${paciente.nombre} ${paciente.apellido}`, 10, 55);

    doc.setFontSize(12);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 10, 65);
    doc.text(`DNI: ${paciente.dni}`, 10, 75);
    
    if (paciente.obra_social) {
      doc.text(`Obra Social: ${paciente.obra_social}`, 10, 85);
    }

    const body: any[] = [];
    let startY = 95;

    // Si no hay historias clínicas
    if (!historiasClinicas || historiasClinicas.length === 0) {
      doc.text('No hay historias clínicas registradas', 10, startY);
      return doc;
    }

    // Generar contenido de cada historia clínica
    historiasClinicas.forEach((h, index) => {
      // Encabezado de la consulta
      body.push(['CONSULTA', `#${index + 1}`]);
      body.push(['Fecha del turno', h.turno?.fecha_turno || '-']);
      body.push(['Especialista', `${h.turno?.especialista?.nombre} ${h.turno?.especialista?.apellido}` || '-']);
      body.push(['Especialidad', h.turno?.especialidad?.nombre || '-']);
      
      // Datos fijos
      body.push(['Altura', `${h.altura} cm`]);
      body.push(['Peso', `${h.peso} kg`]);
      body.push(['Temperatura', `${h.temperatura} °C`]);
      body.push(['Presión', h.presion]);

      // Datos dinámicos
      if (h.datos_dinamicos?.length > 0) {
        h.datos_dinamicos.forEach((d: any) => {
          body.push([d.clave, d.valor]);
        });
      }

      // Separador entre consultas (excepto la última)
      if (index < historiasClinicas.length - 1) {
        body.push(['—', '—']);
      }
    });

    autoTable(doc, {
      startY: startY,
      head: [['Campo', 'Valor']],
      body,
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    return doc;
  }

  // ============================================================
  // HISTORIA CLÍNICA INDIVIDUAL (para un turno específico)
  // ============================================================
  async generarHistoriaClinicaIndividual(
    paciente: any,
    historia: any,
    titulo: string = 'Historia Clínica'
  ): Promise<jsPDF> {
    const doc = new jsPDF();

    // Logo
    try {
      const logo = await this.cargarLogo();
      doc.addImage(logo, 'PNG', 10, 10, 35, 35);
    } catch (error) {
      console.warn('No se pudo cargar el logo, continuando sin él...');
    }

    // Título y datos del paciente
    doc.setFontSize(18);
    doc.text(`${titulo}`, 10, 55);

    doc.setFontSize(12);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 10, 65);
    doc.text(`Paciente: ${paciente.nombre} ${paciente.apellido}`, 10, 75);
    doc.text(`DNI: ${paciente.dni}`, 10, 85);

    const body: any[] = [];
    let startY = 100;

    // Información de la consulta
    body.push(['Fecha del turno', historia.turno?.fecha_turno || '-']);
    body.push(['Especialista', `${historia.turno?.especialista?.nombre} ${historia.turno?.especialista?.apellido}` || '-']);
    body.push(['Especialidad', historia.turno?.especialidad?.nombre || '-']);
    body.push(['Horario', `${historia.turno?.hora_inicio} - ${historia.turno?.hora_fin}` || '-']);
    
    // Separador
    body.push(['—', '—']);

    // Datos fijos
    body.push(['Altura', `${historia.altura} cm`]);
    body.push(['Peso', `${historia.peso} kg`]);
    body.push(['Temperatura', `${historia.temperatura} °C`]);
    body.push(['Presión', historia.presion]);

    // Datos dinámicos
    if (historia.datos_dinamicos?.length > 0) {
      body.push(['—', '—']);
      body.push(['DATOS ADICIONALES', '']);
      historia.datos_dinamicos.forEach((d: any) => {
        body.push([d.clave, d.valor]);
      });
    }

    autoTable(doc, {
      startY: startY,
      head: [['Campo', 'Valor']],
      body,
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    return doc;
  }

  // ============================================================
  // LISTA DE USUARIOS (para administradores)
  // ============================================================
  async generarListaUsuarios(
    usuarios: any[],
    titulo: string = 'Lista de Usuarios'
  ): Promise<jsPDF> {
    const doc = new jsPDF();

    // Logo
    try {
      const logo = await this.cargarLogo();
      doc.addImage(logo, 'PNG', 10, 10, 35, 35);
    } catch (error) {
      console.warn('No se pudo cargar el logo, continuando sin él...');
    }

    // Título
    doc.setFontSize(18);
    doc.text(titulo, 10, 55);

    doc.setFontSize(12);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 10, 65);
    doc.text(`Total de usuarios: ${usuarios.length}`, 10, 75);

    const body: any[] = [];

    usuarios.forEach((usuario, index) => {
      body.push([
        index + 1,
        `${usuario.nombre} ${usuario.apellido}`,
        usuario.dni,
        usuario.email,
        usuario.tipo_usuario,
        usuario.estado,
        usuario.obra_social || 'N/A'
      ]);
    });

    autoTable(doc, {
      startY: 85,
      head: [['#', 'Nombre', 'DNI', 'Email', 'Tipo', 'Estado', 'Obra Social']],
      body,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 45 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 30 }
      }
    });

    return doc;
  }

  // ============================================================
  // MÉTODOS DE DESCARGA
  // ============================================================

  descargarPdf(doc: jsPDF, nombreArchivo: string): void {
    doc.save(nombreArchivo);
  }

  // Método rápido para historia clínica completa
  async descargarHistoriaClinicaCompleta(
    paciente: any,
    historiasClinicas: any[],
    nombreArchivo?: string
  ): Promise<void> {
    const doc = await this.generarHistoriaClinicaCompleta(paciente, historiasClinicas);
    const filename = nombreArchivo || `historia-clinica-${paciente.nombre}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.descargarPdf(doc, filename);
  }

  // Método rápido para historia clínica individual
  async descargarHistoriaClinicaIndividual(
    paciente: any,
    historia: any,
    nombreArchivo?: string
  ): Promise<void> {
    const doc = await this.generarHistoriaClinicaIndividual(paciente, historia);
    const fechaTurno = historia.turno?.fecha_turno?.split('T')[0] || new Date().toISOString().split('T')[0];
    const filename = nombreArchivo || `historia-clinica-${paciente.nombre}-${fechaTurno}.pdf`;
    this.descargarPdf(doc, filename);
  }
}