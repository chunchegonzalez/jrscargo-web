import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getInventoryItem } from '@/lib/supabase';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const TRACKING_API_TOKEN = process.env.TRACKING_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTgyNiwiZW1haWwiOiJqb3NlZ29uMjAwMEBob3RtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6MTIsInRlbmFudElkIjoiOWRjZGFlZGItZmZlMS00M2Y3LWI1ZTgtMDMzOGVjYjk4NmQwIiwiY2xpZW50SWQiOjYwODMsImNsaWVudENvZGUiOiJKUlMtMTAwMSIsImlzVG9wTWFzdGVyIjpmYWxzZSwiaXNNYXlvcmlzdGEiOnRydWUsImlhdCI6MTc4NjIzNzE1Mn0.ZLEBwa8iR_wLw59Akpl-PpR_Mwq3h3IBO6XKVi2PZpQ";

interface RawTimelineEvent {
  date?: string;
  status?: string;
  description?: string;
  icon?: string;
}

interface NormalizedTimelineEvent {
  date: string;
  status: string;
  description: string;
  icon: string;
  stageKey: string;
}

/**
 * Exact same timeline normalization & deduplication used in /api/tracking ("¿Dónde está mi paquete?")
 */
function normalizeAndDeduplicateTimeline(
  rawTimeline: RawTimelineEvent[],
  isRegisteredInCR: boolean,
  isDeliveredInCR: boolean,
  localItem: { created_at?: string; updated_at?: string; received_date?: string } | null
): { timeline: Array<{ date: string; status: string; description: string; icon: string }>; stageKeys: Set<string> } {
  const normalizedList: NormalizedTimelineEvent[] = [];

  for (const evt of rawTimeline) {
    const rawStatus = (evt.status || evt.description || '').trim();
    const rawDesc = (evt.description || '').trim();
    if (!rawStatus) continue;

    const combined = `${rawStatus} ${rawDesc}`.toLowerCase();
    const date = evt.date || '';

    // 1. Worldbox central office / nationalized / premature delivery statuses
    if (
      combined.includes('oficina central') ||
      combined.includes('sede central') ||
      combined.includes('nacionalizado') ||
      combined.includes('por entregar') ||
      combined.includes('cambio de estatus') ||
      combined.includes('entregado')
    ) {
      if (isRegisteredInCR) {
        normalizedList.push({
          date,
          status: 'Paquete nacionalizado en Costa Rica',
          description: 'Liberación aduanal completada y trasladado a bodega central.',
          icon: 'warehouse',
          stageKey: 'STAGE_CR_NATIONALIZED'
        });
      } else {
        normalizedList.push({
          date,
          status: 'Paquete nacionalizado — En tránsito a Bodega JRS',
          description: 'Proceso aduanal completado. En traslado hacia el inventario de Costa Rica.',
          icon: 'truck',
          stageKey: 'STAGE_CR_NATIONALIZED'
        });
      }
      continue;
    }

    // 2. Customs in Costa Rica
    if (combined.includes('aduana')) {
      normalizedList.push({
        date,
        status: 'Paquete en aduanas de Costa Rica',
        description: 'En proceso de revisión y desalmacenaje aduanal en Costa Rica.',
        icon: 'package',
        stageKey: 'STAGE_CR_CUSTOMS'
      });
      continue;
    }

    // 3. In transit / flight / manifest to Costa Rica
    if (
      combined.includes('tránsito') ||
      combined.includes('transito') ||
      combined.includes('manifiesto') ||
      combined.includes('vuelo') ||
      combined.includes('despachado') ||
      combined.includes('en camino') ||
      combined.includes('embarcado')
    ) {
      normalizedList.push({
        date,
        status: 'En tránsito hacia Costa Rica',
        description: 'El paquete salió de la bodega de origen y viaja hacia Costa Rica.',
        icon: 'plane',
        stageKey: 'STAGE_IN_TRANSIT'
      });
      continue;
    }

    // 4. Received at origin warehouse (Miami / Spain / China)
    if (
      combined.includes('miami') ||
      combined.includes('bodega origen') ||
      combined.includes('recibido en bodega') ||
      combined.includes('recibido y procesado') ||
      combined.includes('warehouse')
    ) {
      normalizedList.push({
        date,
        status: 'Paquete recibido y procesado en Bodega Miami',
        description: 'Recibido, pesado y procesado en nuestro centro de distribución en Miami.',
        icon: 'warehouse',
        stageKey: 'STAGE_ORIGIN_MIA'
      });
      continue;
    }

    // 5. Created / Registered in system
    if (combined.includes('creado') || combined.includes('registrado en el sistema')) {
      normalizedList.push({
        date,
        status: 'Paquete registrado en el sistema',
        description: 'Guía registrada inicialmente en plataforma.',
        icon: 'package',
        stageKey: 'STAGE_CREATED'
      });
      continue;
    }

    // Fallback for any other custom event
    const cleanStatusKey = rawStatus.toLowerCase().replace(/[.\s]+$/g, '');
    const cleanDescKey = rawDesc.toLowerCase().replace(/[.\s]+$/g, '');
    normalizedList.push({
      date,
      status: rawStatus.replace(/\.$/, ''),
      description: cleanDescKey && cleanDescKey !== cleanStatusKey ? rawDesc : '',
      icon: evt.icon || 'package',
      stageKey: `CUSTOM_${cleanStatusKey}`
    });
  }

  const seenStages = new Set<string>();
  const deduped: Array<{ date: string; status: string; description: string; icon: string }> = [];

  if (isRegisteredInCR && localItem) {
    if (isDeliveredInCR) {
      seenStages.add('STAGE_JRS_DELIVERED');
      deduped.push({
        date: localItem.updated_at || localItem.created_at || new Date().toISOString(),
        status: 'Paquete Entregado',
        description: 'El paquete ha sido entregado exitosamente al cliente.',
        icon: 'circle'
      });
    }

    seenStages.add('STAGE_JRS_POR_ENTREGAR');
    deduped.push({
      date: localItem.received_date || localItem.created_at || new Date().toISOString(),
      status: 'Por Entregar — En Bodega Costa Rica',
      description: 'Registrado en el inventario de Costa Rica y disponible para entrega al cliente.',
      icon: 'warehouse'
    });
  }

  for (const item of normalizedList) {
    if (seenStages.has(item.stageKey)) continue;
    seenStages.add(item.stageKey);
    deduped.push({
      date: item.date,
      status: item.status,
      description: item.description,
      icon: item.icon
    });
  }

  return { timeline: deduped, stageKeys: seenStages };
}

async function fetchTrackingData(trackingNumber: string) {
  try {
    const cleanTracking = trackingNumber.replace(/[\x00-\x1F\x7F\s]+/g, '').trim();
    const res = await fetch(`https://worldboxcr.com/api/jrscargo/tracking/${encodeURIComponent(cleanTracking)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TRACKING_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    let data: Record<string, unknown> = {};
    if (res.ok) {
      data = await res.json();
    }

    let localItem = null;
    try {
      localItem = await getInventoryItem(cleanTracking);
    } catch {
      // Ignore local lookup error
    }

    const isRegisteredInCR = Boolean(localItem && localItem.status && localItem.status !== 'Eliminado');
    const isDeliveredInCR = Boolean(
      isRegisteredInCR && String(localItem.status).toLowerCase().includes('entregad')
    );

    if (!data.package && isRegisteredInCR && localItem) {
      const cleanNumericWeight = String(localItem.weight || '0').replace(/[^\d.]/g, '') || '0';
      data.package = {
        tracking: String(localItem.id || cleanTracking),
        consignatario: localItem.client || 'Cliente JRS',
        provider: localItem.company || 'JRS CARGO',
        weight: cleanNumericWeight,
        weightUnit: String(localItem.weight || '').toLowerCase().includes('kg') ? 'kg' : 'lbs',
        statusLabel: isDeliveredInCR ? 'Entregado' : 'Por Entregar',
        description: 'Paquete registrado en inventario de Costa Rica'
      };
    }

    if (data.package) {
      const pkg = data.package as Record<string, unknown>;
      const rawTimeline: RawTimelineEvent[] = Array.isArray(data.timeline)
        ? (data.timeline as RawTimelineEvent[])
        : [];

      const { timeline: cleanTimeline, stageKeys } = normalizeAndDeduplicateTimeline(
        rawTimeline,
        isRegisteredInCR,
        isDeliveredInCR,
        localItem
      );

      data.timeline = cleanTimeline;

      if (localItem && localItem.weight && !pkg.weight) {
        pkg.weight = String(localItem.weight).replace(/[^\d.]/g, '') || localItem.weight;
      }

      if (isDeliveredInCR) {
        pkg.statusLabel = 'Entregado';
      } else if (isRegisteredInCR) {
        pkg.statusLabel = 'Por Entregar';
      } else {
        if (stageKeys.has('STAGE_CR_NATIONALIZED') || stageKeys.has('STAGE_CR_CUSTOMS')) {
          pkg.statusLabel = 'En Tránsito a Bodega CR';
        } else if (stageKeys.has('STAGE_IN_TRANSIT')) {
          pkg.statusLabel = 'En Tránsito a Costa Rica';
        } else {
          const rawLabel = String(pkg.statusLabel || '').toLowerCase();
          if (
            rawLabel.includes('por entregar') ||
            rawLabel.includes('entregado') ||
            rawLabel.includes('sede central') ||
            rawLabel.includes('oficina central') ||
            rawLabel.includes('aduana')
          ) {
            pkg.statusLabel = 'En Tránsito a Bodega CR';
          } else if (!pkg.statusLabel) {
            pkg.statusLabel = 'En Bodega Miami';
          }
        }
      }
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

function formatCostaRicaDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

async function getTrackingMessage(trackingNumber: string): Promise<string> {
  const data = await fetchTrackingData(trackingNumber);

  if (data && data.package && (data.package as Record<string, unknown>).tracking) {
    const pkg = data.package as Record<string, unknown>;
    const status = String(pkg.statusLabel || pkg.status || 'En Tránsito a Costa Rica');

    // Clean weight so it never repeats "lbs lbs"
    const rawWeight = String(pkg.weight || '').trim();
    const numericWeight = parseFloat(rawWeight.replace(/[^\d.]/g, ''));
    const unit = String(pkg.weightUnit || (rawWeight.toLowerCase().includes('kg') ? 'kg' : 'lbs'));
    let weightDisplay = 'Por registrar';
    if (!isNaN(numericWeight) && numericWeight > 0) {
      if (unit === 'lbs') {
        weightDisplay = `${numericWeight} lbs (${(numericWeight * 0.453592).toFixed(2)} kg)`;
      } else {
        weightDisplay = `${numericWeight} ${unit}`;
      }
    } else if (rawWeight) {
      weightDisplay = rawWeight;
    }

    const consignee = String(pkg.consignatario || pkg.consignee || pkg.client || 'Cliente JRS');
    const description = String(pkg.description || '').trim();
    const timeline = (data.timeline as Array<{ date?: string; status?: string; description?: string }>) || [];

    let msg =
      `📦 *INFORMACIÓN DE RASTREO EN TIEMPO REAL*\n\n` +
      `🏷️ *Número de Guía:* *${trackingNumber}*\n` +
      `📍 *Estado Actual:* *${status}*\n` +
      `👤 *Consignatario:* ${consignee}\n` +
      `⚖️ *Peso:* ${weightDisplay}\n` +
      (description ? `📝 *Descripción:* ${description}\n` : '') +
      `\n`;

    if (timeline.length > 0) {
      msg += `📜 *Historial de Eventos:*\n`;
      timeline.forEach((evt) => {
        const dateStr = formatCostaRicaDate(evt.date);
        const title = evt.status || 'Actualización';
        const desc = evt.description ? ` — ${evt.description}` : '';
        msg += `• *${title}*${desc}${dateStr ? ` (${dateStr})` : ''}\n`;
      });
      msg += `\n`;
    }

    msg +=
      `💬 *¿Tienes alguna consulta sobre tu paquete?* Puedes hablar directamente con un asesor en WhatsApp:\n` +
      `https://wa.me/50672601238?text=${encodeURIComponent(`Hola JRS Cargo, tengo una consulta sobre mi paquete con guía ${trackingNumber}`)}`;
    return msg;
  }

  return (
    `🔍 *Consulta de Guía:* *${trackingNumber}*\n\n` +
    `El paquete *${trackingNumber}* aún no ha llegado a nuestras bodegas en Miami o se encuentra en proceso de registro.\n\n` +
    `💬 *¿Tienes alguna consulta?* Puedes hablar directamente con un asesor en WhatsApp:\n` +
    `https://wa.me/50672601238?text=${encodeURIComponent(`Hola JRS Cargo, necesito ayuda para rastrear mi paquete ${trackingNumber}`)}`
  );
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
      `Por favor escribe tu número de tracking o guía (ejemplo: *TBA315891485*, *1Z999999999*, *JRS-1054*) y con gusto te mostraré el historial de eventos y estado actual en tiempo real.`;
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
      `🚚 *En Costa Rica:* Entregamos en el GAM (por un costo adicional) y enviamos a todo el país mediante Correos de Costa Rica o encomienda.`;
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
    `¿En qué te puedo asesorar hoy? Si tienes alguna consulta adicional, puedes hablar con un asesor en WhatsApp: https://wa.me/50672601238`;
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
        await new Promise(r => setTimeout(r, 14));
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

    // Always use the unified tracking formatter when a tracking number is detected so movements match "¿Dónde está mi paquete?"
    const detectedTracking = extractTrackingNumber(lastUserMessage);
    if (detectedTracking) {
      const trackingReply = await getTrackingMessage(detectedTracking);
      return createStreamResponse(trackingReply);
    }

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
- WhatsApp de atención: +506 7260 1238 (https://wa.me/50672601238)
- Dirección Miami: 8280 NW 64th St, Miami, FL 33166.
- Entregas en todo Costa Rica (GAM a domicilio por un costo adicional y envíos por Correos de CR o encomienda).

NUNCA incluyas enlaces de "Ver Seguimiento en Vivo" ni "/tracking?number=". Siempre indica que si tiene alguna consulta puede hablar con un asesor en WhatsApp incluyendo https://wa.me/50672601238.
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
                const formatted = await getTrackingMessage(trackingNumber);
                return { formattedMessage: formatted };
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
    const fallbackText = "¡Hola! Con gusto te atendemos. Si tienes alguna consulta puedes hablar con un asesor en nuestro WhatsApp oficial:\nhttps://wa.me/50672601238";
    return createStreamResponse(fallbackText);
  }
}
