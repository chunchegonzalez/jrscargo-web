import { NextResponse } from 'next/server';
import zlib from 'zlib';

export const dynamic = 'force-dynamic';

type IncomingFile = {
  name?: string;
  mimeType?: string;
  base64Data: string;
};

/**
 * Endpoint de extracción local sin conexión a proveedores de IA externos.
 * Nota: La lectura principal se realiza 100 % en el navegador mediante lib/receipt-local-reader.ts.
 * Esta ruta queda únicamente como respaldo local determinista para XML/texto/PDF sin costos por escaneo.
 */
function extractTextFromPdfBuffer(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const pieces: string[] = [];

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(raw)) !== null) {
    const streamBytes = Buffer.from(match[1], 'latin1');
    let decoded = '';
    try {
      decoded = zlib.inflateSync(streamBytes).toString('latin1');
    } catch {
      decoded = match[1];
    }
    const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(decoded)) !== null) {
      pieces.push(tj[1]);
    }
  }

  return pieces.join('\n');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const files: IncomingFile[] = Array.isArray(body?.files) ? body.files : [];

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No se recibieron archivos.' }, { status: 400 });
    }

    const first = files[0];
    const buf = Buffer.from(first.base64Data || '', 'base64');
    const name = (first.name || '').toLowerCase();
    const mime = (first.mimeType || '').toLowerCase();

    let text = '';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      text = extractTextFromPdfBuffer(buf);
    } else if (mime.includes('xml') || mime.startsWith('text/') || name.endsWith('.xml') || name.endsWith('.txt')) {
      text = buf.toString('utf-8');
    }

    return NextResponse.json(
      {
        success: true,
        localOnly: true,
        extractedTextLength: text.length,
      },
      { status: 200 }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error leyendo comprobante localmente';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
