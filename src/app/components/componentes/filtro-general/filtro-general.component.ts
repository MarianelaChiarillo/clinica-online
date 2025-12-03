import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilsService } from '../../../services/utils.service';
import { TurnoExtendido } from '../../../models/turno';

@Component({
  selector: 'app-filtro-general',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filtro-general.component.html',
  styleUrls: ['./filtro-general.component.scss'],
})
export class FiltroGeneralComponent {
  
  @Input() placeholder: string = 'Buscar...';
  @Input() tipoUsuario: 'paciente' | 'especialista' = 'paciente';
  @Input() turnos: TurnoExtendido[] = [];

  @Output() filtroChange = new EventEmitter<string>();
  @Output() turnosFiltradosChange = new EventEmitter<TurnoExtendido[]>();

  textoFiltro: string = '';

  constructor(private utilsService: UtilsService) {}

  onInputChange(event: Event) {
    const texto = (event.target as HTMLInputElement).value;
    this.textoFiltro = texto;

    this.emitirTextoDeFiltro(texto);
    this.filtrarTurnos(texto);
  }

  limpiarFiltro() {
    this.textoFiltro = '';

    this.emitirTextoDeFiltro('');
    this.filtrarTurnos('');
  }

  private emitirTextoDeFiltro(texto: string) {
    this.filtroChange.emit(texto);
  }

  private filtrarTurnos(texto: string) {
    if (!this.turnos || this.turnos.length === 0) {
      this.turnosFiltradosChange.emit([]);
      return;
    }

    const turnosFiltrados = this.utilsService.aplicarFiltroATurnos(
      [...this.turnos],
      texto,
      this.tipoUsuario
    );

    this.turnosFiltradosChange.emit(turnosFiltrados);
  }
}
