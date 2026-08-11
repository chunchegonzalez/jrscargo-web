import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { base64Image, mimeType } = await request.json();
    
    if (!base64Image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      // Mock mode for when API key is missing
      console.warn("No GEMINI_API_KEY found, returning mock data");
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
      contents: [
        {
          parts: [
            {
              text: "Analiza esta factura o recibo de compra. Extrae la siguiente información y responde ÚNICAMENTE con un objeto JSON. Los campos deben ser: 'provider_name' (string, el nombre del negocio o proveedor), 'date' (formato YYYY-MM-DD), 'amount' (number, el monto total pagado numérico sin símbolos de moneda), 'category' (string, escoge una de estas opciones que mejor se adapte: Combustible, Mantenimiento, Papelería, Planillas, Viáticos, Otros)."
            },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini Error:", errorData);
      
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = null;
      }
      
      const errorMessage = parsedError?.error?.message || errorData || "Error desconocido";
      throw new Error("Error de Google Gemini: " + errorMessage);
    }

    const data = await response.json();
    const resultContent = data.candidates[0].content.parts[0].text;
    const extractedData = JSON.parse(resultContent);

    return NextResponse.json({ success: true, data: extractedData }, { status: 200 });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error extracting data';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
