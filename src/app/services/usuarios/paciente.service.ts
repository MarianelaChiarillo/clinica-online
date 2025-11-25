import { Injectable } from '@angular/core';
import supabase from '../supabase.client';
import { Paciente } from '../../models/user-data';
import { UsuarioService } from './usuario.service';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  constructor(private usuarioSrv: UsuarioService) {}

  async guardar(paciente: Paciente) {
    // 1️⃣ Crear usuario base
    const { data: usuarioData, error: usuarioError } = await this.usuarioSrv.crear({
      auth_id: paciente.auth_id,
      email: paciente.email,
      tipo_usuario: 'paciente',
      estado: 'activo',
      imagen_perfil: paciente.imagen_perfil,
    });

    if (usuarioError || !usuarioData) throw usuarioError;

    // 2️⃣ Crear perfil paciente
    const { data: pacienteData, error: pacienteError } = await supabase
      .from('pacientes')
      .insert([{
        usuario_id: usuarioData.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        edad: paciente.edad,
        dni: paciente.dni,
        obra_social: paciente.obra_social,
        segunda_imagen: paciente.segunda_imagen,
      }])
      .select()
      .single();

    if (pacienteError) throw pacienteError;

    return pacienteData;
  }
}
