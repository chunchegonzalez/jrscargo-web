import { NextResponse } from 'next/server';
import zlib from 'zlib';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import {
  normalizeTrackingNumbersOnly,
  parseCurrencyAmount,
  ProviderInvoiceRow
} from '@/lib/package-comparison';

export const dynamic = 'force-dynamic';

/**
 * Parsea un archivo XLSX extrayendo sheet1.xml y sharedStrings.xml usando el Central Directory de ZIP nativo
 */
function parseXlsxBuffer(buffer: Buffer): string[][] {
  // 1. Encontrar el End of Central Directory (EOCD) buscando la firma 0x06054b50 desde el final
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Formato ZIP inválido o archivo corrupto');
  }

  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);

  const files: Record<string, string> = {};
  let curOffset = cdOffset;

  for (let e = 0; e < totalEntries && curOffset + 46 <= buffer.length; e++) {
    const sig = buffer.readUInt32LE(curOffset);
    if (sig !== 0x02014b50) break;

    const compression = buffer.readUInt16LE(curOffset + 10);
    const compressedSize = buffer.readUInt32LE(curOffset + 20);
    const fileNameLen = buffer.readUInt16LE(curOffset + 28);
    const extraLen = buffer.readUInt16LE(curOffset + 30);
    const commentLen = buffer.readUInt16LE(curOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(curOffset + 42);

    const fileName = buffer.toString('utf8', curOffset + 46, curOffset + 46 + fileNameLen);

    // Leer el contenido del archivo local si es de los que nos interesan
    if (
      fileName.includes('sheet1.xml') ||
      fileName.includes('sharedStrings.xml') ||
      fileName.endsWith('.xml')
    ) {
      const localSig = buffer.readUInt32LE(localHeaderOffset);
      if (localSig === 0x04034b50) {
        const localFileNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
        const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
        const rawData = buffer.subarray(dataStart, dataStart + compressedSize);

        let decompressed: Buffer | null = null;
        if (compression === 0) {
          decompressed = rawData;
        } else if (compression === 8) {
          decompressed = zlib.inflateRawSync(rawData);
        }

        if (decompressed) {
          files[fileName] = decompressed.toString('utf8');
        }
      }
    }

    curOffset += 46 + fileNameLen + extraLen + commentLen;
  }

  // 2. Extraer sharedStrings si existen
  const sharedStrings: string[] = [];
  const sstKey = Object.keys(files).find(k => k.includes('sharedStrings.xml'));
  if (sstKey && files[sstKey]) {
    const sstXml = files[sstKey];
    const siMatches = sstXml.match(/<si>[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      const text = tMatches
        .map(t => t.replace(/<[^>]+>/g, ''))
        .join('');
      sharedStrings.push(text);
    }
  }

  // 3. Extraer celdas de sheet1.xml
  const sheetKey = Object.keys(files).find(k => k.includes('sheet1.xml')) || Object.keys(files).find(k => k.includes('sheet'));
  if (!sheetKey || !files[sheetKey]) {
    throw new Error('No se encontró la hoja de cálculo sheet1.xml en el archivo Excel');
  }

  const sheetXml = files[sheetKey];
  const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];

  const matrix: string[][] = [];

  for (const rowXml of rowMatches) {
    const cMatches = rowXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) || [];
    const rowCells: Record<number, string> = {};
    let maxCol = -1;

    for (const cXml of cMatches) {
      const rAttr = cXml.match(/r="([A-Z]+)(\d+)"/);
      if (!rAttr) continue;
      const colLetters = rAttr[1];
      // Convertir letras de columna (A=0, B=1, etc.) a índice numérico
      let colIdx = 0;
      for (let i = 0; i < colLetters.length; i++) {
        colIdx = colIdx * 26 + (colLetters.charCodeAt(i) - 64);
      }
      colIdx -= 1; // 0-indexed

      if (colIdx > maxCol) maxCol = colIdx;

      const isSharedString = /t="s"/.test(cXml);
      const isInlineString = /t="inlineStr"/.test(cXml);

      let val = '';
      if (isSharedString) {
        const vMatch = cXml.match(/<v>(\d+)<\/v>/);
        if (vMatch) {
          const sstIdx = parseInt(vMatch[1], 10);
          val = sharedStrings[sstIdx] || '';
        }
      } else if (isInlineString) {
        const tMatch = cXml.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        if (tMatch) val = tMatch[1];
      } else {
        const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/);
        if (vMatch) val = vMatch[1];
      }

      rowCells[colIdx] = val.trim();
    }

    if (maxCol >= 0) {
      const fullRow: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        fullRow.push(rowCells[c] || '');
      }
      matrix.push(fullRow);
    }
  }

  return matrix;
}

/**
 * Parsea texto delimitado (CSV, TSV, punto y coma)
 */
function parseDelimitedText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Detectar delimitador según la primera línea
  const first = lines[0];
  let sep = ',';
  if (first.includes('\t')) sep = '\t';
  else if (first.includes(';') && (first.match(/;/g) || []).length > (first.match(/,/g) || []).length) sep = ';';
  else if (first.includes('|')) sep = '|';

  return lines.map(line => {
    // Parser simple con soporte básico de comillas
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  });
}

/**
 * Extrae filas aplicando la regla:
 * - Columna 2 (índice 1) = Tracking
 * - Última columna = Monto cobrado por el proveedor
 * - Ignora columna 1 y columnas intermedias de peso
 */
function extractRowsFromMatrix(matrix: string[][]): ProviderInvoiceRow[] {
  const rows: ProviderInvoiceRow[] = [];

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    if (row.length < 2) continue;

    // Detectar encabezados (si la segunda celda o última celda contiene palabras clave)
    const rawTrackCandidate = row[1] ? row[1].trim() : '';
    const rawAmountCandidate = row[row.length - 1] ? row[row.length - 1].trim() : '';

    if (
      /tracking|guia|guía|paquete|código|codigo|hawb/i.test(rawTrackCandidate) ||
      /monto|total|precio|cobro|costo|amount|fee/i.test(rawAmountCandidate)
    ) {
      // Es fila de encabezado, saltarla
      continue;
    }

    const digits = normalizeTrackingNumbersOnly(rawTrackCandidate);
    const amount = parseCurrencyAmount(rawAmountCandidate);

    // Debe contener al menos algún dígito o monto válido
    if (!digits && amount === 0) continue;

    // Columna intermedia (ej. peso en col 2 si hay 3+ cols)
    const weightCol = row.length >= 3 ? row[2].trim() : undefined;

    rows.push({
      rowNumber: rows.length + 1,
      rawTracking: rawTrackCandidate,
      trackingDigits: digits,
      providerAmount: amount,
      weight: weightCol
    });
  }

  return rows;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Modo A: Subida de archivo (Multipart / FormData)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No se envió ningún archivo' }, { status: 400 });
      }

      const filename = file.name || 'factura_proveedor';
      const fileBytes = await file.arrayBuffer();
      const buffer = Buffer.from(fileBytes);
      const mime = file.type || '';
      const ext = filename.split('.').pop()?.toLowerCase() || '';

      // 1. Archivo Excel (.xlsx)
      if (ext === 'xlsx' || mime.includes('spreadsheetml')) {
        try {
          const matrix = parseXlsxBuffer(buffer);
          const rows = extractRowsFromMatrix(matrix);
          return NextResponse.json({
            success: true,
            filename,
            fileType: 'xlsx',
            rowCount: rows.length,
            rows,
            isOcr: false
          });
        } catch (xlsxErr) {
          console.error('Error parseando XLSX nativo:', xlsxErr);
          // Si falla el parser binario de XLSX, intentar lectura de texto
        }
      }

      // 2. Archivo CSV, TSV o texto plano
      if (ext === 'csv' || ext === 'tsv' || ext === 'txt' || mime.includes('text') || mime.includes('csv')) {
        const text = buffer.toString('utf8');
        const matrix = parseDelimitedText(text);
        const rows = extractRowsFromMatrix(matrix);
        return NextResponse.json({
          success: true,
          filename,
          fileType: ext || 'csv',
          rowCount: rows.length,
          rows,
          isOcr: false
        });
      }

      // 3. Imágenes o PDF escaneados (OCR mediante IA disponible)
      if (
        ext === 'pdf' ||
        ext === 'png' ||
        ext === 'jpg' ||
        ext === 'jpeg' ||
        ext === 'webp' ||
        mime.includes('pdf') ||
        mime.includes('image')
      ) {
        const openAiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!openAiKey && !geminiKey) {
          return NextResponse.json({
            success: false,
            error: 'Para escanear imágenes o PDF se requiere configurar GOOGLE_GENERATIVE_AI_API_KEY u OPENAI_API_KEY en variables de entorno. Puedes pegar los datos en texto o subir un archivo Excel/CSV.'
          }, { status: 400 });
        }

        const base64 = buffer.toString('base64');
        let extractedJsonText = '';

        const systemPrompt = `Eres un extractor de facturas de paquetería y logística.
Analiza la tabla de paquetes de este documento del proveedor.
Reglas estrictas de columnas:
- La columna 2 contiene el número de tracking / guía.
- La última columna contiene el monto cobrado por el proveedor.
- No uses la primera columna ni la columna intermedia de peso para el cálculo.
Responde ÚNICAMENTE con un JSON válido con este formato:
{
  "rows": [
    {
      "raw_tracking": "1ZW864440339939763",
      "provider_amount": 10.40,
      "weight": "2.5 lbs"
    }
  ]
}`;

        if (openAiKey) {
          const payload = {
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: systemPrompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mime || 'image/jpeg'};base64,${base64}`
                    }
                  }
                ]
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 2000
          };

          const resAi = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify(payload)
          });

          if (!resAi.ok) {
            throw new Error('Error de OpenAI en OCR: ' + (await resAi.text()));
          }
          const aiData = await resAi.json();
          extractedJsonText = aiData.choices[0].message.content;
        } else if (geminiKey) {
          const resAi = await generateText({
            model: google('gemini-1.5-flash'),
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: systemPrompt },
                  {
                    type: 'image',
                    image: buffer,
                    mimeType: (mime.includes('png') ? 'image/png' : 'image/jpeg') as 'image/png' | 'image/jpeg'
                  }
                ]
              }
            ]
          });
          extractedJsonText = resAi.text;
        }

        const cleanJson = extractedJsonText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        const rawAiRows = Array.isArray(parsedData.rows) ? parsedData.rows : [];

        const rows: ProviderInvoiceRow[] = rawAiRows.map((r: { raw_tracking?: string; provider_amount?: unknown; weight?: string }, idx: number) => {
          const rawTrack = String(r.raw_tracking || '').trim();
          return {
            rowNumber: idx + 1,
            rawTracking: rawTrack,
            trackingDigits: normalizeTrackingNumbersOnly(rawTrack),
            providerAmount: parseCurrencyAmount(r.provider_amount),
            weight: r.weight ? String(r.weight) : undefined
          };
        });

        return NextResponse.json({
          success: true,
          filename,
          fileType: ext || 'ocr',
          rowCount: rows.length,
          rows,
          isOcr: true
        });
      }

      return NextResponse.json({
        success: false,
        error: `Formato de archivo no soportado (.${ext}). Por favor sube un archivo Excel (.xlsx), CSV, texto delimitado, o imagen de la factura.`
      }, { status: 400 });
    }

    // Modo B: Pegado directo de texto en JSON { text: "..." }
    const body = await request.json();
    if (body.text && typeof body.text === 'string') {
      const matrix = parseDelimitedText(body.text);
      const rows = extractRowsFromMatrix(matrix);
      return NextResponse.json({
        success: true,
        filename: 'texto_pegado.txt',
        fileType: 'text',
        rowCount: rows.length,
        rows,
        isOcr: false
      });
    }

    return NextResponse.json({ success: false, error: 'Petición inválida' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error procesando archivo';
    console.error('Error en parse-file:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
