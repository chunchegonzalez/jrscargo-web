import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getInventoryItem } from '@/lib/supabase';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await streamText({
      model: google('gemini-flash-latest'),
      system: `Eres el asistente virtual oficial de JRS CARGO, una empresa de logística en Costa Rica enfocada en traer paquetes desde Estados Unidos, España y China hacia San José (SJ), Costa Rica.
      Tu tono debe ser amable, profesional, confiable y directo. Usa un lenguaje claro y cordial. 
      Responde en español de Costa Rica de ser posible, pero siempre muy profesional.
      
      IMPORTANTE: Eres estrictamente el asistente de JRS CARGO. NO debes responder a preguntas sobre programación, cocina, matemáticas, cultura general, otros países, ni ningún tema que no esté relacionado con logística, envíos, casilleros o JRS CARGO. Si te preguntan algo fuera de tema, discúlpate amablemente y di que solo puedes ayudar con temas relacionados a los servicios de JRS CARGO.
      
      INFORMACIÓN CLAVE QUE DEBES SABER Y USAR:
      - Casillero gratuito: Los clientes pueden abrir un casillero gratis en worldboxcr.com/jrscargo/register
      - WhatsApp de atención al cliente: +506 7260 1238
      - Correo: info@jrscargocr.com
      
      TARIFAS AÉREAS:
      - Desde Estados Unidos (Miami): US$7 por libra (lb).
      - Desde España (Madrid): US$15 por libra (lb).
      - Desde China: US$17 por libra (lb).
      
      TARIFAS MARÍTIMAS:
      - Desde Estados Unidos (Miami): US$30 por pie cúbico (ft³).
      
      INFORMACIÓN DE SERVICIOS:
      - Manejo especial (televisores, laptops, consolas, perfumes): Tiene costo adicional, se debe cotizar por WhatsApp.
      - Consolidación de paquetes: Sí se ofrece.
      - Entregas en Costa Rica: Entregas físicas o envío a domicilio en todo el país.
      - Tiempos de entrega aéreos: 3 a 5 días hábiles desde que el paquete es recibido en origen.
      - Tiempos marítimos: 2 a 3 semanas.
      
      REGLAS DE INTERACCIÓN:
      - Nunca inventes precios o reglas que no estén en tu conocimiento.
      - Si te preguntan algo complejo (cotizaciones comerciales grandes, quejas o problemas con un paquete específico), recomienda amablemente que contacten a WhatsApp (+506 7260 1238).
      - Si el cliente pregunta por el estado de su paquete, pídele su número de tracking (rastreo) y usa la herramienta 'trackPackage' para buscar la información y darle un resumen de dónde se encuentra.
      - IMPORTANTE: NO uses formato Markdown (como asteriscos ** o #). Usa texto plano puro con saltos de línea para que se vea limpio en pantalla.
      - Sé conciso, no escribas respuestas gigantes a menos que sea necesario.`,
      messages,
      tools: {
        trackPackage: tool({
          description: 'Obtiene el estado y ubicación actual de un paquete usando su número de tracking (rastreo).',
          parameters: z.object({
            trackingNumber: z.string().describe('El número de tracking del paquete. Usualmente es alfanumérico.'),
          }),
          execute: async ({ trackingNumber }) => {
            const apiToken = process.env.TRACKING_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTgyNiwiZW1haWwiOiJqb3NlZ29uMjAwMEBob3RtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6MTIsInRlbmFudElkIjoiOWRjZGFlZGItZmZlMS00M2Y3LWI1ZTgtMDMzOGVjYjk4NmQwIiwiY2xpZW50SWQiOjYwODMsImNsaWVudENvZGUiOiJKUlMtMTAwMSIsImlzVG9wTWFzdGVyIjpmYWxzZSwiaXNNYXlvcmlzdGEiOnRydWUsImlhdCI6MTc4NjIzNzE1Mn0.ZLEBwa8iR_wLw59Akpl-PpR_Mwq3h3IBO6XKVi2PZpQ";
            
            try {
              const res = await fetch(`https://worldboxcr.com/api/jrscargo/tracking/${encodeURIComponent(trackingNumber)}`, {
                method: 'GET',
                headers: { 
                  'Authorization': `Bearer ${apiToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!res.ok) {
                return { error: 'No se pudo encontrar información para este número de tracking en el sistema. Asegúrate de que el número sea correcto.' };
              }
              
              const data = await res.json();
              
              try {
                const localItem = await getInventoryItem(trackingNumber);
                if (localItem && localItem.status && localItem.status.includes('Entregado')) {
                  if (!data.package) data.package = { tracking: trackingNumber };
                  if (!data.timeline) data.timeline = [];
                  data.package.statusLabel = 'Entregado';
                  data.timeline = data.timeline.filter((e: { status: string }) => e.status !== 'Paquete Entregado');
                  data.timeline.unshift({
                    date: localItem.updated_at || localItem.created_at || new Date().toISOString(),
                    status: 'Paquete Entregado',
                    description: 'El paquete ha sido entregado exitosamente al cliente.',
                    icon: 'circle'
                  });
                }
              } catch {
                // ignore local db error
              }
              
              return { 
                success: true, 
                trackingInfo: data,
                message: 'Información obtenida. Por favor, resume los últimos eventos del timeline y el status actual para el usuario.'
              };
            } catch {
              return { error: 'Error interno al consultar el sistema de rastreo. Pídele al usuario que intente más tarde.' };
            }
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error detallado de API:", error);
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor al procesar la IA.";
    return new Response(
      errorMessage,
      { status: 500 }
    );
  }
}
