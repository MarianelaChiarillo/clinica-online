import { Routes } from '@angular/router';
import { RegistroComponent } from './registro.component/registro.component';
import { EspecialistaForm } from './registro-form/especialista-form';
import { PacienteForm } from './registro-form/paciente-form';

export const Registro: Routes = [
  {
    path: '',
    component: RegistroComponent, 
    children: [
      {
        path: 'paciente',
        component: PacienteForm,
      },
      {
        path: 'especialista',
        component: EspecialistaForm,
      },
    ],
  },
];
