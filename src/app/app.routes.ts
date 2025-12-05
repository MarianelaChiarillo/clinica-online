import { Routes } from '@angular/router';
import { ConfirmarEmailComponent } from './components/confirmar-email/confirmar-email';
import { AuthGuard } from './guards/auth.guard';
import { LogoutGuard } from './guards/logout.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },

  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then((m) => m.HomeComponent),
    children: [
      {
        path: 'paciente',
        canActivate: [AuthGuard, RoleGuard],
        data: { rol: 'paciente' },
        loadComponent: () =>
          import('./components/paciente/paciente.component').then((m) => m.PacienteComponent),
      },
      {
        path: 'especialista',
        canActivate: [AuthGuard, RoleGuard],
        data: { rol: 'especialista' },
        loadComponent: () =>
          import('./components/especialista/especialista.component').then(
            (m) => m.EspecialistaComponent
          ),
      },
      {
        path: 'administrador',
        canActivate: [AuthGuard, RoleGuard],
        data: { rol: 'administrador' },
        loadComponent: () =>
          import('./components/administrador/administrador.component').then(
            (m) => m.AdministradorComponent
          ),
      },
      {
        path: 'bienvenida',
        loadComponent: () => import('./components/bienvenida/bienvenida').then((m) => m.Bienvenida),
      },
    ],
  },

  {
    path: 'usuarios/administrador',
    canActivate: [AuthGuard, RoleGuard],
    data: { rol: 'administrador' },
    loadComponent: () =>
      import('../app/components/usuarios/usuarios.component').then((m) => m.UsuarioComponente),
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
    path: 'horarios/especialista',
    canActivate: [AuthGuard, RoleGuard],
    data: { rol: 'especialista' },
    loadComponent: () =>
      import('./components/horarios/horarios.component').then((m) => m.MisHorariosComponent),
  },
  {
    path: 'solicitar-turno',
    children: [
      {
        path: 'paciente',
        loadComponent: () =>
          import('./components/solicitar-turno/solicitar-turno.component').then(
            (m) => m.SolicitarTurnoComponent
          ),
        canActivate: [AuthGuard, RoleGuard],
        data: { rol: 'paciente' },
      },
      {
        path: 'administrador',
        loadComponent: () =>
          import('./components/solicitar-turno/solicitar-turno.component').then(
            (m) => m.SolicitarTurnoComponent
          ),
        canActivate: [AuthGuard, RoleGuard],
        data: { rol: 'administrador' },
      },
      { path: '', pathMatch: 'full', redirectTo: 'paciente' }, // opción por defecto
    ],
  },
  {
    path: 'mi-perfil/paciente',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/mi-perfil/mi-perfil.component').then((m) => m.MiPerfilComponent),
    data: { rol: 'paciente' },
  },
  {
    path: 'mi-perfil/especialista',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/mi-perfil/mi-perfil.component').then((m) => m.MiPerfilComponent),
    data: { rol: 'especialista' },
  },
  {
    path: 'mi-perfil/administrador',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/mi-perfil/mi-perfil.component').then((m) => m.MiPerfilComponent),
    data: { rol: 'administrador' },
  },
  {
    path: 'pacientes',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('../app/components/pacientes-especialista/pacientes-especialista.component').then(
        (m) => m.PacientesAtendidosComponent
      ),
  },
  {
    path: 'estadisticas/administrador',
    canActivate: [AuthGuard, RoleGuard],
    data: { rol: 'administrador' },
    loadComponent: () =>
      import('./components/estadisticas/estadisticas.component').then(
        (m) => m.EstadisticasAdminComponent
      ),
  },
  {
    path: 'auth/confirm',
    component: ConfirmarEmailComponent,
  },
  {
    path: 'confirm',
    component: ConfirmarEmailComponent,
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
