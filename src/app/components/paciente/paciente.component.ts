import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-paciente.component',
  imports: [],
  templateUrl: './paciente.component.html',
  styleUrl: './paciente.component.scss',
})
export class PacienteComponent {
  constructor(private router: Router) {}
  verturnos() {
    this.router.navigate(['/turnos/paciente']);
  }
}
