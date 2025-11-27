import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnosService } from './../../services/turnos.service';

@Component({
  selector: 'app-encuesta-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './encuesta.component.html',
  styleUrls: ['./encuesta.component.scss']
})
export class EncuestaModalComponent {
  @Input() turno: any;
  @Output() onClose = new EventEmitter<boolean>();

  preguntas = [
    { 
      campo: 'instalaciones', 
      texto: '¿Cómo calificarías las instalaciones?',
      hint: '1 = Muy malas, 5 = Excelentes'
    },
    { 
      campo: 'atencion', 
      texto: '¿Cómo calificarías la atención del especialista?',
      hint: '1 = Muy mala, 5 = Excelente' 
    },
    { 
      campo: 'tiempo_espera', 
      texto: '¿Cómo calificarías el tiempo de espera?',
      hint: '1 = Muy largo, 5 = Muy rápido'
    },
    { 
      campo: 'general', 
      texto: 'Calificación general de la experiencia',
      hint: '1 = Muy mala, 5 = Excelente'
    }
  ];

  respuestas: any = {
    instalaciones: null,
    atencion: null,
    tiempo_espera: null,
    general: null,
    comentarios: ''
  };

  enviando = false;
  error: string | null = null;

  constructor(private turnosService: TurnosService) {}

  encuestaCompleta(): boolean {
    return this.respuestas.instalaciones !== null && 
           this.respuestas.atencion !== null && 
           this.respuestas.tiempo_espera !== null && 
           this.respuestas.general !== null;
  }

  async enviarEncuesta() {
    if (!this.encuestaCompleta() || !this.turno) return;

    this.enviando = true;
    this.error = null;

    try {
      await this.turnosService.completarEncuesta(this.turno.id, this.respuestas);
      this.onClose.emit(true); // Éxito
    } catch (error: any) {
      this.error = error.message || 'Error al enviar la encuesta';
      console.error('Error enviando encuesta:', error);
    } finally {
      this.enviando = false;
    }
  }

  cerrar() {
    this.onClose.emit(false); // Cancelado
  }
}