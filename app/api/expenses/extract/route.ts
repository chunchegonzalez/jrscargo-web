import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { base64Image, mimeType } = await request.json();
    
    if (!base64Image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!openAiKey && !geminiKey) {
      return NextResponse.json({
        success: true,
        data: {
          provider_name: "Proveedor de Ejemplo (Faltan API Keys)",
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          category: "Otros"
        }
      });
    }

    let text = "";

    // PRIORIDAD 1: Usar OpenAI (Mucho más estable globalmente)
    if (openAiKey) {
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analiza esta factura o recibo de compra. Extrae la siguiente información y responde ÚNICAMENTE con un objeto JSON. Los campos deben ser: 'provider_name' (string, el nombre del negocio o proveedor), 'date' (formato YYYY-MM-DD), 'amount' (number, el monto total pagado), 'category' (string, escoge una de estas opciones que mejor se adapte: Combustible, Mantenimiento, Papelería, Planillas, Viáticos, Otros)."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500
      };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error("Error OpenAI: " + errData);
      }

      const data = await response.json();
      text = data.choices[0].message.content;
    } 
    // PRIORIDAD 2: Usar Gemini (Si OpenAI no está configurado)
    else if (geminiKey) {
      try {
        const res = await generateText({
          model: google('gemini-1.5-flash'),
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
                  image: Buffer.from(base64Image, 'base64'),
                  mimeType: 'image/jpeg'
                }
              ]
            }
          ]
        });
        text = res.text;
      } catch (err: any) {
        throw new Error("Error de Google Gemini: " + err.message);
      }
    }

    let resultContent = text;
    // Eliminar posibles bloques de código markdown
    resultContent = resultContent.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    const extractedData = JSON.parse(resultContent);

    return NextResponse.json({ success: true, data: extractedData }, { status: 200 });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error extracting data';
    console.error("OCR Error:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
