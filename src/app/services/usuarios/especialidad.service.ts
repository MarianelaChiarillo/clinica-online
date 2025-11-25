import { Injectable } from '@angular/core';
import supabase from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class EspecialidadService {
async obtenerTodas(activo: boolean = true): Promise<any[]> {
  const { data, error } = await supabase
    .from('especialidades')
    .select('*')
    .eq('activo', activo) 
    .order('nombre', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

  async crear(nombre: string): Promise<any> {
    const { data, error } = await supabase
      .from('especialidades')
      .insert([{ nombre, activo: false }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }



}
