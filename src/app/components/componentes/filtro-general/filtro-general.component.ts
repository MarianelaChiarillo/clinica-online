import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltroService } from '../../../services/usuarios/filtro.service';
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

  constructor(private filtroService: FiltroService) {}

  onInputChange(event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    this.textoFiltro = valor;

    if (this.turnos && this.turnos.length > 0) {
      const turnosFiltrados = this.filtroService.aplicarFiltro(
        [...this.turnos],
        valor,
        this.tipoUsuario
      );
      this.turnosFiltradosChange.emit(turnosFiltrados);
    }

    this.filtroChange.emit(valor);
  }

  limpiarFiltro() {
    this.textoFiltro = '';

    if (this.turnos && this.turnos.length > 0) {
      const turnosSinFiltro = this.filtroService.aplicarFiltro(
        [...this.turnos],
        '',
        this.tipoUsuario
      );
      this.turnosFiltradosChange.emit(turnosSinFiltro);
    }

    this.filtroChange.emit('');
  }
}
