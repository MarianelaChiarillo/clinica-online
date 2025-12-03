import { Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { RoleGuard } from '../../guards/role.guard';

export const Turnos: Routes = [
  {
    path: 'paciente',
    loadComponent: () =>
      import('./turnos-paciente/turnos-paciente.component').then(
        (m) => m.PacienteMisTurnosComponent
      ),
    canActivate: [AuthGuard, RoleGuard],
    data: { rol: 'paciente' },
  },
  {
    path: 'especialista',
    loadComponent: () =>
      import('./turnos-especialista/turnos-especialista.component').then(
        (m) => m.TurnosEspecialistaComponent
      ),
    canActivate: [AuthGuard, RoleGuard],
    data: { rol: 'especialista' },
  },
  {
    path: 'administrador',
    loadComponent: () =>
      import('./turnos-admin/turnos-admin.component').then(
        (m) => m.TurnosAdminComponent
      ),
    canActivate: [AuthGuard, RoleGuard],
    data: { rol: 'administrador' },
  },
];
