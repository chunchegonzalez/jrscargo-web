import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { base64Image } = await request.json();
    
    if (!base64Image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
      // Mock mode for when API key is missing
      console.warn("No GOOGLE_GENERATIVE_AI_API_KEY found, returning mock data");
      return NextResponse.json({
        success: true,
        data: {
          provider_name: "Proveedor de Ejemplo (Sin API Key)",
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          category: "Otros"
        }
      });
    }

    const { text } = await generateText({
      model: google('gemini-1.5-pro-latest'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: "Analiza esta factura o recibo de compra. Extrae la siguiente información y responde ÚNICAMENTE con un objeto JSON sin formato markdown. Los campos deben ser: 'provider_name' (string, el nombre del negocio o proveedor), 'date' (formato YYYY-MM-DD), 'amount' (number, el monto total pagado numérico sin símbolos de moneda), 'category' (string, escoge una de estas opciones que mejor se adapte: Combustible, Mantenimiento, Papelería, Planillas, Viáticos, Otros)."
            },
            {
              type: 'image',
              image: Buffer.from(base64Image, 'base64')
            }
          ]
        }
      ]
    });

    let resultContent = text;
    
    // Eliminar posibles bloques de código markdown (```json ... ```) que la IA podría devolver
    resultContent = resultContent.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    const extractedData = JSON.parse(resultContent);

    return NextResponse.json({ success: true, data: extractedData }, { status: 200 });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error extracting data';
    console.error("AI SDK Error:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
