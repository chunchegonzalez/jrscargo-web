import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type IncomingFile = {
  name?: string;
  mimeType?: string;
  base64Data: string;
};

const VALID_CATEGORIES = [
  'Combustible',
  'Mantenimiento',
  'Papelería',
  'Planillas',
  'Viáticos',
  'Servicios',
  'Pago de Proveedor',
  'Local San Pablo',
  'Otros',
];

const EXTRACTION_PROMPT =
  "Analiza el o los comprobantes/facturas/recibos adjuntos (pueden ser imágenes, PDF o archivos XML/texto de facturación). " +
  "Si hay varios archivos que corresponden al mismo gasto (por ejemplo, factura PDF + XML + comprobante SINPE), combínalos para obtener el dato más exacto. " +
  "Responde ÚNICAMENTE con un objeto JSON válido sin bloques markdown ni texto adicional, con estos campos: " +
  "'provider_name' (string, nombre del negocio o proveedor), " +
  "'date' (string en formato YYYY-MM-DD), " +
  "'amount' (number, monto total pagado numérico sin símbolos de moneda), " +
  "'currency' (string, exactamente 'USD' o 'CRC' según la moneda del comprobante; si dice ₡ o colones usa 'CRC', si dice $ o USD usa 'USD'), " +
  "'category' (string, escoge exactamente una de estas opciones: Combustible, Mantenimiento, Papelería, Planillas, Viáticos, Servicios, Pago de Proveedor, Local San Pablo, Otros).";

function normalizeMime(file: IncomingFile): string {
  const raw = (file.mimeType || '').toLowerCase().trim();
  if (raw && raw !== 'application/octet-stream') return raw;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.xml')) return 'application/xml';
  if (name.endsWith('.csv')) return 'text/csv';
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.txt')) return 'text/plain';
  return raw || 'application/octet-stream';
}

function isImageMime(mime: string): boolean {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(mime);
}

function isPdfMime(mime: string): boolean {
  return mime === 'application/pdf';
}

function isTextMime(mime: string, name?: string): boolean {
  if (
    mime.startsWith('text/') ||
    mime === 'application/xml' ||
    mime === 'application/json' ||
    mime.endsWith('+xml')
  ) {
    return true;
  }
  const lower = (name || '').toLowerCase();
  return ['.xml', '.txt', '.csv', '.json', '.html', '.htm'].some(ext => lower.endsWith(ext));
}

function normalizeExtractedPayload(raw: Record<string, unknown>) {
  const provider_name = typeof raw.provider_name === 'string' ? raw.provider_name.trim() : '';
  const date = typeof raw.date === 'string' ? raw.date.trim() : '';
  const amountNum = typeof raw.amount === 'number' ? raw.amount : Number(String(raw.amount ?? '').replace(/,/g, ''));
  const rawCurrency = String(raw.currency || '').toUpperCase().trim();
  const currency = rawCurrency === 'CRC' || rawCurrency === 'COLONES' ? 'CRC' : rawCurrency === 'USD' ? 'USD' : undefined;

  let category = typeof raw.category === 'string' ? raw.category.trim() : 'Otros';
  if (category === 'Pago a Proveedor') category = 'Pago de Proveedor';
  if (!VALID_CATEGORIES.includes(category)) {
    const matched = VALID_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
    category = matched || 'Otros';
  }

  return {
    provider_name,
    date,
    amount: Number.isFinite(amountNum) ? amountNum : undefined,
    currency,
    category,
  };
}

async function extractWithOpenAI(files: IncomingFile[], openAiKey: string): Promise<string> {
  const contentParts: Array<Record<string, unknown>> = [
    { type: 'text', text: EXTRACTION_PROMPT },
  ];

  let addedReadable = 0;

  for (const file of files) {
    const mime = normalizeMime(file);
    const filename = file.name || 'comprobante';

    if (isImageMime(mime)) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${mime};base64,${file.base64Data}`,
        },
      });
      addedReadable++;
    } else if (isPdfMime(mime)) {
      contentParts.push({
        type: 'file',
        file: {
          filename: filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`,
          file_data: `data:application/pdf;base64,${file.base64Data}`,
        },
      });
      addedReadable++;
    } else if (isTextMime(mime, filename)) {
      const decoded = Buffer.from(file.base64Data, 'base64').toString('utf-8').slice(0, 18000);
      contentParts.push({
        type: 'text',
        text: `Contenido del archivo "${filename}":\n${decoded}`,
      });
      addedReadable++;
    }
  }

  if (addedReadable === 0) {
    return '';
  }

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 600,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.text();
    throw new Error('Error OpenAI: ' + errData);
  }

  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || '');
}

async function extractWithGemini(files: IncomingFile[], geminiKey: string): Promise<string> {
  const parts: Array<Record<string, unknown>> = [{ text: EXTRACTION_PROMPT }];
  let addedReadable = 0;

  for (const file of files) {
    const mime = normalizeMime(file);
    const filename = file.name || 'comprobante';

    if (isImageMime(mime) || isPdfMime(mime)) {
      parts.push({
        inline_data: {
          mime_type: mime,
          data: file.base64Data,
        },
      });
      addedReadable++;
    } else if (isTextMime(mime, filename)) {
      const decoded = Buffer.from(file.base64Data, 'base64').toString('utf-8').slice(0, 18000);
      parts.push({
        text: `Contenido del archivo "${filename}":\n${decoded}`,
      });
      addedReadable++;
    }
  }

  if (addedReadable === 0) {
    return '';
  }

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = 'No se pudo obtener respuesta de Gemini';

  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    );

    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === 'string' && text.trim()) {
        return text;
      }
    } else {
      lastError = await res.text();
    }
  }

  throw new Error('Error de Google Gemini: ' + lastError);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const files: IncomingFile[] = [];
    if (Array.isArray(body?.files) && body.files.length > 0) {
      for (const item of body.files) {
        if (item && typeof item.base64Data === 'string' && item.base64Data.length > 0) {
          files.push({
            name: typeof item.name === 'string' ? item.name : 'comprobante',
            mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
            base64Data: item.base64Data,
          });
        }
      }
    } else if (typeof body?.base64Image === 'string' && body.base64Image.length > 0) {
      files.push({
        name: typeof body.fileName === 'string' ? body.fileName : 'comprobante',
        mimeType: typeof body.mimeType === 'string' ? body.mimeType : 'image/jpeg',
        base64Data: body.base64Image,
      });
    }

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No se recibieron archivos para analizar.' }, { status: 400 });
    }

    const readableFiles = files.filter(f => {
      const mime = normalizeMime(f);
      return isImageMime(mime) || isPdfMime(mime) || isTextMime(mime, f.name);
    });

    if (readableFiles.length === 0) {
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          message:
            'Archivo(s) adjuntado(s) correctamente. Este formato no admite lectura automática con IA; puedes llenar los detalles manualmente.',
        },
        { status: 200 }
      );
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!openAiKey && !geminiKey) {
      return NextResponse.json({
        success: true,
        data: {
          provider_name: 'Proveedor de Ejemplo (Faltan API Keys)',
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          currency: 'USD',
          category: 'Otros',
        },
      });
    }

    let text = '';
    let openAiError: Error | null = null;

    // Prioridad 1: OpenAI (con soporte nativo para imágenes, PDF y texto/XML)
    if (openAiKey) {
      try {
        text = await extractWithOpenAI(readableFiles, openAiKey);
      } catch (err) {
        openAiError = err instanceof Error ? err : new Error(String(err));
        if (!geminiKey) {
          throw openAiError;
        }
      }
    }

    // Prioridad 2 / Fallback: Gemini (soporta imágenes, PDF y texto/XML nativamente)
    if (!text && geminiKey) {
      text = await extractWithGemini(readableFiles, geminiKey);
    }

    if (!text) {
      throw openAiError || new Error('La IA no devolvió datos legibles del documento.');
    }

    const resultContent = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(resultContent) as Record<string, unknown>;
    const normalized = normalizeExtractedPayload(parsed);

    return NextResponse.json({ success: true, data: normalized }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error extracting data';
    console.error('OCR Error:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
