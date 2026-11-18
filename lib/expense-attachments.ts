export type ExpenseAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  dataUrl: string;
};

export type ExpenseMetadata = {
  documentNumber: string;
  attachments: ExpenseAttachment[];
};

type SerializedAttachmentsPayload = {
  __jrs_attachments: true;
  version: number;
  document_number?: string;
  files: ExpenseAttachment[];
};

const TEXT_EXTENSIONS = ['.xml', '.txt', '.csv', '.json', '.html', '.htm', '.md', '.log'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif', '.heic', '.heif'];

function getExtension(name?: string): string {
  if (!name) return '';
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

export function inferMimeTypeFromDataUrl(dataUrl?: string | null): string {
  if (!dataUrl) return 'application/octet-stream';
  const match = dataUrl.match(/^data:([^;,]+)[;,]/i);
  if (match && match[1]) return match[1].toLowerCase();
  if (/\.pdf(\?|$)/i.test(dataUrl)) return 'application/pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(dataUrl)) return 'image/jpeg';
  return 'application/octet-stream';
}

export function isImageAttachment(file: { mimeType?: string; name?: string; dataUrl?: string }): boolean {
  const mime = (file.mimeType || inferMimeTypeFromDataUrl(file.dataUrl)).toLowerCase();
  if (mime.startsWith('image/')) return true;
  const ext = getExtension(file.name);
  return IMAGE_EXTENSIONS.includes(ext);
}

export function isPdfAttachment(file: { mimeType?: string; name?: string; dataUrl?: string }): boolean {
  const mime = (file.mimeType || inferMimeTypeFromDataUrl(file.dataUrl)).toLowerCase();
  if (mime === 'application/pdf') return true;
  return getExtension(file.name) === '.pdf';
}

export function isTextLikeAttachment(file: { mimeType?: string; name?: string; dataUrl?: string }): boolean {
  const mime = (file.mimeType || inferMimeTypeFromDataUrl(file.dataUrl)).toLowerCase();
  if (
    mime.startsWith('text/') ||
    mime === 'application/xml' ||
    mime === 'application/json' ||
    mime.endsWith('+xml')
  ) {
    return true;
  }
  return TEXT_EXTENSIONS.includes(getExtension(file.name));
}

export function isAiReadableAttachment(file: { mimeType?: string; name?: string; dataUrl?: string }): boolean {
  return isImageAttachment(file) || isPdfAttachment(file) || isTextLikeAttachment(file);
}

export function getAttachmentBadge(file: { mimeType?: string; name?: string; dataUrl?: string }): {
  label: string;
  colorClass: string;
} {
  if (isPdfAttachment(file)) {
    return { label: 'PDF', colorClass: 'bg-red-50 text-red-700 border-red-200/80' };
  }
  if (isImageAttachment(file)) {
    return { label: 'IMG', colorClass: 'bg-sky-50 text-sky-700 border-sky-200/80' };
  }
  const ext = getExtension(file.name);
  const mime = (file.mimeType || '').toLowerCase();
  if (ext === '.xml' || mime.includes('xml')) {
    return { label: 'XML', colorClass: 'bg-violet-50 text-violet-700 border-violet-200/80' };
  }
  if (['.xls', '.xlsx', '.csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) {
    return { label: ext === '.csv' ? 'CSV' : 'XLS', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' };
  }
  if (['.doc', '.docx'].includes(ext) || mime.includes('word')) {
    return { label: 'DOC', colorClass: 'bg-blue-50 text-blue-700 border-blue-200/80' };
  }
  if (['.zip', '.rar', '.7z'].includes(ext) || mime.includes('zip')) {
    return { label: 'ZIP', colorClass: 'bg-amber-50 text-amber-700 border-amber-200/80' };
  }
  if (isTextLikeAttachment(file)) {
    return {
      label: ext ? ext.slice(1).toUpperCase().slice(0, 4) : 'TXT',
      colorClass: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  }
  return {
    label: ext ? ext.slice(1).toUpperCase().slice(0, 5) : 'DOC',
    colorClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Extrae pista de fecha y consecutivo si el nombre del archivo contiene
 * una clave numérica de 50 dígitos de Hacienda Costa Rica (506DDMMYY...).
 */
export function extractHaciendaHintFromFilename(filename: string): {
  date?: string;
  documentNumber?: string;
} {
  if (!filename) return {};
  const match = filename.match(/506(\d{2})(\d{2})(\d{2})\d{12}(\d{20})\d{9}/);
  if (!match) return {};
  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yy = Number(match[3]);
  const consecutivo = match[4];

  let date: string | undefined;
  if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
    const yyyy = 2000 + yy;
    date = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }

  return {
    date,
    documentNumber: consecutivo,
  };
}

export function serializeExpenseMetadata(
  files: ExpenseAttachment[],
  documentNumber?: string | null
): string | null {
  const cleanDoc = (documentNumber || '').trim();
  const safeFiles = Array.isArray(files) ? files : [];
  if (safeFiles.length === 0 && !cleanDoc) return null;

  const payload: SerializedAttachmentsPayload = {
    __jrs_attachments: true,
    version: 2,
    ...(cleanDoc ? { document_number: cleanDoc } : {}),
    files: safeFiles.map((f, idx) => ({
      id: f.id || `att-${idx}`,
      name: f.name || `archivo-${idx + 1}`,
      mimeType: f.mimeType || inferMimeTypeFromDataUrl(f.dataUrl),
      size: f.size,
      dataUrl: f.dataUrl,
    })),
  };
  return JSON.stringify(payload);
}

export function serializeExpenseAttachments(files: ExpenseAttachment[]): string | null {
  return serializeExpenseMetadata(files);
}

export function parseExpenseMetadata(raw?: string | null): ExpenseMetadata {
  if (!raw) return { documentNumber: '', attachments: [] };
  const trimmed = raw.trim();
  if (!trimmed) return { documentNumber: '', attachments: [] };

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.__jrs_attachments && Array.isArray(parsed.files)) {
        const attachments: ExpenseAttachment[] = parsed.files
          .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item: Record<string, unknown>, idx: number) => {
            const dataUrl = String(item.dataUrl || '');
            const mimeType = String(item.mimeType || inferMimeTypeFromDataUrl(dataUrl));
            const name = String(item.name || `archivo-${idx + 1}`);
            const size = typeof item.size === 'number' ? item.size : undefined;
            return {
              id: String(item.id || `att-${idx}`),
              name,
              mimeType,
              size,
              dataUrl,
            };
          })
          .filter((f: ExpenseAttachment) => Boolean(f.dataUrl));

        const documentNumber =
          typeof parsed.document_number === 'string' ? parsed.document_number.trim() : '';

        return { documentNumber, attachments };
      }
    } catch {
      // Fallback to treating raw as single legacy URL/dataUrl
    }
  }

  const mimeType = inferMimeTypeFromDataUrl(trimmed);
  const defaultName = mimeType === 'application/pdf' ? 'comprobante.pdf' : 'comprobante.jpg';
  return {
    documentNumber: '',
    attachments: [
      {
        id: 'legacy-0',
        name: defaultName,
        mimeType,
        dataUrl: trimmed,
      },
    ],
  };
}

export function parseExpenseAttachments(raw?: string | null): ExpenseAttachment[] {
  return parseExpenseMetadata(raw).attachments;
}

export function dataUrlToBlobUrl(dataUrl: string): string | null {
  if (typeof window === 'undefined' || !dataUrl) return null;
  if (!dataUrl.startsWith('data:')) return dataUrl;
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(5, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/^([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function decodeTextFromDataUrl(dataUrl: string): string | null {
  if (typeof window === 'undefined' || !dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(5, commaIdx);
    const payload = dataUrl.slice(commaIdx + 1);
    if (header.includes(';base64')) {
      const binary = window.atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}
