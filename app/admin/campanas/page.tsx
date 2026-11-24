'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Send,
  Save,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Users,
  Mail,
  FileText,
  History,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ClipboardPaste,
  Eye,
  Plus,
  Search,
  X,
  ShieldCheck,
  ImagePlus,
  Link2,
  Monitor,
  Smartphone,
  Package,
  Tag,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';

type CampaignCategory = 'promocion' | 'paquete' | 'cobro' | 'estado_cuenta';
type CampaignImagePosition = 'top' | 'middle' | 'bottom';

type CampaignImage = {
  id: string;
  src: string;
  caption?: string;
  position: CampaignImagePosition;
};

type CampaignVariables = {
  trackingNumber?: string;
  campaignDate?: string;
  customLink?: string;
};

type CampaignDraft = {
  id: string;
  title: string;
  idea: string;
  category: CampaignCategory;
  subject: string;
  preheader: string;
  badgeText: string;
  headline: string;
  body: string;
  highlights: string[];
  images?: CampaignImage[];
  ctaText: string;
  ctaUrl: string;
  showWhatsappSecondary?: boolean;
  variables?: CampaignVariables;
  updatedAtIso: string;
  updatedAtDisplay: string;
};

type CampaignHistoryEntry = {
  id: string;
  sentAtIso: string;
  sentAtDisplay: string;
  title: string;
  subject: string;
  category?: CampaignCategory;
  totalRecipients: number;
  sentCount: number;
  errorCount: number;
  sentBy: string;
  imagesCount?: number;
  errors?: string[];
};

type Recipient = {
  id: string;
  name: string;
  email: string;
};

const FORBIDDEN_PLACEHOLDERS = [
  'titular de tu campaña',
  '(sin asunto aún)',
  '(sin asunto)',
  '(escribe aquí tu idea)',
  'lorem ipsum',
  '[pendiente]',
  'texto de ejemplo',
];

const AMOUNT_PATTERN_IN_STATEMENT =
  /(?:[$₡]\s*\d|\b(?:usd|crc|colones|dólares|dolares)\s*[:.]?\s*\d|\d+(?:[.,]\d{2})?\s*(?:usd|crc|colones|dólares|dolares)\b)/i;

const TEMPLATE_TYPES: Array<{
  id: CampaignCategory;
  label: string;
  shortDesc: string;
  badge: string;
  defaultSubject: string;
  defaultHeadline: string;
  defaultBody: string;
  defaultHighlights: string[];
  defaultCtaText: string;
  defaultCtaUrl: string;
  showWhatsappSecondary: boolean;
}> = [
  {
    id: 'promocion',
    label: 'Promociones',
    shortDesc: 'Descuentos, tarifas especiales y temporadas',
    badge: 'Promoción Especial',
    defaultSubject: 'Beneficio especial en tus próximos envíos con JRS Cargo',
    defaultHeadline: 'Aprovecha nuestra promoción de envíos',
    defaultBody:
      'Queremos agradecer tu confianza en JRS Cargo con una promoción especial para tus próximas compras en Estados Unidos.\n\nCoordina tus envíos aéreos o marítimos antes del {{fecha}} y aprovecha nuestras condiciones preferenciales directo hasta Costa Rica.',
    defaultHighlights: [
      'Envíos seguros desde nuestra bodega en Miami hasta Heredia',
      'Seguimiento en línea para cada uno de tus paquetes',
    ],
    defaultCtaText: 'Ver promoción en línea',
    defaultCtaUrl: 'https://www.jrscargocr.com',
    showWhatsappSecondary: true,
  },
  {
    id: 'paquete',
    label: 'Actualizaciones de paquetes',
    shortDesc: 'En tránsito, recibido en bodega o listo para retiro',
    badge: 'Actualización de Envío',
    defaultSubject: 'Tu paquete {{guia}} está en camino - JRS Cargo',
    defaultHeadline: 'Tu paquete está en camino',
    defaultBody:
      'Tu envío {{guia}} ya está en tránsito hacia Costa Rica. Puedes consultar el estado y los movimientos de tu paquete desde el siguiente enlace.',
    defaultHighlights: [],
    defaultCtaText: 'Rastrear mi paquete',
    defaultCtaUrl: 'https://www.jrscargocr.com/tracking',
    showWhatsappSecondary: true,
  },
  {
    id: 'cobro',
    label: 'Notificaciones de cobro',
    shortDesc: 'Aviso de comprobante disponible o recordatorio de pago',
    badge: 'Notificación de Cobro',
    defaultSubject: 'Recordatorio de pago disponible - JRS Cargo',
    defaultHeadline: 'Tienes un comprobante pendiente de revisión',
    defaultBody:
      'Te recordamos amablemente que tienes un comprobante emitido el {{fecha}} pendiente de cancelación.\n\nPuedes revisar el detalle completo desde tu portal en línea. Si ya realizaste el pago recientemente, por favor omite este aviso o compártenos el comprobante por WhatsApp.',
    defaultHighlights: [],
    defaultCtaText: 'Consultar mis comprobantes',
    defaultCtaUrl: 'https://www.jrscargocr.com',
    showWhatsappSecondary: true,
  },
  {
    id: 'estado_cuenta',
    label: 'Estados de cuenta',
    shortDesc: 'Invitación segura al portal (sin monto en el mensaje)',
    badge: 'Estado de Cuenta',
    defaultSubject: 'Tu estado de cuenta en línea está disponible - JRS Cargo',
    defaultHeadline: 'Tu estado de cuenta está actualizado',
    defaultBody:
      'Tu estado de cuenta en JRS Cargo ya se encuentra actualizado al {{fecha}}.\n\nIngresa de forma segura desde el siguiente botón para revisar tus comprobantes, pagos aplicados y el detalle de tu cuenta en línea.',
    defaultHighlights: [],
    defaultCtaText: 'Ver mi estado de cuenta en línea',
    defaultCtaUrl: '{{enlace}}',
    showWhatsappSecondary: true,
  },
];

function getTodayCostaRicaLabel(): string {
  const cr = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const dd = String(cr.getUTCDate()).padStart(2, '0');
  const mm = String(cr.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = cr.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function generateLocalDraftFromIdea(idea: string, category: CampaignCategory) {
  const base = TEMPLATE_TYPES.find(t => t.id === category) || TEMPLATE_TYPES[0];
  const cleanIdea = idea.trim();
  if (!cleanIdea) {
    return {
      subject: base.defaultSubject,
      badgeText: base.badge,
      headline: base.defaultHeadline,
      body: base.defaultBody,
      highlights: base.defaultHighlights,
      ctaText: base.defaultCtaText,
      ctaUrl: base.defaultCtaUrl,
      showWhatsappSecondary: base.showWhatsappSecondary,
    };
  }

  const shortTitle = cleanIdea.length > 60 ? cleanIdea.slice(0, 57).trim() + '...' : cleanIdea;

  if (category === 'estado_cuenta') {
    return {
      subject: `Estado de cuenta actualizado - JRS Cargo`,
      badgeText: base.badge,
      headline: 'Tu estado de cuenta está listo para consulta',
      body: `${cleanIdea}\n\nIngresa de forma segura a tu portal personal desde el siguiente botón para consultar tus comprobantes y movimientos actualizados.`,
      highlights: [],
      ctaText: 'Ver mi estado de cuenta en línea',
      ctaUrl: '{{enlace}}',
      showWhatsappSecondary: true,
    };
  }

  if (category === 'paquete') {
    return {
      subject: `Actualización de tu paquete - JRS Cargo`,
      badgeText: base.badge,
      headline: shortTitle,
      body: `${cleanIdea}\n\nPuedes consultar el estado y los movimientos actualizados de tu envío en línea desde el siguiente enlace.`,
      highlights: [],
      ctaText: 'Rastrear mi paquete',
      ctaUrl: 'https://www.jrscargocr.com/tracking',
      showWhatsappSecondary: true,
    };
  }

  if (category === 'cobro') {
    return {
      subject: `Aviso importante sobre tu comprobante - JRS Cargo`,
      badgeText: base.badge,
      headline: shortTitle,
      body: `${cleanIdea}\n\nSi ya realizaste tu pago recientemente, puedes compartirnos el comprobante por WhatsApp para aplicarlo de inmediato.`,
      highlights: [],
      ctaText: 'Ver mis comprobantes en línea',
      ctaUrl: 'https://www.jrscargocr.com',
      showWhatsappSecondary: true,
    };
  }

  return {
    subject: `${shortTitle} - JRS Cargo`,
    badgeText: base.badge,
    headline: shortTitle,
    body: `${cleanIdea}\n\nAprovecha esta oportunidad para traer tus compras desde Estados Unidos con el respaldo y la seguridad de JRS Cargo.`,
    highlights: [
      'Envíos seguros desde Miami directo a San Pablo de Heredia',
      'Seguimiento en línea para cada paquete',
    ],
    ctaText: 'Ver promoción en línea',
    ctaUrl: 'https://www.jrscargocr.com',
    showWhatsappSecondary: true,
  };
}

function buildGeminiPrompt(idea: string, category: CampaignCategory): string {
  const cat = TEMPLATE_TYPES.find(t => t.id === category) || TEMPLATE_TYPES[0];
  const statementRule =
    category === 'estado_cuenta'
      ? 'REGLA OBLIGATORIA: NO incluyas ningún monto ni cifra de dinero en el correo. Invita al cliente a consultar su estado de cuenta en línea con el botón.'
      : 'Puedes usar las variables {{nombre}}, {{guia}}, {{fecha}} o {{enlace}} solo si aplican.';

  return [
    'Redacta un correo profesional, limpio y cercano en español de Costa Rica para JRS Cargo S.A. (courier de Estados Unidos a Costa Rica, San Pablo de Heredia, WhatsApp +506 7260-1238, www.jrscargocr.com).',
    `Tipo de correo: ${cat.label}.`,
    `Idea principal: ${idea.trim() || cat.defaultHeadline}`,
    statementRule,
    'Evita sonar genérico o exagerado. Usa EXACTAMENTE estas etiquetas:',
    '',
    'ASUNTO: (máximo 65 caracteres, claro y directo)',
    'ETIQUETA: (2 o 3 palabras, ej: Actualización de Envío)',
    'TITULAR: (título principal corto y claro)',
    'MENSAJE: (1 a 3 párrafos breves y fáciles de leer en celular, sin escribir "Hola" porque el sistema lo agrega personalizado)',
    'DESTACADOS: (opcional, 0 a 3 viñetas cortas con guion)',
    'BOTON: (texto claro para el botón principal según el propósito del correo)',
  ].join('\n');
}

function parseGeminiResponse(rawText: string): Partial<{
  subject: string;
  badgeText: string;
  headline: string;
  body: string;
  highlights: string[];
  ctaText: string;
}> {
  const text = rawText.replace(/\r\n/g, '\n').trim();
  if (!text) return {};

  const extractField = (label: string) => {
    const regex = new RegExp(
      `(?:^|\\n)\\s*(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?(?:ASUNTO|ETIQUETA|TITULAR|MENSAJE|CUERPO|DESTACADOS|PUNTOS DESTACADOS|BOTON|BOTÓN|CTA)(?:\\*\\*)?\\s*:|$)`,
      'i'
    );
    const m = text.match(regex);
    return m ? m[1].trim().replace(/^\*\*|\*\*$/g, '').trim() : '';
  };

  const subject = extractField('ASUNTO');
  const badgeText = extractField('ETIQUETA');
  const headline = extractField('TITULAR');
  const body = extractField('MENSAJE') || extractField('CUERPO');
  const rawHighlights = extractField('DESTACADOS') || extractField('PUNTOS DESTACADOS');
  const ctaText = extractField('BOT[OÓ]N') || extractField('CTA');

  const highlights = rawHighlights
    ? rawHighlights
        .split('\n')
        .map(line => line.replace(/^[-*•\d.)\s]+/, '').trim())
        .filter(Boolean)
    : [];

  if (!subject && !headline && !body) {
    return { body: text };
  }

  return {
    ...(subject ? { subject } : {}),
    ...(badgeText ? { badgeText } : {}),
    ...(headline ? { headline } : {}),
    ...(body ? { body } : {}),
    ...(highlights.length > 0 ? { highlights } : {}),
    ...(ctaText ? { ctaText } : {}),
  };
}

function compressImageFileToDataUrl(file: File, maxWidth = 960, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Formato de imagen no compatible.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const outType = file.type === 'image/png' && file.size < 220_000 ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outType, quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function resolvePreviewVariables(
  text: string,
  opts: {
    sampleName: string;
    sampleClientId?: string;
    category: CampaignCategory;
    trackingNumber: string;
    campaignDate: string;
    customLink: string;
  }
): string {
  const firstName = (opts.sampleName || 'María').trim().split(' ')[0] || 'María';
  const statementLink =
    opts.category === 'estado_cuenta'
      ? `https://www.jrscargocr.com/estado-cuenta/${encodeURIComponent(opts.sampleClientId || 'cliente')}`
      : '';
  const resolvedLink =
    statementLink || opts.customLink.trim() || 'https://www.jrscargocr.com';

  return String(text || '')
    .replace(/\{\{\s*nombre\s*\}\}/gi, firstName)
    .replace(/\{\{\s*guia\s*\}\}/gi, opts.trackingNumber.trim() || '{{guia}}')
    .replace(/\{\{\s*fecha\s*\}\}/gi, opts.campaignDate.trim() || '{{fecha}}')
    .replace(/\{\{\s*enlace\s*\}\}/gi, resolvedLink);
}

export default function CampanasCorreoPage() {
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [history, setHistory] = useState<CampaignHistoryEntry[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [excludedEmails, setExcludedEmails] = useState<Record<string, boolean>>({});

  // Default template: Actualizaciones de paquetes (clean & ready to inspect)
  const initialTemplate = TEMPLATE_TYPES[0];
  const [activeDraftId, setActiveDraftId] = useState<string>('');
  const [idea, setIdea] = useState('');
  const [category, setCategory] = useState<CampaignCategory>(initialTemplate.id);
  const [subject, setSubject] = useState(initialTemplate.defaultSubject);
  const [preheader, setPreheader] = useState('');
  const [badgeText, setBadgeText] = useState(initialTemplate.badge);
  const [headline, setHeadline] = useState(initialTemplate.defaultHeadline);
  const [body, setBody] = useState(initialTemplate.defaultBody);
  const [highlightsText, setHighlightsText] = useState(initialTemplate.defaultHighlights.join('\n'));
  const [images, setImages] = useState<CampaignImage[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ctaText, setCtaText] = useState(initialTemplate.defaultCtaText);
  const [ctaUrl, setCtaUrl] = useState(initialTemplate.defaultCtaUrl);
  const [showWhatsappSecondary, setShowWhatsappSecondary] = useState<boolean>(true);

  // Variables state
  const [trackingNumber, setTrackingNumber] = useState('');
  const [campaignDate, setCampaignDate] = useState(() => getTodayCostaRicaLabel());
  const [customLink, setCustomLink] = useState('https://www.jrscargocr.com');

  // Gemini web zero-token helper state
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [geminiPasteText, setGeminiPasteText] = useState('');

  // Actions & Preview state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('josegon2000@hotmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'preview' | 'drafts' | 'history'>('preview');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Recipients selector modal
  const [recipientsModalOpen, setRecipientsModalOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Mass send confirmation & progress
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{
    active: boolean;
    total: number;
    processed: number;
    sent: number;
    errors: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/campaigns', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setDrafts(Array.isArray(data.data?.drafts) ? data.data.drafts : []);
        setHistory(Array.isArray(data.data?.history) ? data.data.history : []);
        setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
      } else if (res.status === 403) {
        showAlert('Acceso restringido', 'Esta sección es exclusiva para el usuario Master.', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRecipients = useMemo(
    () => recipients.filter(r => !excludedEmails[r.email.toLowerCase()]),
    [recipients, excludedEmails]
  );

  const filteredModalRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [recipients, recipientSearch]);

  const highlightsArray = useMemo(
    () =>
      highlightsText
        .split('\n')
        .map(s => s.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean),
    [highlightsText]
  );

  // Strict real-time validation blocking sends if missing required data or placeholders
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    const s = subject.trim();
    const h = headline.trim();
    const b = body.trim();
    const ct = ctaText.trim();
    const cu = ctaUrl.trim();

    if (!s) errs.push('Falta el asunto del correo.');
    if (!h) errs.push('Falta el título principal.');
    if (!b) errs.push('Falta el mensaje principal.');
    if (!ct) errs.push('Falta el texto del botón principal.');
    if (!cu) {
      errs.push('Falta el enlace del botón principal.');
    } else if (!cu.includes('{{enlace}}') && !cu.startsWith('https://') && !cu.startsWith('http://')) {
      errs.push('El enlace del botón principal debe empezar con https:// o usar {{enlace}}.');
    }

    const combined = `${s}\n${h}\n${b}\n${ct}`;
    const lower = combined.toLowerCase();
    for (const forbidden of FORBIDDEN_PLACEHOLDERS) {
      if (lower.includes(forbidden)) {
        errs.push(`Reemplaza el texto de ejemplo («${forbidden}») antes de enviar.`);
      }
    }

    if (/\{\{\s*guia\s*\}\}/i.test(combined) && !trackingNumber.trim()) {
      errs.push('El mensaje usa {{guia}}: completa el campo «Número de guía».');
    }
    if (/\{\{\s*fecha\s*\}\}/i.test(combined) && !campaignDate.trim()) {
      errs.push('El mensaje usa {{fecha}}: completa el campo «Fecha».');
    }
    if (
      category !== 'estado_cuenta' &&
      (/\{\{\s*enlace\s*\}\}/i.test(combined) || /\{\{\s*enlace\s*\}\}/i.test(cu)) &&
      !customLink.trim()
    ) {
      errs.push('El correo usa {{enlace}}: completa el campo «Enlace».');
    }

    if (category === 'estado_cuenta' && AMOUNT_PATTERN_IN_STATEMENT.test(`${s}\n${h}\n${b}`)) {
      errs.push(
        'En correos de Estado de Cuenta no incluyas montos pendientes en el mensaje; invita al cliente a consultarlo en línea mediante el botón.'
      );
    }

    return errs;
  }, [subject, headline, body, ctaText, ctaUrl, trackingNumber, campaignDate, customLink, category]);

  const canSend = validationErrors.length === 0;

  // Consejos anti-spam en tiempo real (evita que Gmail o Hotmail envíen el correo a Spam)
  const spamWarnings = useMemo(() => {
    const warns: string[] = [];
    const s = subject.trim();
    const b = body.trim();
    const letters = s.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ]/g, '');
    const upperLetters = s.replace(/[^A-ZÁÉÍÓÚÑ]/g, '');
    if (letters.length >= 8 && upperLetters.length / letters.length > 0.55) {
      warns.push('Evita escribir el asunto en MAYÚSCULAS; los filtros de Gmail y Hotmail lo marcan como spam.');
    }
    if (/!{2,}/.test(s) || /!{3,}/.test(b)) {
      warns.push('Evita múltiples signos de exclamación (!!!); usa un tono natural.');
    }
    if (/\b(100%\s*gratis|dinero\s*f[aá]cil|ganador|urgente\s*ahora|oferta\s*incre[ií]ble)\b/i.test(`${s} ${b}`)) {
      warns.push('Detectamos palabras que suelen activar filtros de spam (ej. "100% gratis", "urgente ahora").');
    }
    if (images.length > 0 && b.length < 70) {
      warns.push('Agrega un poco más de texto junto a la imagen para mantener buena relación texto/imagen.');
    }
    return warns;
  }, [subject, body, images.length]);

  const previewRecipient = selectedRecipients[0] || {
    id: 'cliente',
    name: 'María Pérez',
    email: testEmailTo || 'cliente@ejemplo.com',
  };

  const previewVarCtx = useMemo(
    () => ({
      sampleName: previewRecipient.name,
      sampleClientId: previewRecipient.id,
      category,
      trackingNumber,
      campaignDate,
      customLink,
    }),
    [previewRecipient.name, previewRecipient.id, category, trackingNumber, campaignDate, customLink]
  );

  const previewSubject = resolvePreviewVariables(subject, previewVarCtx);
  const previewHeadline = resolvePreviewVariables(headline, previewVarCtx);
  const previewBody = resolvePreviewVariables(body, previewVarCtx);
  const previewCtaText = resolvePreviewVariables(ctaText, previewVarCtx);
  const previewFirstName = (previewRecipient.name || 'María').trim().split(' ')[0] || 'María';

  const applyTemplatePreset = (catId: CampaignCategory) => {
    const preset = TEMPLATE_TYPES.find(t => t.id === catId) || TEMPLATE_TYPES[0];
    setCategory(preset.id);
    setSubject(preset.defaultSubject);
    setBadgeText(preset.badge);
    setHeadline(preset.defaultHeadline);
    setBody(preset.defaultBody);
    setHighlightsText(preset.defaultHighlights.join('\n'));
    setCtaText(preset.defaultCtaText);
    setCtaUrl(preset.defaultCtaUrl);
    setShowWhatsappSecondary(preset.showWhatsappSecondary);
    if (!campaignDate.trim()) setCampaignDate(getTodayCostaRicaLabel());
    setActiveSideTab('preview');
  };

  const handleGenerateLocalDraft = () => {
    const generated = generateLocalDraftFromIdea(idea, category);
    setSubject(generated.subject);
    setBadgeText(generated.badgeText);
    setHeadline(generated.headline);
    setBody(generated.body);
    setHighlightsText(generated.highlights.join('\n'));
    setCtaText(generated.ctaText);
    setCtaUrl(generated.ctaUrl);
    setShowWhatsappSecondary(generated.showWhatsappSecondary);
    setActiveSideTab('preview');
  };

  const handleCopyPromptAndOpenGemini = async () => {
    const prompt = buildGeminiPrompt(idea, category);
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 3500);
    } catch {
      // Ignore clipboard failure
    }
    setShowPasteBox(true);
    window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
  };

  const handleApplyGeminiResponse = () => {
    if (!geminiPasteText.trim()) {
      showAlert('Campo vacío', 'Pega primero la respuesta que te dio Gemini.', 'error');
      return;
    }
    const parsed = parseGeminiResponse(geminiPasteText);
    if (parsed.subject) setSubject(parsed.subject);
    if (parsed.badgeText) setBadgeText(parsed.badgeText);
    if (parsed.headline) setHeadline(parsed.headline);
    if (parsed.body) setBody(parsed.body);
    if (parsed.highlights && parsed.highlights.length > 0) {
      setHighlightsText(parsed.highlights.join('\n'));
    }
    if (parsed.ctaText) setCtaText(parsed.ctaText);
    setShowPasteBox(false);
    setGeminiPasteText('');
    setActiveSideTab('preview');
    showAlert('Borrador actualizado', 'Se aplicó la respuesta de Gemini a tu plantilla.', 'success');
  };

  const handleNewDraft = () => {
    setActiveDraftId('');
    setIdea('');
    setImages([]);
    setTrackingNumber('');
    setCampaignDate(getTodayCostaRicaLabel());
    applyTemplatePreset(category);
  };

  const handleLoadDraft = (d: CampaignDraft) => {
    const validCat: CampaignCategory =
      d.category === 'promocion' ||
      d.category === 'paquete' ||
      d.category === 'cobro' ||
      d.category === 'estado_cuenta'
        ? d.category
        : 'promocion';
    setActiveDraftId(d.id);
    setIdea(d.idea || '');
    setCategory(validCat);
    setSubject(d.subject || '');
    setPreheader(d.preheader || '');
    setBadgeText(d.badgeText || '');
    setHeadline(d.headline || '');
    setBody(d.body || '');
    setHighlightsText((d.highlights || []).join('\n'));
    setImages(Array.isArray(d.images) ? d.images : []);
    setCtaText(d.ctaText || '');
    setCtaUrl(d.ctaUrl || 'https://www.jrscargocr.com');
    setShowWhatsappSecondary(d.showWhatsappSecondary !== false);
    setTrackingNumber(d.variables?.trackingNumber || '');
    setCampaignDate(d.variables?.campaignDate || getTodayCostaRicaLabel());
    setCustomLink(d.variables?.customLink || 'https://www.jrscargocr.com');
    setActiveSideTab('preview');
  };

  const handleUploadImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = Math.max(0, 4 - images.length);
    if (remainingSlots === 0) {
      showAlert('Límite alcanzado', 'Puedes incluir hasta 4 imágenes por correo.', 'error');
      return;
    }

    setIsProcessingImage(true);
    try {
      const files = Array.from(fileList).slice(0, remainingSlots);
      const added: CampaignImage[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImageFileToDataUrl(file);
        added.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          src: dataUrl,
          caption: '',
          position: images.length === 0 && added.length === 0 ? 'top' : 'middle',
        });
      }
      if (added.length > 0) {
        setImages(prev => [...prev, ...added].slice(0, 4));
        setActiveSideTab('preview');
      }
    } catch (err) {
      showAlert('Error de imagen', err instanceof Error ? err.message : 'No se pudo cargar la imagen.', 'error');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      showAlert('Enlace inválido', 'Ingresa una URL válida que empiece con https://', 'error');
      return;
    }
    if (images.length >= 4) {
      showAlert('Límite alcanzado', 'Puedes incluir hasta 4 imágenes por correo.', 'error');
      return;
    }
    setImages(prev => [
      ...prev,
      {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        src: url,
        caption: '',
        position: prev.length === 0 ? 'top' : 'middle',
      },
    ]);
    setImageUrlInput('');
    setShowImageUrlInput(false);
    setActiveSideTab('preview');
  };

  const handleSaveDraft = async () => {
    if (!subject.trim() && !headline.trim() && !body.trim()) {
      showAlert('Borrador vacío', 'Agrega al menos un asunto o mensaje antes de guardar.', 'error');
      return;
    }
    setIsSavingDraft(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_draft',
          id: activeDraftId || undefined,
          title: subject.trim() || headline.trim() || 'Borrador',
          idea,
          category,
          subject,
          preheader,
          badgeText,
          headline,
          body,
          highlights: highlightsArray,
          images,
          ctaText,
          ctaUrl,
          showWhatsappSecondary,
          variables: { trackingNumber, campaignDate, customLink },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.draft?.id) setActiveDraftId(data.draft.id);
        if (Array.isArray(data.data?.drafts)) setDrafts(data.data.drafts);
        showAlert('Borrador guardado', 'Tu borrador quedó guardado correctamente.', 'success');
      } else {
        showAlert('Error', data.error || 'No se pudo guardar el borrador.', 'error');
      }
    } catch {
      showAlert('Error', 'Error de red al guardar el borrador.', 'error');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_draft', id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDrafts(Array.isArray(data.data?.drafts) ? data.data.drafts : []);
        if (activeDraftId === id) setActiveDraftId('');
      }
    } catch {
      showAlert('Error', 'No se pudo eliminar el borrador.', 'error');
    }
  };

  const handleSendTest = async () => {
    if (!canSend) {
      showAlert('Corrige antes de enviar', validationErrors[0], 'error');
      return;
    }
    const cleanTo = testEmailTo.trim();
    if (!cleanTo || !cleanTo.includes('@')) {
      showAlert('Correo inválido', 'Ingresa un correo electrónico válido para la prueba.', 'error');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          to: cleanTo,
          category,
          subject,
          preheader,
          badgeText,
          headline,
          body,
          highlights: highlightsArray,
          images,
          ctaText,
          ctaUrl,
          showWhatsappSecondary,
          variables: { trackingNumber, campaignDate, customLink },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('Prueba enviada', `Se envió el correo de prueba a ${cleanTo}.`, 'success');
      } else {
        showAlert('Error', data.error || 'No se pudo enviar el correo de prueba.', 'error');
      }
    } catch {
      showAlert('Error', 'Error de red al enviar la prueba.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleConfirmMassSend = async () => {
    if (!canSend) {
      showAlert('Corrige antes de enviar', validationErrors[0], 'error');
      return;
    }
    if (selectedRecipients.length === 0) {
      showAlert('Sin destinatarios', 'Selecciona al menos un cliente con correo válido.', 'error');
      return;
    }

    setConfirmSendOpen(false);
    const total = selectedRecipients.length;
    setSendingProgress({ active: true, total, processed: 0, sent: 0, errors: 0 });

    const CHUNK_SIZE = 8;
    let totalSent = 0;
    let totalErrors = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = selectedRecipients.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_chunk',
            recipients: chunk.map(r => ({ id: r.id, email: r.email, name: r.name })),
            category,
            subject,
            preheader,
            badgeText,
            headline,
            body,
            highlights: highlightsArray,
            images,
            ctaText,
            ctaUrl,
            showWhatsappSecondary,
            variables: { trackingNumber, campaignDate, customLink },
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          totalSent += Number(data.sentCount || 0);
          totalErrors += Number(data.errorCount || 0);
          if (Array.isArray(data.errors)) allErrors.push(...data.errors);
        } else {
          totalErrors += chunk.length;
          allErrors.push(data.error || 'Error enviando lote');
        }
      } catch {
        totalErrors += chunk.length;
        allErrors.push('Error de red en lote');
      }

      setSendingProgress({
        active: true,
        total,
        processed: Math.min(total, i + chunk.length),
        sent: totalSent,
        errors: totalErrors,
      });
    }

    try {
      const recRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_campaign',
          category,
          title: headline || subject,
          subject,
          totalRecipients: total,
          sentCount: totalSent,
          errorCount: totalErrors,
          imagesCount: images.length,
          errors: allErrors.slice(0, 20),
        }),
      });
      const recData = await recRes.json();
      if (recRes.ok && recData.success && Array.isArray(recData.data?.history)) {
        setHistory(recData.data.history);
      }
    } catch {
      // Non-critical
    }

    setSendingProgress(null);
    setActiveSideTab('history');
    showAlert(
      'Envío finalizado',
      `Se enviaron ${totalSent} de ${total} correos${totalErrors > 0 ? ` (${totalErrors} con error)` : ''}.`,
      totalErrors > 0 ? 'error' : 'success'
    );
  };

  const renderCategoryIcon = (catId: CampaignCategory) => {
    if (catId === 'promocion') return <Tag size={14} />;
    if (catId === 'paquete') return <Package size={14} />;
    if (catId === 'cobro') return <Receipt size={14} />;
    return <FileSpreadsheet size={14} />;
  };

  const insertVariableIntoBody = (token: string) => {
    setBody(prev => (prev ? `${prev} ${token}` : token));
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campañas y Plantillas de Correo</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B2737] text-amber-400">
              <ShieldCheck size={12} />
              Solo Master
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              0 costo de tokens
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Elige una plantilla por tipo, personaliza el contenido con variables o Gemini Web, revisa la vista previa fiel y envía con seguridad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNewDraft}
            className="h-9 px-3 rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Limpiar</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Save size={14} className="text-[#12435E]" />
            <span>{isSavingDraft ? 'Guardando...' : 'Guardar borrador'}</span>
          </button>

          <button
            type="button"
            onClick={() => setRecipientsModalOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Users size={14} className="text-[#12435E]" />
            <span>
              Destinatarios: <strong className="tabular-nums">{selectedRecipients.length}</strong> / {recipients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canSend) {
                showAlert('Corrige antes de enviar', validationErrors[0], 'error');
                return;
              }
              setConfirmSendOpen(true);
            }}
            disabled={!canSend || !!sendingProgress?.active || selectedRecipients.length === 0}
            className="h-9 px-4 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={13} className="text-amber-400" />
            <span>Enviar a {selectedRecipients.length} clientes</span>
          </button>
        </div>
      </div>

      {/* Barra de progreso durante envío masivo */}
      {sendingProgress?.active && (
        <div className="bg-[#0B2737] text-white rounded-xl p-4 border border-amber-400/30 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-amber-400" />
              Enviando correos... ({sendingProgress.processed} / {sendingProgress.total})
            </span>
            <span className="tabular-nums text-amber-300">
              {Math.round((sendingProgress.processed / Math.max(1, sendingProgress.total)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{
                width: `${Math.round((sendingProgress.processed / Math.max(1, sendingProgress.total)) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-300 mt-2">
            Enviados: <strong>{sendingProgress.sent}</strong> &middot; Errores: <strong>{sendingProgress.errors}</strong>. No cierres esta pestaña hasta finalizar.
          </p>
        </div>
      )}

      {/* PASO 1: Plantillas organizadas por tipo + Idea con Gemini (0 tokens) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" />
            1. Tipo de plantilla y redacción (sin costo de tokens)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona una plantilla base lista para JRS Cargo o redacta tu idea para crear el borrador al instante o con Gemini Web.
          </p>
        </div>

        {/* 4 Tarjetas de tipo de plantilla */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TEMPLATE_TYPES.map(t => {
            const isSelected = category === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplatePreset(t.id)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B2737] text-white border-[#0B2737] shadow-xs'
                    : 'bg-slate-50/70 text-slate-800 border-slate-200/90 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-white border border-slate-200 text-[#12435E]'
                    }`}
                  >
                    {renderCategoryIcon(t.id)}
                  </span>
                  <span className="text-xs font-bold leading-tight">{t.label}</span>
                </div>
                <p className={`text-[11px] mt-1.5 leading-snug ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {t.shortDesc}
                </p>
              </button>
            );
          })}
        </div>

        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          <textarea
            rows={2}
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="Opcional: escribe tu idea (ej: Aviso de cierre de bodega por feriado el viernes, o promoción 15% aéreo)..."
            className="w-full p-3 bg-slate-50/60 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#12435E] focus:ring-2 focus:ring-[#12435E]/10 resize-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateLocalDraft}
              className="h-9 px-3.5 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText size={14} className="text-amber-400" />
              <span>Generar borrador local</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPromptAndOpenGemini}
              className="h-9 px-3.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {promptCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-amber-700" />}
              <span>{promptCopied ? '¡Prompt copiado! Abriendo Gemini...' : 'Copiar prompt y abrir Gemini (gratis)'}</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => setShowPasteBox(prev => !prev)}
              className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ClipboardPaste size={14} className="text-[#12435E]" />
              <span>Pegar respuesta de Gemini</span>
            </button>
          </div>

          {showPasteBox && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">
                  Pega la respuesta de Gemini Web para rellenar el borrador automáticamente:
                </p>
                <button
                  type="button"
                  onClick={() => setShowPasteBox(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                rows={4}
                value={geminiPasteText}
                onChange={e => setGeminiPasteText(e.target.value)}
                placeholder="ASUNTO: ...&#10;TITULAR: ...&#10;MENSAJE: ...&#10;BOTON: ..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#12435E]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteBox(false)}
                  className="h-8 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyGeminiResponse}
                  className="h-8 px-3.5 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-semibold cursor-pointer"
                >
                  Aplicar al borrador
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alerta de validación si faltan datos obligatorios o hay texto inválido */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-red-800">
            <p className="font-bold">Corrige los siguientes puntos antes de enviar el correo:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Consejos anti-spam en tiempo real */}
      {validationErrors.length === 0 && spamWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-900">
            <p className="font-bold">Recomendaciones para evitar la carpeta de Spam:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {spamWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* PASO 2: Editor + Vista previa fiel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Columna izquierda: Editor */}
        <div className="xl:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail size={16} className="text-[#12435E]" />
              2. Editor del correo
            </h2>
            {activeDraftId && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                Borrador guardado
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Asunto del correo *
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej: Tu paquete está en camino - JRS Cargo"
                className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#12435E] focus:ring-2 focus:ring-[#12435E]/10"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Etiqueta (opcional)
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={e => setBadgeText(e.target.value)}
                placeholder="Actualización de Envío"
                className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#12435E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Título principal *
            </label>
            <input
              type="text"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="Ej: Tu paquete está en camino"
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#12435E]"
            />
          </div>

          {/* Variables rápidas */}
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#0B2737] uppercase tracking-wider">
                Datos variables (clic para insertar en el mensaje)
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { token: '{{nombre}}', label: 'Nombre' },
                  { token: '{{guia}}', label: 'Guía' },
                  { token: '{{fecha}}', label: 'Fecha' },
                  { token: '{{enlace}}', label: 'Enlace' },
                ].map(v => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertVariableIntoBody(v.token)}
                    className="h-6 px-2 rounded-md bg-white hover:bg-[#0B2737] hover:text-white border border-slate-200 text-[10.5px] font-mono font-semibold text-[#12435E] transition-colors cursor-pointer"
                    title={`Insertar ${v.token} (${v.label})`}
                  >
                    {v.token}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                  N.º de guía ({'{{guia}}'})
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="Ej: 1Z999AA101234"
                  className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:border-[#12435E]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                  Fecha ({'{{fecha}}'})
                </label>
                <input
                  type="text"
                  value={campaignDate}
                  onChange={e => setCampaignDate(e.target.value)}
                  placeholder="dd/mm/aaaa"
                  className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#12435E]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                  Enlace ({'{{enlace}}'})
                </label>
                {category === 'estado_cuenta' ? (
                  <div className="h-8 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 flex items-center truncate">
                    Personal automático por cliente
                  </div>
                ) : (
                  <input
                    type="url"
                    value={customLink}
                    onChange={e => setCustomLink(e.target.value)}
                    placeholder="https://www.jrscargocr.com"
                    className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#12435E]"
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Mensaje principal *
              </label>
              <span className="text-[11px] text-slate-400">
                Saludo «Hola, [Nombre]:» automático
              </span>
            </div>
            <textarea
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Redacta aquí el mensaje claro y directo para tus clientes..."
              className="w-full p-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-[#12435E] focus:ring-2 focus:ring-[#12435E]/10"
            />
            {category === 'estado_cuenta' && (
              <p className="text-[11px] text-amber-700 mt-1 font-medium">
                Nota de privacidad: en correos de estado de cuenta no incluyas el monto pendiente en el texto; el botón dirige al estado de cuenta personal en línea.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Puntos destacados (opcional, uno por línea)
            </label>
            <textarea
              rows={2}
              value={highlightsText}
              onChange={e => setHighlightsText(e.target.value)}
              placeholder="Opcional: agrega puntos breves clave..."
              className="w-full p-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-[#12435E]"
            />
          </div>

          {/* Botón principal + Acción secundaria WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Texto del botón principal *
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                placeholder="Ej: Rastrear mi paquete"
                className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-[#12435E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Enlace del botón principal *
              </label>
              <input
                type="text"
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://www.jrscargocr.com/tracking"
                className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#12435E]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showWhatsappSecondary}
              onChange={e => setShowWhatsappSecondary(e.target.checked)}
              className="rounded border-slate-300 text-[#0B2737] focus:ring-[#0B2737]"
            />
            <span>Mostrar enlace secundario de WhatsApp («¿Necesitas ayuda? Escríbenos por WhatsApp»)</span>
          </label>

          {/* Imágenes dentro del correo */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold text-[#0B2737] uppercase tracking-wider flex items-center gap-1.5">
                  <ImagePlus size={14} className="text-amber-500" />
                  Imágenes en el correo ({images.length}/4)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Incrustadas directo en el correo (compatibles con Gmail, Outlook y móviles).
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="h-8 px-3 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                  <ImagePlus size={13} className="text-amber-400" />
                  <span>{isProcessingImage ? 'Optimizando...' : 'Subir imagen'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    disabled={isProcessingImage || images.length >= 4}
                    onChange={e => {
                      handleUploadImages(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowImageUrlInput(prev => !prev)}
                  disabled={images.length >= 4}
                  className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Link2 size={13} />
                  <span>URL</span>
                </button>
              </div>
            </div>

            {showImageUrlInput && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#12435E]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="h-8 px-3 rounded-lg bg-[#0B2737] text-white text-xs font-semibold cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            )}

            {images.length > 0 && (
              <div className="space-y-2">
                {images.map(img => (
                  <div
                    key={img.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.caption || 'Imagen'}
                      className="w-20 h-14 object-cover rounded-md border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="flex-1 min-w-0 w-full space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {[
                          { id: 'top' as CampaignImagePosition, label: 'Arriba' },
                          { id: 'middle' as CampaignImagePosition, label: 'En el cuerpo' },
                          { id: 'bottom' as CampaignImagePosition, label: 'Al final' },
                        ].map(pos => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() =>
                              setImages(prev =>
                                prev.map(item =>
                                  item.id === img.id ? { ...item, position: pos.id } : item
                                )
                              )
                            }
                            className={`h-6 px-2 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                              img.position === pos.id
                                ? 'bg-[#0B2737] text-white border-[#0B2737]'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={e =>
                          setImages(prev =>
                            prev.map(item =>
                              item.id === img.id ? { ...item, caption: e.target.value } : item
                            )
                          )
                        }
                        placeholder="Pie de foto opcional"
                        className="w-full h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-700 focus:bg-white focus:outline-none focus:border-[#12435E]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter(item => item.id !== img.id))}
                      className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center shrink-0 cursor-pointer self-end sm:self-center"
                      title="Quitar imagen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Envío de prueba */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Enviar correo de prueba antes de despachar
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testEmailTo}
                onChange={e => setTestEmailTo(e.target.value)}
                placeholder="correo@prueba.com"
                className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#12435E]"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest || !canSend}
                className="h-9 px-4 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Enviar prueba</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha: Vista previa fiel / Borradores / Historial */}
        <div className="xl:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex bg-white border border-slate-200/90 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveSideTab('preview')}
                className={`h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeSideTab === 'preview' ? 'bg-[#0B2737] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Eye size={13} />
                <span>Vista previa</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSideTab('drafts')}
                className={`h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeSideTab === 'drafts' ? 'bg-[#0B2737] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText size={13} />
                <span>Borradores ({drafts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSideTab('history')}
                className={`h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeSideTab === 'history' ? 'bg-[#0B2737] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <History size={13} />
                <span>Historial ({history.length})</span>
              </button>
            </div>

            {activeSideTab === 'preview' && (
              <div className="inline-flex bg-white border border-slate-200/90 rounded-lg p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`h-7 px-2 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vista computadora"
                >
                  <Monitor size={12} />
                  <span>PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`h-7 px-2 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vista celular"
                >
                  <Smartphone size={12} />
                  <span>Celular</span>
                </button>
              </div>
            )}
          </div>

          {/* TAB: Vista previa fiel */}
          {activeSideTab === 'preview' && (
            <div className="p-4 sm:p-5 bg-[#eef2f6]">
              {/* Cabecera de revisión antes de enviar */}
              <div className="mb-3.5 p-3 bg-white rounded-lg border border-slate-200/90 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold w-14 shrink-0">Para:</span>
                  <span className="text-slate-700 font-medium truncate">
                    {previewRecipient.name} &lt;{previewRecipient.email}&gt;
                    {selectedRecipients.length > 1 && (
                      <span className="text-slate-400"> (+{selectedRecipients.length - 1} clientes)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold w-14 shrink-0">Asunto:</span>
                  {previewSubject.trim() ? (
                    <span className="font-bold text-slate-900 truncate">{previewSubject}</span>
                  ) : (
                    <span className="text-red-600 font-semibold italic">Falta asunto obligatorio</span>
                  )}
                </div>
              </div>

              {/* Tarjeta fiel del correo JRS Cargo */}
              <div
                className={`mx-auto bg-white border border-[#dbe4ee] rounded-xl overflow-hidden shadow-xs transition-all duration-200 ${
                  previewDevice === 'mobile' ? 'max-w-[360px]' : 'max-w-[560px]'
                }`}
              >
                {/* Encabezado compacto azul JRS Cargo + borde inferior ámbar */}
                <div className="bg-[#0B2737] py-4 px-6 border-b-4 border-[#F59E0B] flex items-center justify-center">
                  <div className="bg-white px-3.5 py-1.5 rounded-lg inline-flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="JRS Cargo" className="h-9 w-auto block" />
                  </div>
                </div>

                {/* Cuerpo del correo */}
                <div className={previewDevice === 'mobile' ? 'p-5 space-y-3.5' : 'px-8 py-7 space-y-4'}>
                  {/* Imágenes arriba */}
                  {images
                    .filter(i => i.position === 'top')
                    .map(img => (
                      <div key={img.id} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt={img.caption || 'Imagen'} className="w-full h-auto block" />
                        {img.caption && (
                          <p className="px-3 py-2 text-[11.5px] text-slate-600 text-center bg-slate-50 border-t border-slate-200">
                            {img.caption}
                          </p>
                        )}
                      </div>
                    ))}

                  {badgeText.trim() && (
                    <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#12435E]">
                      {badgeText}
                    </p>
                  )}

                  {previewHeadline.trim() ? (
                    <h3
                      className={`text-center font-extrabold text-[#0B2737] leading-snug tracking-tight ${
                        previewDevice === 'mobile' ? 'text-xl' : 'text-2xl'
                      }`}
                    >
                      {previewHeadline}
                    </h3>
                  ) : (
                    <p className="text-center text-xs text-red-600 font-semibold py-2 border border-dashed border-red-200 rounded-lg bg-red-50/50">
                      Falta el título principal del correo
                    </p>
                  )}

                  <p className="text-[15.5px] font-bold text-[#0B2737] pt-1">
                    Hola, {previewFirstName}:
                  </p>

                  {(() => {
                    const paragraphs = previewBody
                      ? previewBody.split(/\n{2,}/).filter(Boolean)
                      : [];
                    const midImages = images.filter(i => i.position === 'middle');

                    if (paragraphs.length === 0) {
                      return (
                        <p className="text-xs text-red-600 font-semibold py-3 px-3 border border-dashed border-red-200 rounded-lg bg-red-50/50">
                          Falta redactar el mensaje principal
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <p className="text-[14.5px] text-slate-700 leading-relaxed whitespace-pre-line">
                          {paragraphs[0]}
                        </p>
                        {midImages.map(img => (
                          <div key={img.id} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 my-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.src} alt={img.caption || 'Imagen'} className="w-full h-auto block" />
                            {img.caption && (
                              <p className="px-3 py-2 text-[11.5px] text-slate-600 text-center bg-slate-50 border-t border-slate-200">
                                {img.caption}
                              </p>
                            )}
                          </div>
                        ))}
                        {paragraphs.slice(1).map((p, idx) => (
                          <p key={idx} className="text-[14.5px] text-slate-700 leading-relaxed whitespace-pre-line">
                            {p}
                          </p>
                        ))}
                      </div>
                    );
                  })()}

                  {highlightsArray.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 border-l-[3px] border-l-[#F59E0B]">
                      <ul className="space-y-1.5">
                        {highlightsArray.map((item, idx) => (
                          <li key={idx} className="text-[13.5px] text-slate-800 flex items-start gap-2">
                            <span className="text-[#F59E0B] font-bold">•</span>
                            <span>{resolvePreviewVariables(item, previewVarCtx)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Imágenes al final */}
                  {images
                    .filter(i => i.position === 'bottom')
                    .map(img => (
                      <div key={img.id} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt={img.caption || 'Imagen'} className="w-full h-auto block" />
                        {img.caption && (
                          <p className="px-3 py-2 text-[11.5px] text-slate-600 text-center bg-slate-50 border-t border-slate-200">
                            {img.caption}
                          </p>
                        )}
                      </div>
                    ))}

                  {/* Botón principal (según el propósito del correo) */}
                  {previewCtaText.trim() && ctaUrl.trim() ? (
                    <div className="pt-2 text-center">
                      <span className="inline-block px-7 py-3 rounded-lg bg-[#0B2737] text-white text-sm font-bold">
                        {previewCtaText} →
                      </span>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-red-600 font-semibold py-2 border border-dashed border-red-200 rounded-lg bg-red-50/50">
                      Falta configurar el botón principal
                    </p>
                  )}

                  {/* Acción secundaria WhatsApp */}
                  {showWhatsappSecondary && (
                    <p className="text-center text-[13px] text-slate-600 pt-1">
                      ¿Necesitas ayuda?{' '}
                      <span className="text-[#0B2737] font-bold underline">
                        Escríbenos por WhatsApp
                      </span>
                    </p>
                  )}
                </div>

                {/* Pie compacto con línea inferior ámbar */}
                <div className="px-8 pb-5 border-b-4 border-[#F59E0B]">
                  <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-600 space-y-0.5">
                    <p className="font-extrabold text-[#0B2737]">JRS CARGO S.A.</p>
                    <p>San Pablo de Heredia, Costa Rica</p>
                    <p>+506 7260-1238 &middot; www.jrscargocr.com</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Borradores guardados */}
          {activeSideTab === 'drafts' && (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Cargando borradores...</div>
              ) : drafts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay borradores guardados todavía. Usa «Guardar borrador» para conservar tus plantillas.
                </div>
              ) : (
                drafts.map(d => (
                  <div key={d.id} className="p-4 hover:bg-slate-50/80 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{d.subject || d.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{d.body || d.idea}</p>
                      <p className="text-[10.5px] text-slate-400 mt-1">Actualizado: {d.updatedAtDisplay}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadDraft(d)}
                        className="h-8 px-2.5 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(d.id)}
                        className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center cursor-pointer"
                        title="Eliminar borrador"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: Historial de envíos */}
          {activeSideTab === 'history' && (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Aún no se han enviado campañas masivas.
                </div>
              ) : (
                history.map(h => (
                  <div key={h.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <p className="text-xs font-bold text-slate-900 truncate">{h.subject || h.title}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Enviados: <strong className="text-emerald-700">{h.sentCount}</strong> / {h.totalRecipients}
                        {h.errorCount > 0 && (
                          <span className="text-red-600 font-semibold"> &middot; {h.errorCount} error(es)</span>
                        )}
                      </p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">
                        {h.sentAtDisplay} &middot; Por {h.sentBy}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de selección de destinatarios */}
      {recipientsModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
          onClick={() => setRecipientsModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users size={16} className="text-[#12435E]" />
                  Destinatarios ({selectedRecipients.length} / {recipients.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Correos válidos únicos (excluye automáticamente pendiente@pendiente).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecipientsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                  placeholder="Buscar cliente o correo..."
                  className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#12435E]"
                />
              </div>
              <button
                type="button"
                onClick={() => setExcludedEmails({})}
                className="h-8 px-2.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  recipients.forEach(r => {
                    all[r.email.toLowerCase()] = true;
                  });
                  setExcludedEmails(all);
                }}
                className="h-8 px-2.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Ninguno
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
              {filteredModalRecipients.map(r => {
                const key = r.email.toLowerCase();
                const checked = !excludedEmails[key];
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setExcludedEmails(prev => ({
                          ...prev,
                          [key]: checked,
                        }))
                      }
                      className="rounded border-slate-300 text-[#0B2737] focus:ring-[#0B2737]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{r.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setRecipientsModalOpen(false)}
                className="h-9 px-4 rounded-lg bg-[#0B2737] text-white text-xs font-semibold cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de envío */}
      {confirmSendOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmSendOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-900 text-base">Confirmar envío de correo</h3>
            </div>
            <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-600">
              <p>
                Estás a punto de enviar este correo a{' '}
                <strong className="text-slate-900">{selectedRecipients.length} clientes</strong> con correo válido.
              </p>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p>
                  <span className="text-slate-400 font-semibold">Tipo: </span>
                  <strong className="text-slate-800">
                    {TEMPLATE_TYPES.find(t => t.id === category)?.label}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-400 font-semibold">Asunto: </span>
                  <strong className="text-slate-900">{previewSubject}</strong>
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Cada correo se enviará personalizado con el nombre de cada cliente
                {category === 'estado_cuenta' ? ' y su enlace personal de estado de cuenta' : ''}.
              </p>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSendOpen(false)}
                className="h-9 px-4 rounded-lg font-semibold text-slate-700 bg-slate-200/70 hover:bg-slate-200 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMassSend}
                className="h-9 px-5 rounded-lg font-bold bg-[#0B2737] hover:bg-[#12435E] text-white text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={13} className="text-amber-400" />
                <span>Confirmar y Enviar ({selectedRecipients.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
