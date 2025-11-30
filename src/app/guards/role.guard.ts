import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import supabase from '../services/supabase.client';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private servicioAuth: AuthService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    try {
      const usuarioAuth = await this.servicioAuth.getUsuarioActual();

      if (!usuarioAuth) {
        this.router.navigate(['/bienvenida']);
        return false;
      }

      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('tipo_usuario, estado')
        .eq('auth_id', usuarioAuth.id)
        .single();

      if (error || !usuario) {
        this.router.navigate(['/login']);
        return false;
      }

      const rolPermitido = route.data?.['rol'];

      if (usuario.tipo_usuario === rolPermitido) {
        if (
          (usuario.tipo_usuario === 'paciente' || usuario.tipo_usuario === 'especialista') &&
          usuario.estado !== 'activo'
        ) {
          this.router.navigate(['/login']);
          return false;
        }
        return true;
      }

      this.redirigirSegunTipoUsuario(usuario.tipo_usuario, usuario.estado);
      return false;
    } catch (error) {
      this.router.navigate(['/login']);
      return false;
    }
  }

  private redirigirSegunTipoUsuario(tipoUsuario: string, estado: string): void {
    if (tipoUsuario === 'paciente' && estado === 'activo') {
      this.router.navigate(['/home/paciente']);
    } else if (tipoUsuario === 'especialista' && estado === 'activo') {
      this.router.navigate(['/home/especialista']);
    } else if (tipoUsuario === 'administrador') {
      this.router.navigate(['/home/administrador']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
