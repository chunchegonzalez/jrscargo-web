import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getInventoryItem } from '@/lib/supabase';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const TRACKING_API_TOKEN = process.env.TRACKING_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTgyNiwiZW1haWwiOiJqb3NlZ29uMjAwMEBob3RtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6MTIsInRlbmFudElkIjoiOWRjZGFlZGItZmZlMS00M2Y3LWI1ZTgtMDMzOGVjYjk4NmQwIiwiY2xpZW50SWQiOjYwODMsImNsaWVudENvZGUiOiJKUlMtMTAwMSIsImlzVG9wTWFzdGVyIjpmYWxzZSwiaXNNYXlvcmlzdGEiOnRydWUsImlhdCI6MTc4NjIzNzE1Mn0.ZLEBwa8iR_wLw59Akpl-PpR_Mwq3h3IBO6XKVi2PZpQ";

async function fetchTrackingData(trackingNumber: string) {
  try {
    const res = await fetch(`https://worldboxcr.com/api/jrscargo/tracking/${encodeURIComponent(trackingNumber)}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${TRACKING_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    let data: Record<string, unknown> = {};
    if (res.ok) {
      data = await res.json();
    }
    
    try {
      const localItem = await getInventoryItem(trackingNumber);
      if (localItem && localItem.status) {
        if (!data.package) data.package = { tracking: trackingNumber };
        const isDelivered = localItem.status.toLowerCase().includes('entregad');
        (data.package as Record<string, unknown>).statusLabel = isDelivered ? 'Entregado' : 'En Bodega Costa Rica';
        (data.package as Record<string, unknown>).weight = localItem.weight || (data.package as Record<string, unknown>).weight;
      }
    } catch {
      // Ignore local error
    }

    return data;
  } catch {
    return null;
  }
}

// Smart Local Knowledge Engine for instant answers without API failure
function getSmartLocalResponse(lastMessage: string): string {
  const msg = lastMessage.toLowerCase().trim();

  // 1. Rastreo directo si es un tracking o contiene palabras de rastreo
  const trackingMatch = lastMessage.match(/[A-Za-z0-9]{8,35}/);
  if (msg.includes('rastrear') || msg.includes('tracking') || msg.includes('paquete') || msg.includes('donde esta') || msg.includes('dónde está') || trackingMatch) {
    if (trackingMatch && !msg.includes('tarifa') && !msg.includes('precio') && !msg.includes('horario')) {
      return `📦 Para consultar tu número de guía ${trackingMatch[0]}, puedes ingresar directamente a nuestra sección de rastreo en tiempo real: jrscargocr.com/tracking?number=${trackingMatch[0]} o indicármelo aquí para asistirte.`;
    }
    return `📦 *Rastreo de Paquetes en JRS CARGO*\n\nPor favor compárteme tu número de tracking (guía) para consultar su ubicación exacta en Miami o Costa Rica en tiempo real.`;
  }

  // 2. Tarifas y Precios
  if (msg.includes('tarifa') || msg.includes('precio') || msg.includes('costo') || msg.includes('cuanto vale') || msg.includes('cuánto vale') || msg.includes('cuanto cuesta') || msg.includes('cuánto cuesta') || msg.includes('libra') || msg.includes('aereo') || msg.includes('aéreo') || msg.includes('maritimo') || msg.includes('marítimo')) {
    return `✈️ *TARIFAS DE ENVÍO JRS CARGO*\n\n` +
      `📦 *Aéreo:* \n` +
      `• Miami (USA) ➡️ Costa Rica: *$7 por libra*\n` +
      `• España (Madrid) ➡️ Costa Rica: *$15 por libra*\n` +
      `• China ➡️ Costa Rica: *$17 por libra*\n\n` +
      `🚢 *Marítimo:* \n` +
      `• Miami (USA) ➡️ Costa Rica: *$30 por pie cúbico (ft³)*\n\n` +
      `💡 *Beneficios incluidos:* Entrega rápida en 3 a 5 días hábiles (aéreo), asesoría aduanal y casillero 100% gratuito.`;
  }

  // 3. Casillero / Registro / Dirección
  if (msg.includes('casillero') || msg.includes('direccion') || msg.includes('dirección') || msg.includes('abrir') || msg.includes('registro') || msg.includes('cuenta') || msg.includes('miami')) {
    return `🏢 *TU CASILLERO GRATUITO EN MIAMI*\n\n` +
      `Puedes abrir tu casillero en 1 minuto de forma gratuita aquí:\n` +
      `👉 *worldboxcr.com/jrscargo/register*\n\n` +
      `📍 *Formato de dirección en compras (Amazon, eBay, etc.):*\n` +
      `• *Nombre:* Tu Nombre Completo + (Código JRS)\n` +
      `• *Dirección:* 8280 NW 64th St\n` +
      `• *Ciudad:* Miami\n` +
      `• *Estado:* FL (Florida)\n` +
      `• *Código Postal:* 33166\n` +
      `• *Teléfono:* +1 (786) 388-7100`;
  }

  // 4. Tiempos de entrega
  if (msg.includes('tiempo') || msg.includes('tarda') || msg.includes('dias') || msg.includes('días') || msg.includes('duracion') || msg.includes('duración') || msg.includes('cuando llega') || msg.includes('cuándo llega')) {
    return `⏱️ *TIEMPOS DE ENTREGA ESTIMADOS*\n\n` +
      `✈️ *Servicio Aéreo:* De *3 a 5 días hábiles* una vez recibido en nuestra bodega de origen (Miami, Madrid o China).\n\n` +
      `🚢 *Servicio Marítimo:* De *2 a 3 semanas* desde el despacho en Miami.\n\n` +
      `🚚 *En Costa Rica:* Entregamos en el GAM y enviamos a todo el país mediante Correos de Costa Rica o encomienda.`;
  }

  // 5. Contacto / WhatsApp / Asesor Humano / Ubicación
  if (msg.includes('whatsapp') || msg.includes('humano') || msg.includes('asesor') || msg.includes('persona') || msg.includes('telefono') || msg.includes('teléfono') || msg.includes('contacto') || msg.includes('oficina') || msg.includes('ubicacion') || msg.includes('ubicación')) {
    return `💬 *ATENCIÓN PERSONALIZADA*\n\n` +
      `Nuestro equipo de asesores en Costa Rica está listo para ayudarte:\n\n` +
      `📱 *WhatsApp:* +506 7260 1238 (wa.me/50672601238)\n` +
      `✉️ *Correo:* info@jrscargocr.com\n` +
      `🕒 *Horario:* Lunes a Viernes de 8:00 AM a 5:30 PM`;
  }

  // 6. Respuesta por defecto cordial y orientativa
  return `¡Hola! 👋 Soy *Clari*, tu asistente virtual de JRS CARGO.\n\n` +
    `Puedo ayudarte con:\n` +
    `• 📦 *Rastreo de tus paquetes* con número de guía\n` +
    `• ✈️ *Tarifas y cotizaciones* (Aéreo $7/lb, Marítimo $30/ft³)\n` +
    `• 🏢 *Información de casillero gratuito* en Miami, España y China\n` +
    `• ⏱️ *Tiempos de tránsito y entregas*\n\n` +
    `¿En qué te puedo asesorar hoy? También puedes escribirnos directamente a nuestro WhatsApp oficial: +506 7260 1238.`;
}

// Helper to stream text in AI SDK standard protocol format (0:"chunk"\n)
function createStreamResponse(fullText: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Stream in small words to produce a natural typing animation
      const words = fullText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
        await new Promise(r => setTimeout(r, 18));
      }
      controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    }
  });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content || '';

    // If Google API Key is configured, attempt full AI agent with tools
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const result = await streamText({
          model: google('gemini-1.5-flash'),
          system: `Eres Clari, el asistente virtual oficial e inteligente de JRS CARGO, empresa de logística líder en Costa Rica.
Tu misión es brindar atención cordial, rápida, ejecutiva y precisa.

INFORMACIÓN OFICIAL JRS CARGO:
- Casillero gratuito en Miami, España y China. Registro en: worldboxcr.com/jrscargo/register
- Tarifa Aérea Miami: $7 por libra (lb). Entrega en 3 a 5 días hábiles.
- Tarifa Aérea España: $15 por libra (lb).
- Tarifa Aérea China: $17 por libra (lb).
- Tarifa Marítima Miami: $30 por pie cúbico (ft³). Entrega en 2 a 3 semanas.
- WhatsApp de atención: +506 7260 1238 (wa.me/50672601238)
- Dirección Miami: 8280 NW 64th St, Miami, FL 33166.
- Entregas en todo Costa Rica (GAM a domicilio y envíos por Correos de CR).

Si el usuario ingresa un número de rastreo o tracking, ejecuta de inmediato la herramienta 'trackPackage'.
Si no tienes el dato exacto de una cotización especial (mercancía peligrosa, aduanas especiales), deriva con calidez a WhatsApp.
Mantén respuestas limpias, sin exceso de texto.`,
          messages,
          maxSteps: 4,
          tools: {
            trackPackage: tool({
              description: 'Consulta el estado en tiempo real de un número de tracking.',
              parameters: z.object({
                trackingNumber: z.string().describe('Número de guía o rastreo.'),
              }),
              execute: async ({ trackingNumber }) => {
                const data = await fetchTrackingData(trackingNumber);
                if (!data || !data.package) {
                  return { error: `No se encontró información para la guía ${trackingNumber}. Verifica que esté bien escrita.` };
                }
                return { success: true, trackingInfo: data };
              },
            }),
          },
        });

        return result.toDataStreamResponse();
      } catch (aiErr) {
        console.warn("AI generation failed, fallback to smart engine:", aiErr);
        const fallbackText = getSmartLocalResponse(lastUserMessage);
        return createStreamResponse(fallbackText);
      }
    }

    // High performance smart local engine fallback
    const localResponse = getSmartLocalResponse(lastUserMessage);
    return createStreamResponse(localResponse);
  } catch (error) {
    console.error("Chat API error:", error);
    const fallbackText = "¡Hola! Con gusto te atendemos. Para cualquier consulta sobre tus paquetes o tarifas, escríbenos a nuestro WhatsApp oficial: +506 7260 1238.";
    return createStreamResponse(fallbackText);
  }
}
