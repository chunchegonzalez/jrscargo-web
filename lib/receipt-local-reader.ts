'use client';

import {
  ExpenseAttachment,
  isImageAttachment,
  isPdfAttachment,
  isTextLikeAttachment,
  decodeTextFromDataUrl,
  extractHaciendaHintFromFilename,
} from '@/lib/expense-attachments';

export type LocalReceiptExtraction = {
  documentNumber: string;
  providerName: string;
  date: string;
  amount: string;
  currency: 'USD' | 'CRC';
  category: string;
  needsConfirmation: boolean;
  notice?: string;
  sourceMethod: 'xml' | 'text' | 'pdf-text' | 'ocr' | 'manual';
};

type ParsedAmountCandidate = {
  value: number;
  priority: number;
  currencyHint?: 'USD' | 'CRC';
  line: string;
};

// Declaraciones mínimas para librerías open-source cargadas localmente en el navegador (PDF.js y Tesseract.js)
interface PdfJsTextItem {
  str?: string;
  transform?: number[];
}

interface PdfJsPage {
  getTextContent: () => Promise<{ items: PdfJsTextItem[] }>;
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
}

interface PdfJsDoc {
  numPages: number;
  getPage: (num: number) => Promise<PdfJsPage>;
}

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: Uint8Array }) => { promise: Promise<PdfJsDoc> };
}

interface TesseractLib {
  recognize: (
    image: string | HTMLCanvasElement,
    langs: string,
    opts?: Record<string, unknown>
  ) => Promise<{ data?: { text?: string; confidence?: number } }>;
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
    Tesseract?: TesseractLib;
  }
}

const PDFJS_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const TESSERACT_CDN_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

let pdfJsPromise: Promise<PdfJsLib | null> | null = null;
let tesseractPromise: Promise<TesseractLib | null> | null = null;

function loadExternalScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Entorno sin DOM'));
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

async function getPdfJs(): Promise<PdfJsLib | null> {
  if (typeof window === 'undefined') return null;
  if (window.pdfjsLib) return window.pdfjsLib;
  if (!pdfJsPromise) {
    pdfJsPromise = loadExternalScript(PDFJS_CDN_URL)
      .then(() => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
          return window.pdfjsLib;
        }
        return null;
      })
      .catch(() => null);
  }
  return pdfJsPromise;
}

async function getTesseract(): Promise<TesseractLib | null> {
  if (typeof window === 'undefined') return null;
  if (window.Tesseract) return window.Tesseract;
  if (!tesseractPromise) {
    tesseractPromise = loadExternalScript(TESSERACT_CDN_URL)
      .then(() => window.Tesseract || null)
      .catch(() => null);
  }
  return tesseractPromise;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Normaliza un número escrito en formato local o internacional:
 * Ej: "1.234,56" -> 1234.56 | "1,234.56" -> 1234.56 | "25 000,00" -> 25000 | "15.500" (en CRC) -> 15500
 */
export function parseFlexibleNumber(raw: string, currencyHint?: 'USD' | 'CRC'): number | null {
  if (!raw) return null;
  let cleaned = raw
    .replace(/[^\d.,-]/g, '')
    .replace(/^-+/, '')
    .trim();
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // Formato 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const parts = cleaned.split(',');
    const afterComma = parts[parts.length - 1];
    if (parts.length > 2 || (afterComma.length === 3 && currencyHint === 'CRC')) {
      cleaned = cleaned.replace(/,/g, '');
    } else if (afterComma.length === 3 && Number(parts[0]) >= 1 && Number(parts[0]) <= 999) {
      // Ambiguo como "12,500" -> usualmente miles en comprobantes CR
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  } else if (lastDot !== -1) {
    const parts = cleaned.split('.');
    const afterDot = parts[parts.length - 1];
    if (parts.length > 2 || (afterDot.length === 3 && currencyHint === 'CRC' && Number(parts[0]) >= 1)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
}

/**
 * Extrae datos directamente de un XML de Factura Electrónica (Hacienda Costa Rica)
 */
function parseHaciendaXml(xmlText: string, filename: string): LocalReceiptExtraction | null {
  if (!xmlText || (!xmlText.includes('<') && !xmlText.includes('FacturaElectronica') && !xmlText.includes('TiqueteElectronico'))) {
    return null;
  }

  const getTag = (tag: string, scope = xmlText): string => {
    const regex = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`, 'i');
    const m = scope.match(regex);
    return m ? m[1].trim() : '';
  };

  const totalStr =
    getTag('TotalComprobante') ||
    getTag('TotalFactura') ||
    getTag('TotalVentaNeta') ||
    getTag('TotalVenta') ||
    getTag('MontoTotalImpuesto');

  const monedaRaw = getTag('CodigoMoneda').toUpperCase();
  const fechaRaw = getTag('FechaEmision');
  const consecutivo = getTag('NumeroConsecutivo') || getTag('Clave');
  const emisorScope = getTag('Emisor') || xmlText;
  const providerName = getTag('NombreComercial', emisorScope) || getTag('Nombre', emisorScope);

  if (!totalStr && !consecutivo && !providerName) {
    return null;
  }

  const hint = extractHaciendaHintFromFilename(filename);
  const currency: 'USD' | 'CRC' =
    monedaRaw === 'CRC' ? 'CRC' : monedaRaw === 'USD' ? 'USD' : 'CRC';
  const amountNum = parseFlexibleNumber(totalStr, currency);
  const dateMatch = fechaRaw.match(/(\d{4}-\d{2}-\d{2})/);

  return {
    documentNumber: consecutivo || hint.documentNumber || '',
    providerName: providerName || '',
    date: dateMatch ? dateMatch[1] : hint.date || '',
    amount: amountNum !== null ? amountNum.toFixed(2) : '',
    currency,
    category: inferCategoryFromText(`${providerName} ${xmlText.slice(0, 3000)}`),
    needsConfirmation: amountNum === null || !monedaRaw,
    notice:
      amountNum === null
        ? 'No se encontró el monto total en el XML. Ingresa el monto manualmente.'
        : !monedaRaw
        ? 'Confirma la moneda del comprobante antes de guardar.'
        : undefined,
    sourceMethod: 'xml',
  };
}

function inferCategoryFromText(text: string): string {
  const upper = text.toUpperCase();
  if (/COMBUSTIBLE|GASOLIN|DIESEL|ESTACION DE SERVICIO|RECOPE|BOMBA|SUPER\s+95|REGULAR/.test(upper)) {
    return 'Combustible';
  }
  if (/ICE\b|CNFL|AYA\b|ACUEDUCTOS|ELECTRICIDAD|INTERNET|TELEFON|KOLBI|LIBERTY|CLARO|TIGO|AGUA\b|LUZ\b/.test(upper)) {
    return 'Servicios';
  }
  if (/RESTAURANT|CAFE|SODA|ALIMENT|COMIDA|SUPERMERCADO|AUTOMERCADO|WALMART|MASXMENOS|PALI|VIATICO/.test(upper)) {
    return 'Viáticos';
  }
  if (/LIBRERIA|PAPELERIA|OFICINA|IMPRESION|TONER|OFFICE/.test(upper)) {
    return 'Papelería';
  }
  if (/TALLER|REPUESTO|LLANTA|LUBRIC|MECANIC|VEHICULO|FRENOS|ACEITE/.test(upper)) {
    return 'Mantenimiento';
  }
  if (/PLANILLA|SALARIO|CCSS|INS\b|NOMINA/.test(upper)) {
    return 'Planillas';
  }
  if (/ALQUILER|SAN PABLO|ARRENDAMIENTO|LOCAL/.test(upper)) {
    return 'Local San Pablo';
  }
  if (/CARGO|LOGISTIC|COURIER|ADUANA|FLETE|TRANSPORTE|WORLDBOX|AEROPUERTO/.test(upper)) {
    return 'Pago de Proveedor';
  }
  return 'Otros';
}

function detectCurrencyInText(line: string): { currency?: 'USD' | 'CRC'; hasBoth: boolean } {
  const upper = line.toUpperCase();
  const hasCRC =
    /\b(CRC|COLONES|COLON)\b/.test(upper) ||
    /[₡¢]/.test(line);
  const hasUSD =
    /\b(USD|DOLARES|DÓLARES|DOLLARS|US\$)\b/.test(upper) ||
    /(?:^|[^\w])\$(?=\s*\d)/.test(line);

  if (hasCRC && hasUSD) {
    return { currency: undefined, hasBoth: true };
  }
  if (hasCRC) return { currency: 'CRC', hasBoth: false };
  if (hasUSD) return { currency: 'USD', hasBoth: false };
  return { currency: undefined, hasBoth: false };
}

function extractDateFromText(text: string): string | undefined {
  // 1. YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  // 2. DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (dmyMatch) {
    const dd = String(dmyMatch[1]).padStart(2, '0');
    const mm = String(dmyMatch[2]).padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return undefined;
}

function extractDocumentNumberFromText(text: string): string {
  // Consecutivo de Hacienda (20 dígitos) o Clave (50 dígitos)
  const consecutivoMatch = text.match(/\b(\d{20})\b/);
  if (consecutivoMatch) return consecutivoMatch[1];

  const claveMatch = text.match(/\b(506\d{47})\b/);
  if (claveMatch) return claveMatch[1];

  const labeledMatch = text.match(
    /(?:FACTURA|COMPROBANTE|CONSECUTIVO|DOCUMENTO|RECIBO|REFERENCIA|N[°ºo.]?)\s*[:#-]?\s*([A-Z0-9-]{4,25})/i
  );
  if (labeledMatch && /\d/.test(labeledMatch[1])) {
    return labeledMatch[1].trim();
  }
  return '';
}

function extractProviderFromText(lines: string[]): string {
  const skipRegex =
    /^(FACTURA|TIQUETE|COMPROBANTE|RECIBO|FECHA|CLIENTE|CEDULA|CÉDULA|TELEFONO|TELÉFONO|DIRECCION|DIRECCIÓN|CORREO|EMAIL|CLAVE|CONSECUTIVO|DETALLE|CANTIDAD|DESCRIPCION|SUBTOTAL|IMPUESTO|IVA|TOTAL|MONTO|PAGADO|BANCO|SINPE|TRANSFERENCIA|\d+[\s.,/-]*\d*)$/i;

  for (const rawLine of lines.slice(0, 12)) {
    const clean = rawLine.replace(/\s+/g, ' ').trim();
    if (clean.length < 3 || clean.length > 65) continue;
    if (skipRegex.test(clean)) continue;
    if (/^\d+$/.test(clean.replace(/[\s-]/g, ''))) continue;
    if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(clean)) {
      return clean;
    }
  }
  return '';
}

/**
 * Analiza texto extraído de un PDF o imagen (OCR) para detectar el Total a Pagar, Moneda, Fecha, Documento y Proveedor.
 */
export function parseReceiptText(
  rawText: string,
  filename = '',
  sourceMethod: 'text' | 'pdf-text' | 'ocr' = 'pdf-text'
): LocalReceiptExtraction {
  const hint = extractHaciendaHintFromFilename(filename);
  const xmlAttempt = parseHaciendaXml(rawText, filename);
  if (xmlAttempt) return xmlAttempt;

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const globalCurr = detectCurrencyInText(rawText);

  // Patrones de etiquetas de total ordenados por prioridad
  const HIGH_TOTAL_REGEX =
    /\b(TOTAL\s+COMPROBANTE|TOTAL\s+A\s+PAGAR|MONTO\s+TOTAL|TOTAL\s+FACTURA|TOTAL\s+VENTA\s+NETA|GRAN\s+TOTAL|IMPORTE\s+TOTAL|TOTAL\s+PAGADO|MONTO\s+TRANSFERIDO|MONTO\s+SINPE|TOTAL\s+USD|TOTAL\s+CRC|TOTAL\s+COLONES|TOTAL\s+DOLARES|TOTAL\s+DÓLARES)\b/i;
  const MEDIUM_TOTAL_REGEX = /(?:^|\s)(TOTAL|MONTO|IMPORTE|PAGAR|PAGO\s+TOTAL)(?:\s*[:$=₡¢-]|\s+\d)/i;
  const EXCLUDE_LINE_REGEX =
    /\b(SUB\s*-?\s*TOTAL|SUBTOTAL|DESCUENTO|IMPUESTO|I\.?V\.?A\.?|EXENTO|GRAVADO|TIPO\s+DE\s+CAMBIO|T\.?\s*C\.?|VUELTO|CAMBIO|TELEFONO|TELÉFONO|CEDULA|CÉDULA|CLAVE|CONSECUTIVO|CANTIDAD|PRECIO\s+UNITARIO)\b/i;

  const candidates: ParsedAmountCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const windowText = `${line} ${nextLine}`;

    const isHigh = HIGH_TOTAL_REGEX.test(line);
    const isMedium = !isHigh && MEDIUM_TOTAL_REGEX.test(line);
    const isExcluded = !isHigh && EXCLUDE_LINE_REGEX.test(line);

    if (isExcluded) continue;

    if (isHigh || isMedium) {
      const lineCurr = detectCurrencyInText(windowText);
      const currHint = lineCurr.currency || globalCurr.currency;
      // Buscar montos numéricos en la misma línea o en la inmediata siguiente
      const numberRegex = /(?:USD|CRC|COLONES|US\$|[₡¢$])?\s*(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2}))/gi;
      const matches = Array.from(windowText.matchAll(numberRegex));

      for (const m of matches) {
        const token = m[1].trim();
        // Evitar años como 2024, 2025, 2026 si no tienen decimales ni símbolo de moneda
        const fullMatch = m[0];
        const hasSymbolOrDec = /[₡¢$,.]|USD|CRC/i.test(fullMatch);
        if (!hasSymbolOrDec && /^202\d$/.test(token)) continue;
        if (token.replace(/\D/g, '').length >= 10) continue; // Evitar teléfonos/cédulas

        const val = parseFlexibleNumber(token, currHint);
        if (val !== null && val > 0 && val < 100_000_000) {
          candidates.push({
            value: val,
            priority: isHigh ? 3 : 2,
            currencyHint: detectCurrencyInText(fullMatch).currency || currHint,
            line,
          });
        }
      }
    }
  }

  // Si no hubo líneas con palabra TOTAL, buscar montos acompañados explícitamente de símbolo de moneda (₡ o $)
  if (candidates.length === 0) {
    const currencyNumberRegex = /(?:(USD|US\$|\$)|(CRC|COLONES|[₡¢]))\s*(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2}))/gi;
    const matches = Array.from(rawText.matchAll(currencyNumberRegex));
    for (const m of matches) {
      const isUsd = Boolean(m[1]);
      const curr: 'USD' | 'CRC' = isUsd ? 'USD' : 'CRC';
      const val = parseFlexibleNumber(m[3], curr);
      if (val !== null && val > 0 && val < 100_000_000) {
        candidates.push({
          value: val,
          priority: 1,
          currencyHint: curr,
          line: m[0],
        });
      }
    }
  }

  // Ordenar candidatos: mayor prioridad primero; a igual prioridad, el último/mayor monto (total final suele ser el mayor)
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.value - a.value;
  });

  const best = candidates[0];
  const topPriorityCandidates = candidates.filter(c => best && c.priority === best.priority);
  const distinctTopValues = Array.from(new Set(topPriorityCandidates.map(c => c.value)));

  let resolvedCurrency: 'USD' | 'CRC' = best?.currencyHint || globalCurr.currency || 'CRC';
  let currencyAmbiguous = !best?.currencyHint && (!globalCurr.currency || globalCurr.hasBoth);

  // Heurística adicional para Costa Rica: montos mayores a 15,000 sin símbolo casi siempre son CRC
  if (currencyAmbiguous && best && best.value >= 15000) {
    resolvedCurrency = 'CRC';
  }

  const amountAmbiguous =
    !best ||
    best.priority === 1 ||
    (distinctTopValues.length > 1 && best.priority < 3) ||
    sourceMethod === 'ocr';

  const needsConfirmation = !best || currencyAmbiguous || amountAmbiguous;

  let notice: string | undefined;
  if (!best) {
    notice = 'No se detectó un total claro en el comprobante. Ingresa el monto y confirma la moneda manualmente.';
  } else if (currencyAmbiguous) {
    notice = 'Monto detectado. Confirma si la moneda del comprobante es USD o CRC antes de guardar.';
  } else if (amountAmbiguous) {
    notice = 'Verifica que el monto y la moneda leídos coincidan con el total a pagar del comprobante.';
  }

  return {
    documentNumber: extractDocumentNumberFromText(rawText) || hint.documentNumber || '',
    providerName: extractProviderFromText(lines),
    date: extractDateFromText(rawText) || hint.date || '',
    amount: best ? best.value.toFixed(2) : '',
    currency: resolvedCurrency,
    category: inferCategoryFromText(rawText),
    needsConfirmation,
    notice,
    sourceMethod,
  };
}

/**
 * Extrae texto embebido de un PDF directamente en el navegador usando PDF.js,
 * y si el PDF es escaneado (sin texto), renderiza la primera página en un canvas para OCR local.
 */
async function extractFromPdfInBrowser(
  dataUrl: string,
  filename: string
): Promise<LocalReceiptExtraction> {
  const bytes = dataUrlToBytes(dataUrl);
  const pdfjs = await getPdfJs();

  if (pdfjs) {
    try {
      const loadingTask = pdfjs.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 3);
      const pageTexts: string[] = [];

      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        let lastY: number | null = null;
        let lineBuffer = '';
        const lines: string[] = [];

        for (const item of content.items) {
          const str = item.str ?? '';
          const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
            if (lineBuffer.trim()) lines.push(lineBuffer.trim());
            lineBuffer = str;
          } else {
            lineBuffer += (lineBuffer && str ? ' ' : '') + str;
          }
          if (y !== null) lastY = y;
        }
        if (lineBuffer.trim()) lines.push(lineBuffer.trim());
        pageTexts.push(lines.join('\n'));
      }

      const fullText = pageTexts.join('\n').trim();
      if (fullText.length >= 12) {
        const parsed = parseReceiptText(fullText, filename, 'pdf-text');
        if (parsed.amount) {
          return parsed;
        }
      }

      // PDF escaneado o sin monto en capa de texto -> OCR local sobre la página 1 renderizada en canvas
      if (pdf.numPages >= 1 && typeof document !== 'undefined') {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.8 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          const ocrResult = await runLocalOcr(canvas, filename);
          if (ocrResult) return ocrResult;
        }
      }

      if (fullText.length > 0) {
        return parseReceiptText(fullText, filename, 'pdf-text');
      }
    } catch (err) {
      console.warn('Lectura PDF.js local con aviso, usando extractor nativo de respaldo:', err);
    }
  }

  // Respaldo nativo sin dependencias externas: decodifica streams de texto del PDF
  const fallbackText = extractRawPdfTextFallback(bytes);
  if (fallbackText.trim().length > 0) {
    return parseReceiptText(fallbackText, filename, 'pdf-text');
  }

  const hint = extractHaciendaHintFromFilename(filename);
  return {
    documentNumber: hint.documentNumber || '',
    providerName: '',
    date: hint.date || '',
    amount: '',
    currency: 'CRC',
    category: 'Otros',
    needsConfirmation: true,
    notice: 'Este PDF no contiene texto seleccionable. Ingresa y confirma el monto manualmente.',
    sourceMethod: 'manual',
  };
}

function extractRawPdfTextFallback(bytes: Uint8Array): string {
  const raw = new TextDecoder('latin1').decode(bytes);
  const chunks: string[] = [];
  const literalRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = literalRegex.exec(raw)) !== null) {
    chunks.push(m[1]);
  }
  return chunks.join('\n');
}

async function runLocalOcr(
  source: string | HTMLCanvasElement,
  filename: string
): Promise<LocalReceiptExtraction | null> {
  const tesseract = await getTesseract();
  if (!tesseract) return null;

  try {
    const result = await tesseract.recognize(source, 'spa+eng');
    const text = result?.data?.text?.trim() || '';
    if (!text) return null;
    return parseReceiptText(text, filename, 'ocr');
  } catch (err) {
    console.warn('Error en OCR local en el navegador:', err);
    return null;
  }
}

/**
 * Punto de entrada principal: lee localmente en el navegador el monto, moneda y datos
 * de un comprobante (PDF, XML/texto o imagen) sin enviar nada a proveedores de IA externos.
 */
export async function readReceiptLocally(
  attachment: ExpenseAttachment
): Promise<LocalReceiptExtraction> {
  const hint = extractHaciendaHintFromFilename(attachment.name);

  // 1. Archivos XML / Texto / CSV / JSON
  if (isTextLikeAttachment(attachment)) {
    const decoded = decodeTextFromDataUrl(attachment.dataUrl) || '';
    if (decoded.trim()) {
      return parseReceiptText(decoded, attachment.name, 'text');
    }
  }

  // 2. Archivos PDF (extracción directa de texto + OCR local si es escaneado)
  if (isPdfAttachment(attachment)) {
    return await extractFromPdfInBrowser(attachment.dataUrl, attachment.name);
  }

  // 3. Imágenes (JPG, PNG, WEBP) -> OCR local en el navegador con Tesseract.js
  if (isImageAttachment(attachment)) {
    const ocrResult = await runLocalOcr(attachment.dataUrl, attachment.name);
    if (ocrResult) return ocrResult;

    return {
      documentNumber: hint.documentNumber || '',
      providerName: '',
      date: hint.date || '',
      amount: '',
      currency: 'CRC',
      category: 'Otros',
      needsConfirmation: true,
      notice: 'No se pudo completar el OCR local de la imagen. Ingresa el monto y la moneda manualmente.',
      sourceMethod: 'manual',
    };
  }

  return {
    documentNumber: hint.documentNumber || '',
    providerName: '',
    date: hint.date || '',
    amount: '',
    currency: 'CRC',
    category: 'Otros',
    needsConfirmation: true,
    notice: 'Formato adjuntado. Ingresa el monto y la moneda manualmente.',
    sourceMethod: 'manual',
  };
}
