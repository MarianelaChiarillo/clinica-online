import { Injectable } from '@angular/core';
import supabase from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class EspecialidadService {

  async obtenerTodas(activo: boolean = true): Promise<any[]> {
    const respuesta = await supabase
      .from('especialidades')
      .select('*')
      .eq('activo', activo)
      .order('nombre', { ascending: true });

    if (respuesta.error) {
      throw respuesta.error;
    }

    if (!respuesta.data) {
      return [];
    }

    return respuesta.data;
  }

  async crear(nombre: string): Promise<any> {
    const respuesta = await supabase
      .from('especialidades')
      .insert([{ nombre: nombre, activo: false }])
      .select()
      .single();

    if (respuesta.error) {
      throw respuesta.error;
    }

    return respuesta.data;
  }
}
