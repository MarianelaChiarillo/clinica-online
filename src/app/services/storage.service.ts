import { Injectable } from '@angular/core';
import supabase from './supabase.client';

@Injectable({ providedIn: 'root' })
export class StorageService {

  private fallbackEspecialidad = 'assets/images/usuario-default.png';
  private fallbackUsuario = 'assets/images/icono-persona.png';

  async subirImagen(archivo: File, carpeta: 'perfiles' | 'especialidades' = 'perfiles'): Promise<string> {
    const tiempo = Date.now();
    const nombreArchivo = `${tiempo}_${archivo.name}`;
    const ruta = `${carpeta}/${nombreArchivo}`;

    const { error } = await supabase.storage.from('imagenes').upload(ruta, archivo);
    if (error) throw error;

    const { data } = supabase.storage.from('imagenes').getPublicUrl(ruta);
    return data.publicUrl;
  }


  async obtenerImagen(ruta: string | undefined | null, tipo: 'especialidad' | 'especialista'): Promise<string> {
    if (!ruta) {
      return this.getFallback(tipo);
    }

    if (ruta.startsWith('http')) {
      return ruta;
    }

    
    const bucket = 'imagenes';
    const carpeta = tipo === 'especialidad' ? 'especialidades' : 'perfiles';
    
    const nombreCodificado = encodeURIComponent(ruta);
    
    const url = `https://wylsfdneqoyglkxkyjjm.supabase.co/storage/v1/object/public/${bucket}/${carpeta}/${nombreCodificado}`;
    
    return url;
  }

  private getFallback(tipo: 'especialidad' | 'especialista'): string {
    return tipo === 'especialidad' ? this.fallbackEspecialidad : this.fallbackUsuario;
  }

}
