import { Injectable } from '@angular/core';
import { UsuarioService } from './usuario.service';
import supabase from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class AdministradorService {

  constructor(private usuarioService: UsuarioService) {}

  async crearAdministrador(admin: any) {
    const { data, error } = await this.usuarioService.crear({
      auth_id: admin.auth_id,
      email: admin.email,
      tipo_usuario: 'administrador',
      estado: 'activo',
      imagen_perfil: admin.imagen_perfil
    });

    if (error || !data) {
      return { data: null, error };
    }

    return this.usuarioService.crearRelacionado('administradores', {
      usuario_id: data.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      edad: admin.edad,
      dni: admin.dni
    });
  }

  actualizarDatos(usuarioId: number, datos: any) {
    return this.usuarioService.actualizarRelacionado('administradores', usuarioId, datos);
  }

  obtenerPorUsuarioId(usuarioId: number) {
    return this.usuarioService.obtenerRelacionado('administradores', usuarioId);
  }

  async obtenerTodos() {
    const { data, error } = await supabase
      .from('administradores')
      .select('*');

    return { data, error };
  }
}
