import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import supabase from '../services/supabase.client';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private authSrv: AuthService,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    try {
      const usuarioAuth = await this.authSrv.getUsuarioActual();

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
        console.error('Error obteniendo datos del usuario:', error);
        this.router.navigate(['/login']);
        return false;
      }

      const rolPermitido = route.data?.['rol'];
      
      console.log('🔍 Debug RoleGuard:', {
        usuario: usuarioAuth.email,
        tipo_usuario: usuario.tipo_usuario,
        estado: usuario.estado,
        rolPermitido: rolPermitido,
        rutaIntentada: route.routeConfig?.path
      });

      if (usuario.tipo_usuario === rolPermitido) {
        if ((usuario.tipo_usuario === 'paciente' || usuario.tipo_usuario === 'especialista') && 
            usuario.estado !== 'activo') {
          console.log('🚫 Usuario no activo, redirigiendo...');
          this.router.navigate(['/login']);
          return false;
        }
        console.log('Acceso permitido');
        return true;
      }

      console.log('Rol incorrecto, redirigiendo...');
      
      this.redirigirSegunTipoUsuario(usuario.tipo_usuario, usuario.estado);
      return false;

    } catch (error) {
      console.error('❌ Error al verificar rol:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }

  private redirigirSegunTipoUsuario(tipoUsuario: string, estado: string): void {
    console.log(`🔄 Redirigiendo usuario ${tipoUsuario} con estado ${estado}`);
    
    if (tipoUsuario === 'paciente' && estado === 'activo') {
      this.router.navigate(['/home/paciente']);
    } else if (tipoUsuario === 'especialista' && estado === 'activo') {
      this.router.navigate(['/home/especialista']);
    } else if (tipoUsuario === 'administrador') {
      this.router.navigate(['/home/administrador']);
    } else {
      // Para usuarios pendientes o inactivos
      console.log('🚫 Usuario inactivo o pendiente, redirigiendo a login');
      this.router.navigate(['/login']);
    }
  }
}