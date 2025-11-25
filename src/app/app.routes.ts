import { Routes } from '@angular/router';
import { ConfirmEmailComponent } from './components/confirmar-email/confirmar-email';
import { AuthGuard } from './guards/auth.guard';
import { LogoutGuard } from './guards/logout.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/bienvenida/bienvenida').then(
            (m) => m.Bienvenida
          ),
      },
        {
        path: 'paciente',
        canActivate: [AuthGuard, RoleGuard],
        data: { rol: 'paciente' },
        loadComponent: () =>
          import('./components/usuarios/paciente/paciente.component').then(
            (m) => m.PacienteComponent
          ),
      },
      {
        path: 'especialista',
        canActivate: [AuthGuard, RoleGuard],
        data: { rol: 'especialista' }, 
        loadComponent: () =>
          import('./components/usuarios/especialista/especialista.component').then(
            (m) => m.EspecialistaComponent
          ),
      },
      {
        path: 'administrador',
        canActivate: [AuthGuard, RoleGuard],
        data: { rol: 'administrador' }, 
        loadComponent: () =>
          import('./components/usuarios/administrador/administrador.component').then(
            (m) => m.AdministradorComponente
          ),
      },
    ],
  },
  {
    path: 'login',
    canMatch: [LogoutGuard],

    loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    canMatch: [LogoutGuard],
    loadChildren: () => import('./components/registro/registro.routes').then((m) => m.Registro),
  },
    {
    path: 'turnos',
    loadChildren: () => import('./components/turnos/turnos.routes').then((m) => m.Turnos),
  },
    {
    path: 'horarios',
    loadComponent: () => import('./components/horarios/horarios.component').then((m) => m.MisHorariosComponent),
  },
   {
    path: 'solicitar-turno',
    loadComponent: () => import('./components/solicitar-turno/solicitar-turno.component').then((m) => m.SolicitarTurnoComponent),
  },
    {
    path: 'bienvenida',
    loadComponent: () => import('./components/bienvenida/bienvenida').then((m) => m.Bienvenida),
  },
  {
    path: 'auth/confirm',
    component: ConfirmEmailComponent,
  },
  {
    path: 'confirm',
    component: ConfirmEmailComponent,
  },
  

  { path: '**', redirectTo: 'home' },
];
