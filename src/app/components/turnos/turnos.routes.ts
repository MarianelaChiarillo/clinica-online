import { Routes } from '@angular/router';

export const Turnos: Routes = [
  {
    path: 'paciente',
    loadComponent: () =>
      import('./turnos-paciente/turnos-paciente.component').then(
        (m) => m.PacienteMisTurnosComponent
      ),
  },
  {
    path: 'especialista',
    loadComponent: () =>
      import('./turnos-especialista/turnos-especialista.component').then(
        (m) => m.TurnosEspecialistaComponent
      ),
  },
  {
    path: 'administrador',
    loadComponent: () =>
      import('./turnos-admin/turnos-admin.component').then(
        (m) => m.TurnosAdminComponent
      ),
  },
];
