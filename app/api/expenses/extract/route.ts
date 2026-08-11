import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { base64Image, mimeType } = await request.json();
    
    if (!base64Image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      // Mock mode for when API key is missing
      console.warn("No OPENAI_API_KEY found, returning mock data");
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
      const errorData = await response.text();
      console.error("OpenAI Error:", errorData);
      throw new Error("Error al analizar la imagen con la Inteligencia Artificial.");
    }

    const data = await response.json();
    const resultContent = data.choices[0].message.content;
    const extractedData = JSON.parse(resultContent);

    return NextResponse.json({ success: true, data: extractedData }, { status: 200 });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error extracting data';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
