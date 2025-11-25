import { Routes } from '@angular/router';
import { RegistroComponent } from './registro.component';

export const Registro: Routes = [
  {
    path: '',
    component: RegistroComponent,
    children: [
      {
        path: 'paciente',
        loadComponent: () =>
          import('./registro-paciente/paciente-form').then((m) => m.PacienteForm),
      },
      {
        path: 'especialista',
        loadComponent: () =>
          import('./registro-especialista/especialista-form').then((m) => m.EspecialistaForm),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./registro-admin/admin-form').then((m) => m.AdministradorFormComponent),
      },
    ],
  },
];
