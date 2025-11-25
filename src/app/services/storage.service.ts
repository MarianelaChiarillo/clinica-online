import { Injectable } from '@angular/core';
import supabase from './supabase.client';

@Injectable({ providedIn: 'root' })
export class StorageService {

  async subirImagen(archivo: File, carpeta = 'perfiles') {
    const nombreArchivo = Date.now() + '_' + archivo.name;
    const ruta = carpeta + '/' + nombreArchivo;

    const { error } = await supabase.storage.from('imagenes').upload(ruta, archivo);
    if (error) throw error;

    const { data } = supabase.storage.from('imagenes').getPublicUrl(ruta);
    return data.publicUrl;
  }

  async obtenerImagen(urlPublica: string): Promise<string> {
    if (!urlPublica) return '';

    let path = urlPublica;
    let esUrlCompleta = false;

    const http = "http";
    let coincide = true;

    for (let i = 0; i < http.length; i++) {
      if (urlPublica[i] !== http[i]) {
        coincide = false;
        break;
      }
    }

    if (coincide) esUrlCompleta = true;

    if (esUrlCompleta) {
      const marcador = "/object/public/";
      let inicio = -1;

      for (let i = 0; i < urlPublica.length - marcador.length; i++) {
        let match = true;

        for (let j = 0; j < marcador.length; j++) {
          if (urlPublica[i + j] !== marcador[j]) {
            match = false;
            break;
          }
        }

        if (match) {
          inicio = i + marcador.length;
          break;
        }
      }

      if (inicio === -1) return '';

      path = urlPublica.substring(inicio);

      // Quitar "imagenes/" manualmente
      const prefijo = "imagenes/";
      let tienePrefijo = true;

      for (let k = 0; k < prefijo.length && k < path.length; k++) {
        if (path[k] !== prefijo[k]) {
          tienePrefijo = false;
          break;
        }
      }

      if (tienePrefijo) {
        path = path.substring(prefijo.length);
      }
    }

    const { data, error } = await supabase.storage
      .from('imagenes')
      .download(path);

    if (error) throw error;

    return URL.createObjectURL(data);
  }
}
