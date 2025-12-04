import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { v4 as uuidv4 } from "jsr:@std/uuid@1.0.0/uuid";

// Cliente con SERVICE ROLE KEY (tu backend seguro)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface CaptchaSession {
  token: string;
  correctIds: string[];
  expiresAt: number;
}

// Almacenamiento temporal en memoria
const captchaStore: Record<string, CaptchaSession> = {};

Deno.serve(async (_req) => {
  try {
    // Listar imágenes del bucket en carpeta "captcha/"
    const { data: list, error: listError } = await supabase.storage
      .from("imagenes")
      .list("captcha", { limit: 100 });

    if (listError || !list) {
      return new Response("Error al listar imágenes", { status: 500 });
    }

    // Construir objetos imagen
    const images = list.map((item) => {
      const { data } = supabase.storage
        .from("imagenes")
        .getPublicUrl(`captcha/${item.name}`);

      return {
        id: item.name,
        src: data.publicUrl,
        category: item.name.split("_")[0] // ej: "peaton_01.jpg" → "peaton"
      };
    });

    // Seleccionar 6 imágenes random
    const shuffled = images.sort(() => Math.random() - 0.5).slice(0, 6);

    // La categoría a encontrar (por ahora fija)
    const target = "peaton";

    const correctIds = shuffled
      .filter(img => img.category === target)
      .map(img => img.id);

    // Crear token de sesión
    const token = uuidv4.generate();

    captchaStore[token] = {
      token,
      correctIds,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    return new Response(
      JSON.stringify({
        token,
        target,
        images: shuffled.map(img => ({ id: img.id, src: img.src }))
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    console.error(err);
    return new Response("Error interno", { status: 500 });
  }
});
