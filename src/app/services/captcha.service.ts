import { Injectable } from '@angular/core';
import supabase from './supabase.client';
@Injectable({ providedIn: 'root' })
export class CaptchaService {
  

  async generarCaptcha() {
    try {
      console.log('🔄 Generando captcha (seleccionar TODAS las de la categoría)...');

      // 1. Traer TODAS las imágenes de la base de datos
      const { data: todasLasImagenes, error } = await supabase
        .from('captcha_images')
        .select('id, url, category');

      if (error || !todasLasImagenes || todasLasImagenes.length === 0) {
        console.error('❌ Error al traer imágenes o base de datos vacía:', error);
        return this.getCaptchaEmergencia();
      }

      // 2. Agrupar imágenes por categoría
      const imagenesPorCategoria: {[categoria: string]: any[]} = {};
      todasLasImagenes.forEach(img => {
        if (!imagenesPorCategoria[img.category]) {
          imagenesPorCategoria[img.category] = [];
        }
        imagenesPorCategoria[img.category].push(img);
      });

      // 3. Asegurar que hay al menos las tres categorías necesarias
      const categoriasPrincipales = ['peaton', 'puentes', 'escaleras'];
      const categoriasDisponibles = categoriasPrincipales.filter(c => imagenesPorCategoria[c]?.length >= 1);
      if (categoriasDisponibles.length < 3) {
        console.error('❌ No hay imágenes suficientes de las tres categorías principales');
        return this.getCaptchaEmergencia();
      }

      // 4. Elegir categoría objetivo aleatoria
      const target = categoriasDisponibles[Math.floor(Math.random() * categoriasDisponibles.length)];

     // 5. Tomar TODAS las imágenes de la categoría objetivo (máx 4)
const imagenesTargetDisponibles = [...new Set(imagenesPorCategoria[target])]; // eliminar duplicados
const imagenesTarget = imagenesTargetDisponibles
  .sort(() => Math.random() - 0.5)
  .slice(0, 4);

// 6. Calcular cuántas imágenes más necesitamos para completar 6
let imagenesNecesarias = 6 - imagenesTarget.length;

// 7. Tomar al menos 1 imagen de cada categoría restante sin repetir
const otrasCategorias = categoriasPrincipales.filter(cat => cat !== target);
let otrasImagenes: any[] = [];

otrasCategorias.forEach(cat => {
  if (imagenesNecesarias > 0) {
    const disponibles = imagenesPorCategoria[cat]
      .filter(img => !imagenesTarget.includes(img) && !otrasImagenes.includes(img)) // evitar repetidos
      .sort(() => Math.random() - 0.5)
      .slice(0, 1);
    otrasImagenes = [...otrasImagenes, ...disponibles];
    imagenesNecesarias -= disponibles.length;
  }
});

// 8. Si aún faltan imágenes para llegar a 6, tomar aleatorias de cualquier categoría sin repetir
if (imagenesNecesarias > 0) {
  const restantes = todasLasImagenes
    .filter(img => !imagenesTarget.includes(img) && !otrasImagenes.includes(img))
    .sort(() => Math.random() - 0.5)
    .slice(0, imagenesNecesarias);
  otrasImagenes = [...otrasImagenes, ...restantes];
}

// 9. Combinar todas las imágenes y mezclar
const imagenesFinales = [...imagenesTarget, ...otrasImagenes]
  .sort(() => Math.random() - 0.5)
  .slice(0, 6);


      // 10. Determinar IDs correctos (todas las imágenes de la categoría objetivo)
      const correctIds = imagenesFinales
        .filter(img => img.category === target)
        .map(img => img.id.toString());

      // 11. Crear token y guardar sesión
      const token = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { error: insertError } = await supabase
        .from('captcha_sessions')
        .insert({
          token,
          correct_ids: correctIds,
          expires_at: new Date(Date.now() + 5 * 60000).toISOString()
        });
      if (insertError) console.error('❌ Error guardando sesión:', insertError);

      return {
        token,
        target,
        images: imagenesFinales.map(img => ({ id: img.id.toString(), src: img.url }))
      };

    } catch (error) {
      console.error('💥 Error en generarCaptcha:', error);
      return this.getCaptchaEmergencia();
    }
  }

  async verificarCaptcha(token: string, selectedIds: string[]): Promise<boolean> {
  try {
    // 1. Recuperar la sesión
    const { data: session, error } = await supabase
      .from('captcha_sessions')
      .select('correct_ids, expires_at')
      .eq('token', token)
      .single();

    if (error || !session) return false;

    // 2. Revisar si expiró
    if (new Date(session.expires_at) < new Date()) {
      // Eliminar sesión expiradas
      await supabase.from('captcha_sessions').delete().eq('token', token);
      return false;
    }

    // 3. Verificar que todos los correctIds estén seleccionados (no importa el orden)
    const correctIds = session.correct_ids || [];
    const selected = selectedIds || [];

    const esValido =
      selected.length > 0 &&
      correctIds.every((id: string) => selected.includes(id)) &&
      selected.every(id => correctIds.includes(id));

    // 4. Actualizar estado verificado en la base
    await supabase
      .from('captcha_sessions')
      .update({ is_verified: esValido })
      .eq('token', token);

    return esValido;

  } catch (error) {
    console.error('💥 Error en verificarCaptcha:', error);
    return false;
  }
}

  async verificarBaseDatos() {
    try {
      const { data: todasImagenes, error } = await supabase.from('captcha_images').select('category');
      if (error) throw error;

      const contador: {[categoria: string]: number} = {};
      todasImagenes?.forEach(img => {
        contador[img.category] = (contador[img.category] || 0) + 1;
      });

      console.log('📊 Categorías y cantidad de imágenes:');
      Object.keys(contador).forEach(c => console.log(`  ${c}: ${contador[c]} imágenes`));

    } catch (error) {
      console.error('Error verificando base de datos:', error);
    }
  }
  async recuperarCaptcha(token: string) {
  try {
    const { data: session, error } = await supabase
      .from('captcha_sessions')
      .select('correct_ids, expires_at')
      .eq('token', token)
      .single();

    if (error || !session || new Date(session.expires_at) < new Date()) {
      return this.getCaptchaEmergencia();
    }

    // Recuperar las imágenes de esa sesión
    const { data: images } = await supabase
      .from('captcha_images')
      .select('id, url, category')
      .in('id', session.correct_ids);

    return {
      token,
      target: images![0]?.category || 'peaton',
      images: images!.map(img => ({ id: img.id.toString(), src: img.url }))
    };
  } catch (error) {
    console.error('Error recuperando captcha:', error);
    return this.getCaptchaEmergencia();
  }
}


 public async borrarSesion(token: string): Promise<void> {
    await supabase
      .from('captcha_sessions')
      .delete()
      .eq('token', token);
  }
  private getImagenesEjemplo() {
    return [
      { id: '1', url: 'https://picsum.photos/200/300?random=1', category: 'peaton' },
      { id: '2', url: 'https://picsum.photos/200/300?random=2', category: 'peaton' },
      { id: '3', url: 'https://picsum.photos/200/300?random=3', category: 'puentes' },
      { id: '4', url: 'https://picsum.photos/200/300?random=4', category: 'puentes' },
      { id: '5', url: 'https://picsum.photos/200/300?random=5', category: 'escaleras' },
      { id: '6', url: 'https://picsum.photos/200/300?random=6', category: 'escaleras' },
      { id: '7', url: 'https://picsum.photos/200/300?random=7', category: 'peaton' },
      { id: '8', url: 'https://picsum.photos/200/300?random=8', category: 'puentes' },
      { id: '9', url: 'https://picsum.photos/200/300?random=9', category: 'escaleras' },
    ];
  }

  private getCaptchaEmergencia() {
    const imagenes = this.getImagenesEjemplo();
    const todasImagenes = [...imagenes].sort(() => Math.random() - 0.5).slice(0, 6);
    const target = [...new Set(todasImagenes.map(img => img.category))][0];
    return {
      token: 'emergencia_' + Date.now(),
      target,
      images: todasImagenes.map(img => ({ id: img.id, src: img.url }))
    };
  }
}
