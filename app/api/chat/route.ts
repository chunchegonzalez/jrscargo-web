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

function extractTrackingNumber(text: string): string | null {
  const blacklist = new Set([
    'casillero', 'casilleros', 'direccion', 'dirección', 'costarica', 'informacion', 'información',
    'cotizacion', 'cotización', 'registrarse', 'registrado', 'bienvenido', 'paquetes',
    'maritimo', 'marítimo', 'seguimiento', 'rastrear', 'rastreo', 'costarricense',
    'telefono', 'teléfono', 'whatsapp', 'preguntas', 'servicios', 'consulta'
  ]);

  const clean = text.replace(/[,;?!()"'`]/g, ' ');
  const words = clean.split(/\s+/);

  for (const word of words) {
    const trimmed = word.trim();
    if (!trimmed || blacklist.has(trimmed.toLowerCase())) continue;

    // Formats: TBA..., 1Z..., 9400..., 12-22 digits, JRS-XXXX, AT-XXXX, etc.
    if (/^(TBA\w+|1Z\w+|9\d{15,25}|\d{10,25}|JRS-\w+|AT-\w+|[A-Z]{2}\d{9}[A-Z]{2})/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    // Fallback: strings with at least 3 digits and length between 7 and 35
    if (trimmed.length >= 7 && trimmed.length <= 35 && /\d{3,}/.test(trimmed) && !blacklist.has(trimmed.toLowerCase())) {
      return trimmed.toUpperCase();
    }
  }

  return null;
}

async function getTrackingMessage(trackingNumber: string): Promise<string> {
  const data = await fetchTrackingData(trackingNumber);
  
  if (data && data.package && (data.package as Record<string, unknown>).tracking) {
    const pkg = data.package as Record<string, unknown>;
    const status = String(pkg.statusLabel || pkg.status || 'En Tránsito hacia Costa Rica');
    const weight = pkg.weight ? `${pkg.weight} lbs` : 'Por registrar';
    const consignee = String(pkg.consignatario || pkg.consignee || pkg.client || 'Cliente JRS');
    const provider = String(pkg.provider || 'JRS CARGO');
    const timeline = (data.timeline as Array<{ date?: string; status?: string; description?: string }>) || [];

    let msg = `📦 *INFORMACIÓN DE RASTREO EN TIEMPO REAL*\n\n` +
      `🏷️ *Número de Guía:* *${trackingNumber}*\n` +
      `📍 *Estado Actual:* *${status}*\n` +
      `👤 *Consignatario:* ${consignee}\n` +
      `⚖️ *Peso:* ${weight}\n` +
      `🏢 *Empresa:* ${provider}\n\n`;

    if (timeline.length > 0) {
      msg += `📜 *Últimos Movimientos:*\n`;
      timeline.slice(0, 3).forEach(evt => {
        const dateStr = evt.date ? new Date(evt.date).toLocaleDateString('es-CR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        msg += `• ${evt.status || evt.description} ${dateStr ? `(${dateStr})` : ''}\n`;
      });
      msg += `\n`;
    }

    msg += `👉 Ver detalles completos en: https://www.jrscargocr.com/tracking?number=${encodeURIComponent(trackingNumber)}`;
    return msg;
  }

  return `🔍 *Consulta de Guía:* *${trackingNumber}*\n\n` +
    `No encontramos este número de tracking registrado en nuestro sistema en este momento.\n\n` +
    `💡 *Posibles motivos:*\n` +
    `• El paquete aún viene en camino hacia nuestra bodega en Miami y no ha sido recibido físicamente.\n` +
    `• El número de tracking tiene algún dígito o letra faltante.\n\n` +
    `📲 Si necesitas ayuda para rastrearlo manualmente, escríbenos a nuestro WhatsApp oficial: *+506 7260 1238* (wa.me/50672601238).`;
}

// Smart Local Knowledge Engine for instant answers without API failure
async function getSmartLocalResponse(lastMessage: string): Promise<string> {
  const msg = lastMessage.toLowerCase().trim();

  // 1. Detección precisa de número de tracking
  const detectedTracking = extractTrackingNumber(lastMessage);
  if (detectedTracking) {
    return await getTrackingMessage(detectedTracking);
  }

  if (msg.includes('rastrear') || msg.includes('tracking') || msg.includes('paquete') || msg.includes('donde esta') || msg.includes('dónde está') || msg.includes('guia') || msg.includes('guía') || msg.includes('seguimiento')) {
    return `📦 *Rastreo de Paquetes en JRS CARGO*\n\n` +
      `Por favor escribe tu número de tracking o guía (ejemplo: *TBA315891485906*, *1Z999999999*, *JRS-1054*) y con gusto te mostraré su ubicación y estado actual en tiempo real.`;
  }

  // 2. Casillero / Registro / Dirección (Priorizado para evitar confusión)
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

  // 3. Tarifas y Precios
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
    `• 📦 *Rastreo de tus paquetes* (escribe tu número de guía aquí)\n` +
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
        const fallbackText = await getSmartLocalResponse(lastUserMessage);
        return createStreamResponse(fallbackText);
      }
    }

    // High performance smart local engine fallback
    const localResponse = await getSmartLocalResponse(lastUserMessage);
    return createStreamResponse(localResponse);
  } catch (error) {
    console.error("Chat API error:", error);
    const fallbackText = "¡Hola! Con gusto te atendemos. Para cualquier consulta sobre tus paquetes o tarifas, escríbenos a nuestro WhatsApp oficial: +506 7260 1238.";
    return createStreamResponse(fallbackText);
  }
}
