import { Injectable } from '@angular/core';
import supabase from './supabase.client';

@Injectable({ providedIn: 'root' })
export class StorageService {

  async subirImagen(archivo: File, carpeta: string = 'perfiles') {
    const tiempo = Date.now();
    const nombreArchivo = tiempo + '_' + archivo.name;
    const ruta = carpeta + '/' + nombreArchivo;

    const respuesta = await supabase.storage.from('imagenes').upload(ruta, archivo);
    if (respuesta.error) throw respuesta.error;

    const publicUrlRespuesta = supabase.storage.from('imagenes').getPublicUrl(ruta);
    return publicUrlRespuesta.data.publicUrl;
  }

  async obtenerImagen(urlPublica: string): Promise<string> {
    if (!urlPublica) return '';

    let esUrlCompleta = false;
    let http = "http";
    let coincide = true;

    for (let i = 0; i < http.length; i++) {
      if (urlPublica[i] !== http[i]) {
        coincide = false;
        break;
      }
    }

    if (coincide) esUrlCompleta = true;

    let ruta = urlPublica;

    if (esUrlCompleta) {
      const marcador = "/object/public/";
      let inicioMarcador = -1;

      for (let i = 0; i < urlPublica.length - marcador.length; i++) {
        let match = true;
        for (let j = 0; j < marcador.length; j++) {
          if (urlPublica[i + j] !== marcador[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          inicioMarcador = i + marcador.length;
          break;
        }
      }

      if (inicioMarcador === -1) return '';

      ruta = '';
      for (let i = inicioMarcador; i < urlPublica.length; i++) {
        ruta += urlPublica[i];
      }

      const prefijo = "imagenes/";
      let tienePrefijo = true;

      for (let i = 0; i < prefijo.length && i < ruta.length; i++) {
        if (ruta[i] !== prefijo[i]) {
          tienePrefijo = false;
          break;
        }
      }

      if (tienePrefijo) {
        let rutaSinPrefijo = '';
        for (let i = prefijo.length; i < ruta.length; i++) {
          rutaSinPrefijo += ruta[i];
        }
        ruta = rutaSinPrefijo;
      }
    }

    const descarga = await supabase.storage.from('imagenes').download(ruta);
    if (descarga.error) throw descarga.error;

    return URL.createObjectURL(descarga.data);
  }
}
