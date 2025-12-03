import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from './../../services/turnos.service';

type CamposEncuesta =
  'instalaciones' |
  'atencion' |
  'tiempo_espera' |
  'general' |
  'comentarios';

@Component({
  selector: 'app-encuesta-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './encuesta.component.html',
  styleUrls: ['./encuesta.component.scss']
})
export class EncuestaModalComponent {

  constructor(private turnosService: TurnoService) {}

  @Input() turno: any;
  @Output() onClose = new EventEmitter<boolean>();

  preguntas = [
    { campo: 'instalaciones' as const, texto: '¿Cómo calificarías las instalaciones?', pista: '1 a 5' },
    { campo: 'atencion' as const, texto: '¿Cómo calificarías la atención del especialista?', pista: '1 a 5' },
    { campo: 'tiempo_espera' as const, texto: '¿Cómo calificarías el tiempo de espera?', pista: '1 a 5' },
    { campo: 'general' as const, texto: 'Calificación general de la experiencia', pista: '1 a 5' }
  ];

  respuestas: Record<CamposEncuesta, number | string | null> = {
    instalaciones: null,
    atencion: null,
    tiempo_espera: null,
    general: null,
    comentarios: ''
  };

  enviando = false;
  error: string | null = null;

  encuestaEstaCompleta(): boolean {
    return (
      this.respuestas.instalaciones !== null &&
      this.respuestas.atencion !== null &&
      this.respuestas.tiempo_espera !== null &&
      this.respuestas.general !== null
    );
  }

  marcarRespuesta(campo: CamposEncuesta, valor: number) {
    this.respuestas[campo] = valor;
  }

  escribirComentario(texto: string) {
    this.respuestas.comentarios = texto;
  }

  async guardarEncuesta() {
    if (!this.encuestaEstaCompleta() || !this.turno) return;

    this.enviando = true;
    this.error = null;

    try {
      await this.turnosService.completarEncuesta(
        this.turno.id,
        this.respuestas
      );
      this.onClose.emit(true);

    } catch (error: any) {
      this.error = error.message || 'Ocurrió un error al enviar la encuesta';
    }

    this.enviando = false;
  }

  cerrarModal() {
    this.onClose.emit(false);
  }
}
