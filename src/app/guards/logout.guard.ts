// src/app/guards/logout.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const LogoutGuard: CanMatchFn = async () => {
  const authSrv = inject(AuthService);
  const router = inject(Router);

  try {
    const usuario = await authSrv.getUsuarioActual();

    if (!usuario) {
      return true;
    }

    router.navigate(['/home']);
    return false;
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    return true;
  }
};
