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
} from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';

type CampaignCategory = 'promocion' | 'aviso' | 'temporada' | 'informativo';
type CampaignImagePosition = 'top' | 'middle' | 'bottom';

type CampaignImage = {
  id: string;
  src: string;
  caption?: string;
  position: CampaignImagePosition;
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
  updatedAtIso: string;
  updatedAtDisplay: string;
};

type CampaignHistoryEntry = {
  id: string;
  sentAtIso: string;
  sentAtDisplay: string;
  title: string;
  subject: string;
  totalRecipients: number;
  sentCount: number;
  errorCount: number;
  sentBy: string;
  errors?: string[];
};

type Recipient = {
  id: string;
  name: string;
  email: string;
};

const CATEGORY_OPTIONS: Array<{ id: CampaignCategory; label: string; badge: string }> = [
  { id: 'promocion', label: 'Promoción / Descuento', badge: 'Promoción Especial' },
  { id: 'aviso', label: 'Aviso / Horario', badge: 'Aviso Importante' },
  { id: 'temporada', label: 'Temporada / Festivo', badge: 'Temporada JRS Cargo' },
  { id: 'informativo', label: 'Informativo / Novedad', badge: 'Novedades JRS Cargo' },
];

const DEFAULT_WHATSAPP_URL =
  'https://wa.me/50672601238?text=' + encodeURIComponent('Hola JRS Cargo, vi su campaña y deseo más información.');

function generateLocalDraftFromIdea(idea: string, category: CampaignCategory): {
  subject: string;
  preheader: string;
  badgeText: string;
  headline: string;
  body: string;
  highlights: string[];
  ctaText: string;
  ctaUrl: string;
} {
  const cleanIdea = idea.trim();
  const shortTitle =
    cleanIdea.length > 62 ? cleanIdea.slice(0, 59).trim() + '...' : cleanIdea || 'Novedades para tus envíos';

  if (category === 'promocion') {
    return {
      subject: `Aprovecha nuestra promoción: ${shortTitle} - JRS Cargo`,
      preheader: `${cleanIdea || 'Beneficio exclusivo para clientes de JRS Cargo'}.`,
      badgeText: 'Promoción Especial',
      headline: cleanIdea || 'Beneficio especial en tus próximos envíos',
      body: `En JRS Cargo queremos premiar tu confianza con una oportunidad especial pensada para ti:\n\n${cleanIdea || 'Aprovecha condiciones preferenciales en tus envíos aéreos y marítimos desde Estados Unidos hasta Costa Rica.'}\n\nSi deseas cotizar o coordinar tus compras, nuestro equipo está listo para ayudarte hoy mismo.`,
      highlights: [
        'Atención personalizada por WhatsApp y seguimiento de tus paquetes',
        'Envíos seguros desde Miami directo a nuestra bodega en Heredia',
        'Consulta tu estado de cuenta y tracking en línea en cualquier momento',
      ],
      ctaText: 'Aprovechar por WhatsApp',
      ctaUrl: DEFAULT_WHATSAPP_URL,
    };
  }

  if (category === 'aviso') {
    return {
      subject: `Aviso importante: ${shortTitle} - JRS Cargo`,
      preheader: `Información importante para tus paquetes y retiros en JRS Cargo.`,
      badgeText: 'Aviso Importante',
      headline: cleanIdea || 'Comunicado importante para nuestros clientes',
      body: `Te compartimos la siguiente actualización importante sobre nuestra operación en JRS Cargo:\n\n${cleanIdea || 'Por favor toma nota de esta información para planificar el envío y retiro de tus paquetes sin inconvenientes.'}\n\nAgradecemos tu comprensión y quedamos a tu disposición ante cualquier consulta.`,
      highlights: [
        'Revisa el estado de tus paquetes en tiempo real en nuestra web',
        'Nuestro equipo de soporte sigue disponible vía WhatsApp (+506 7260-1238)',
      ],
      ctaText: 'Consultar por WhatsApp',
      ctaUrl: DEFAULT_WHATSAPP_URL,
    };
  }

  if (category === 'temporada') {
    return {
      subject: `${shortTitle} - JRS Cargo`,
      preheader: `Planifica tus compras y envíos de temporada con JRS Cargo.`,
      badgeText: 'Temporada JRS Cargo',
      headline: cleanIdea || 'Prepara tus envíos de temporada con JRS Cargo',
      body: `Se acerca una temporada muy especial y en JRS Cargo queremos ayudarte a recibir todas tus compras a tiempo:\n\n${cleanIdea || 'Te recomendamos realizar tus pedidos con anticipación para asegurar una entrega rápida y sin contratiempos.'}\n\nCuenta con nosotros para traer tus paquetes con total seguridad.`,
      highlights: [
        'Salidas constantes y monitoreo de cada paquete desde Miami a Costa Rica',
        'Asesoría directa para compras en sitio web y consolidación',
        'Retiro ágil en San Pablo de Heredia o coordinación de entrega',
      ],
      ctaText: 'Coordinar mis envíos',
      ctaUrl: DEFAULT_WHATSAPP_URL,
    };
  }

  return {
    subject: `${shortTitle} - JRS Cargo`,
    preheader: `Conoce las novedades que tenemos preparadas para ti en JRS Cargo.`,
    badgeText: 'Novedades JRS Cargo',
    headline: cleanIdea || 'Novedades en JRS Cargo para tus envíos',
    body: `Queremos contarte las últimas novedades que hemos preparado para mejorar tu experiencia con JRS Cargo:\n\n${cleanIdea || 'Seguimos mejorando nuestros servicios para que importar tus compras sea cada vez más rápido y sencillo.'}\n\nGracias por confiar tus envíos a nuestro equipo.`,
    highlights: [
      'Seguimiento claro de todos tus paquetes y comprobantes',
      'Soporte directo por WhatsApp para cotizaciones y consultas',
    ],
    ctaText: 'Visitar JRS Cargo',
    ctaUrl: 'https://www.jrscargocr.com',
  };
}

function buildGeminiPrompt(idea: string, category: CampaignCategory): string {
  const catLabel = CATEGORY_OPTIONS.find(c => c.id === category)?.label || 'Promoción';
  return [
    'Actúa como redactor de marketing para JRS Cargo S.A. (empresa de courier y envíos de Estados Unidos a Costa Rica, ubicada en San Pablo de Heredia, WhatsApp +506 7260-1238, web www.jrscargocr.com).',
    `Tipo de campaña: ${catLabel}.`,
    `Idea principal: ${idea.trim() || '(escribe aquí tu idea)'}`,
    '',
    'Redacta un correo claro, cercano, profesional y persuasivo en español de Costa Rica. Usa EXACTAMENTE estas etiquetas para poder pegarlo en el sistema:',
    '',
    'ASUNTO: (máximo 65 caracteres, atractivo y directo)',
    'ETIQUETA: (2 o 3 palabras, ej: Promoción Especial)',
    'TITULAR: (título principal del banner del correo)',
    'MENSAJE: (2 o 3 párrafos cortos, sin incluir saludo "Hola" porque el sistema lo agrega automáticamente con el nombre de cada cliente)',
    'DESTACADOS:',
    '- Punto clave 1',
    '- Punto clave 2',
    '- Punto clave 3',
    'BOTON: (texto corto para el botón principal, ej: Cotizar por WhatsApp)',
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

  // Fallback: if user pasted plain text without labels, put it into body
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

export default function CampanasCorreoPage() {
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [history, setHistory] = useState<CampaignHistoryEntry[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [excludedEmails, setExcludedEmails] = useState<Record<string, boolean>>({});

  // Current editor state
  const [activeDraftId, setActiveDraftId] = useState<string>('');
  const [idea, setIdea] = useState('');
  const [category, setCategory] = useState<CampaignCategory>('promocion');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [badgeText, setBadgeText] = useState('Promoción Especial');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [highlightsText, setHighlightsText] = useState('');
  const [images, setImages] = useState<CampaignImage[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ctaText, setCtaText] = useState('Escribir por WhatsApp');
  const [ctaUrl, setCtaUrl] = useState(DEFAULT_WHATSAPP_URL);

  // Gemini web zero-token helper state
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [geminiPasteText, setGeminiPasteText] = useState('');

  // Actions & Modals
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('josegon2000@hotmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'preview' | 'drafts' | 'history'>('preview');

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

  const handleGenerateLocalDraft = () => {
    if (!idea.trim()) {
      showAlert('Escribe tu idea', 'Primero escribe una breve idea de campaña para generar el borrador.', 'error');
      return;
    }
    const generated = generateLocalDraftFromIdea(idea, category);
    setSubject(generated.subject);
    setPreheader(generated.preheader);
    setBadgeText(generated.badgeText);
    setHeadline(generated.headline);
    setBody(generated.body);
    setHighlightsText(generated.highlights.join('\n'));
    setCtaText(generated.ctaText);
    setCtaUrl(generated.ctaUrl);
    setActiveSideTab('preview');
  };

  const handleCopyPromptAndOpenGemini = async () => {
    const prompt = buildGeminiPrompt(idea, category);
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 3500);
    } catch {
      // Fallback: still open Gemini and show paste box
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
    showAlert('Borrador actualizado', 'Se aplicó la respuesta de Gemini a tu campaña. Revísala en la vista previa.', 'success');
  };

  const handleNewDraft = () => {
    setActiveDraftId('');
    setIdea('');
    setCategory('promocion');
    setSubject('');
    setPreheader('');
    setBadgeText('Promoción Especial');
    setHeadline('');
    setBody('');
    setHighlightsText('');
    setImages([]);
    setCtaText('Escribir por WhatsApp');
    setCtaUrl(DEFAULT_WHATSAPP_URL);
  };

  const handleLoadDraft = (d: CampaignDraft) => {
    setActiveDraftId(d.id);
    setIdea(d.idea || '');
    setCategory(d.category || 'promocion');
    setSubject(d.subject || '');
    setPreheader(d.preheader || '');
    setBadgeText(d.badgeText || 'JRS Cargo');
    setHeadline(d.headline || '');
    setBody(d.body || '');
    setHighlightsText((d.highlights || []).join('\n'));
    setImages(Array.isArray(d.images) ? d.images : []);
    setCtaText(d.ctaText || '');
    setCtaUrl(d.ctaUrl || DEFAULT_WHATSAPP_URL);
    setActiveSideTab('preview');
  };

  const handleUploadImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = Math.max(0, 4 - images.length);
    if (remainingSlots === 0) {
      showAlert('Límite alcanzado', 'Puedes incluir hasta 4 imágenes por campaña.', 'error');
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
      showAlert('Límite alcanzado', 'Puedes incluir hasta 4 imágenes por campaña.', 'error');
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
      showAlert('Borrador vacío', 'Agrega al menos un asunto o mensaje antes de guardar el borrador.', 'error');
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
          title: subject.trim() || headline.trim() || 'Borrador de campaña',
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
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.draft?.id) setActiveDraftId(data.draft.id);
        if (Array.isArray(data.data?.drafts)) setDrafts(data.data.drafts);
        showAlert('Borrador guardado', 'Tu borrador de campaña quedó guardado correctamente.', 'success');
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
    if (!subject.trim() || !body.trim()) {
      showAlert('Faltan datos', 'Completa el asunto y el mensaje antes de enviar una prueba.', 'error');
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
          subject,
          preheader,
          badgeText,
          headline: headline || subject,
          body,
          highlights: highlightsArray,
          images,
          ctaText,
          ctaUrl,
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
    if (!subject.trim() || !body.trim()) {
      showAlert('Faltan datos', 'Completa el asunto y el mensaje de la campaña.', 'error');
      return;
    }
    if (selectedRecipients.length === 0) {
      showAlert('Sin destinatarios', 'Selecciona al menos un cliente con correo válido.', 'error');
      return;
    }

    setConfirmSendOpen(false);
    const total = selectedRecipients.length;
    setSendingProgress({ active: true, total, processed: 0, sent: 0, errors: 0 });

    const CHUNK_SIZE = 10;
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
            recipients: chunk.map(r => ({ email: r.email, name: r.name })),
            subject,
            preheader,
            badgeText,
            headline: headline || subject,
            body,
            highlights: highlightsArray,
            images,
            ctaText,
            ctaUrl,
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

    // Record campaign in persistent history
    try {
      const recRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_campaign',
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
      'Campaña finalizada',
      `Se enviaron ${totalSent} de ${total} correos${totalErrors > 0 ? ` (${totalErrors} con error)` : ''}.`,
      totalErrors > 0 ? 'error' : 'success'
    );
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campañas de Correo</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B2737] text-amber-400">
              <ShieldCheck size={12} />
              Solo Master
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              0 costo de tokens
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Crea borradores con tu idea de campaña (generador local o usando Gemini Web gratis), revisa la vista previa y envíala a todos tus clientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNewDraft}
            className="h-9 px-3 rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Nueva campaña</span>
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
              if (!subject.trim() || !body.trim()) {
                showAlert('Completa el borrador', 'Agrega un asunto y mensaje antes de enviar la campaña.', 'error');
                return;
              }
              setConfirmSendOpen(true);
            }}
            disabled={!!sendingProgress?.active || selectedRecipients.length === 0}
            className="h-9 px-4 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
              Enviando campaña a clientes... ({sendingProgress.processed} / {sendingProgress.total})
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

      {/* PASO 1: Idea de campaña + Gemini Web (0 costo de tokens) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              1. Idea de campaña (sin consumo de tokens)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escribe tu idea. Podés generar un borrador al instante aquí mismo o copiar el prompt estructurado para usar tu cuenta gratuita de Gemini Web y pegar la respuesta.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setCategory(opt.id);
                  setBadgeText(opt.badge);
                }}
                className={`h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  category === opt.id
                    ? 'bg-[#0B2737] text-white border-[#0B2737]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={2}
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="Ej: Promoción de Black Friday con 15% de descuento en envíos aéreos para paquetes recibidos hasta el 30 de noviembre..."
          className="w-full p-3 bg-slate-50/60 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#12435E] focus:ring-2 focus:ring-[#12435E]/10 resize-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateLocalDraft}
            className="h-9 px-3.5 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText size={14} className="text-amber-400" />
            <span>Crear borrador al instante (local)</span>
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
                Pega aquí el texto que generó Gemini Web (detecta automáticamente Asunto, Titular, Mensaje, Destacados y Botón):
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
              rows={5}
              value={geminiPasteText}
              onChange={e => setGeminiPasteText(e.target.value)}
              placeholder="ASUNTO: ...&#10;TITULAR: ...&#10;MENSAJE: ...&#10;DESTACADOS:&#10;- ...&#10;BOTON: ..."
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

      {/* PASO 2: Editor + Vista previa / Borradores / Historial */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Columna izquierda: Editor del borrador */}
        <div className="xl:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail size={16} className="text-[#12435E]" />
              2. Editor del borrador
            </h2>
            {activeDraftId && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                Editando borrador guardado
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
                placeholder="Ej: 15% de descuento en tus envíos aéreos - JRS Cargo"
                className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#12435E] focus:ring-2 focus:ring-[#12435E]/10"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Etiqueta superior
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={e => setBadgeText(e.target.value)}
                placeholder="Promoción Especial"
                className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#12435E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Titular principal (banner azul)
            </label>
            <input
              type="text"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="Ej: ¡Aprovecha tarifas especiales esta semana!"
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#12435E]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Mensaje principal *
              </label>
              <span className="text-[11px] text-slate-400">
                El saludo «Hola [Nombre],» se personaliza automáticamente
              </span>
            </div>
            <textarea
              rows={6}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Escribe aquí el contenido de tu campaña. Separa los párrafos con una línea en blanco..."
              className="w-full p-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-[#12435E] focus:ring-2 focus:ring-[#12435E]/10"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Puntos destacados (opcional, uno por línea)
            </label>
            <textarea
              rows={3}
              value={highlightsText}
              onChange={e => setHighlightsText(e.target.value)}
              placeholder="Envíos seguros desde Miami a Heredia&#10;Atención personalizada por WhatsApp&#10;Seguimiento en línea 24/7"
              className="w-full p-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-[#12435E]"
            />
          </div>

          {/* Imágenes dentro del correo */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold text-[#0B2737] uppercase tracking-wider flex items-center gap-1.5">
                  <ImagePlus size={14} className="text-amber-500" />
                  Imágenes dentro del correo ({images.length}/4)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Se incrustan directo en el correo (compatibles con Gmail, Hotmail y celulares).
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
                  placeholder="https://ejemplo.com/banner-promocion.jpg"
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
                          { id: 'top' as CampaignImagePosition, label: 'Arriba (Banner)' },
                          { id: 'middle' as CampaignImagePosition, label: 'Dentro del cuerpo' },
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
                        placeholder="Pie de foto opcional (ej: Válido del 24 al 30 de noviembre)"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Texto del botón (CTA)
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                placeholder="Ej: Escribir por WhatsApp"
                className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#12435E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Enlace del botón
              </label>
              <input
                type="url"
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://wa.me/50672601238"
                className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#12435E]"
              />
            </div>
          </div>

          {/* Envío de prueba rápido */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Probar correo antes de enviar a todos
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
                disabled={isSendingTest}
                className="h-9 px-4 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Enviando prueba...</span>
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

        {/* Columna derecha: Vista previa en vivo / Borradores guardados / Historial */}
        <div className="xl:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-2">
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
                <span>Enviadas ({history.length})</span>
              </button>
            </div>
          </div>

          {/* TAB: Vista previa */}
          {activeSideTab === 'preview' && (
            <div className="p-4 sm:p-5 bg-slate-100/80">
              <div className="mb-3 px-3 py-2 bg-white rounded-lg border border-slate-200/80 text-xs">
                <span className="text-slate-400 font-semibold">Asunto: </span>
                <span className="font-bold text-slate-900">{subject || '(Sin asunto aún)'}</span>
              </div>

              <div className="max-w-[540px] mx-auto bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Franja tricolor del logo JRS Cargo */}
                <div className="flex h-1.5 w-full">
                  <div className="w-[55%] bg-[#0B2737]" />
                  <div className="w-[25%] bg-[#F59E0B]" />
                  <div className="w-[20%] bg-[#EF4444]" />
                </div>

                {/* Banner Hero */}
                <div className="px-6 py-6 bg-gradient-to-br from-[#0B2737] to-[#12435E] text-white">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-block bg-white px-2.5 py-1.5 rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="JRS Cargo" className="h-7 w-auto block" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/45 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                      {badgeText || 'JRS Cargo'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-extrabold leading-snug text-white">
                    {headline || subject || 'Titular de tu campaña'}
                  </h3>
                  <div className="mt-2.5 w-12 h-1 rounded-full bg-amber-400" />
                </div>

                {/* Cuerpo */}
                <div className="p-6 text-slate-700 space-y-3.5">
                  {/* Imágenes arriba (Banner) */}
                  {images
                    .filter(i => i.position === 'top')
                    .map(img => (
                      <div key={img.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt={img.caption || 'Banner'} className="w-full h-auto block" />
                        {img.caption && (
                          <p className="px-3 py-2 text-[11px] text-slate-600 text-center bg-slate-50 border-t border-slate-200 font-medium">
                            {img.caption}
                          </p>
                        )}
                      </div>
                    ))}

                  <p className="text-[15px] font-extrabold text-[#0B2737]">Hola José,</p>

                  {(() => {
                    const paragraphs = body
                      ? body.split(/\n{2,}/).filter(Boolean)
                      : [];
                    const midImages = images.filter(i => i.position === 'middle');

                    if (paragraphs.length === 0) {
                      return (
                        <>
                          <p className="text-xs text-slate-400 italic">
                            Escribe tu mensaje o genera un borrador en el paso 1 para ver la vista previa aquí.
                          </p>
                          {midImages.map(img => (
                            <div key={img.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.src} alt={img.caption || 'Imagen'} className="w-full h-auto block" />
                              {img.caption && (
                                <p className="px-3 py-2 text-[11px] text-slate-600 text-center bg-slate-50 border-t border-slate-200 font-medium">
                                  {img.caption}
                                </p>
                              )}
                            </div>
                          ))}
                        </>
                      );
                    }

                    return (
                      <>
                        <p className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">
                          {paragraphs[0].replace(/\{\{\s*nombre\s*\}\}/gi, 'José')}
                        </p>
                        {midImages.map(img => (
                          <div key={img.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 my-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.src} alt={img.caption || 'Imagen'} className="w-full h-auto block" />
                            {img.caption && (
                              <p className="px-3 py-2 text-[11px] text-slate-600 text-center bg-slate-50 border-t border-slate-200 font-medium">
                                {img.caption}
                              </p>
                            )}
                          </div>
                        ))}
                        {paragraphs.slice(1).map((p, idx) => (
                          <p key={idx} className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">
                            {p.replace(/\{\{\s*nombre\s*\}\}/gi, 'José')}
                          </p>
                        ))}
                      </>
                    );
                  })()}

                  {highlightsArray.length > 0 && (
                    <div className="my-3 p-4 rounded-xl bg-slate-50 border border-slate-200 border-t-[3px] border-t-amber-500">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#0B2737] mb-2">
                        Lo que debes saber
                      </p>
                      <ul className="space-y-1.5">
                        {highlightsArray.map((item, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                              ✓
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Imágenes al final */}
                  {images
                    .filter(i => i.position === 'bottom')
                    .map(img => (
                      <div key={img.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt={img.caption || 'Imagen'} className="w-full h-auto block" />
                        {img.caption && (
                          <p className="px-3 py-2 text-[11px] text-slate-600 text-center bg-slate-50 border-t border-slate-200 font-medium">
                            {img.caption}
                          </p>
                        )}
                      </div>
                    ))}

                  {ctaText.trim() && ctaUrl.trim() && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-[#0B2737] to-[#12435E] text-center space-y-2.5">
                      <p className="text-xs text-slate-200">
                        ¿Listo para coordinar tus envíos o recibir asesoría personalizada?
                      </p>
                      <span className="inline-block px-6 py-2.5 rounded-lg bg-[#F59E0B] text-[#0B2737] text-xs font-extrabold">
                        {ctaText} →
                      </span>
                    </div>
                  )}

                  {/* Franja de confianza JRS Cargo */}
                  <div className="grid grid-cols-3 rounded-lg bg-slate-50 border border-slate-200 divide-x divide-slate-200 text-center py-2.5">
                    <div className="px-1">
                      <p className="text-[10px] font-extrabold text-[#0B2737] uppercase">Miami → CR</p>
                      <p className="text-[10px] text-slate-500">Aéreo y Marítimo</p>
                    </div>
                    <div className="px-1">
                      <p className="text-[10px] font-extrabold text-[#12435E] uppercase">Tracking 24/7</p>
                      <p className="text-[10px] text-slate-500">En línea</p>
                    </div>
                    <div className="px-1">
                      <p className="text-[10px] font-extrabold text-[#EF4444] uppercase">Soporte</p>
                      <p className="text-[10px] text-slate-500">7260-1238</p>
                    </div>
                  </div>
                </div>

                <div className="py-4 px-5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
                  <p className="font-extrabold text-[#0B2737]">JRS CARGO S.A.</p>
                  <p>San Pablo de Heredia, Costa Rica &middot; +506 7260-1238 &middot; www.jrscargocr.com</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Borradores guardados */}
          {activeSideTab === 'drafts' && (
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Cargando borradores...</div>
              ) : drafts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay borradores guardados todavía. Usa «Guardar borrador» para conservar tus campañas.
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

          {/* TAB: Historial de campañas enviadas */}
          {activeSideTab === 'history' && (
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
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
                  Destinatarios de la campaña ({selectedRecipients.length} / {recipients.length})
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

      {/* Modal de confirmación de envío masivo */}
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
              <h3 className="font-bold text-slate-900 text-base">Confirmar envío de campaña</h3>
            </div>
            <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-600">
              <p>
                Estás a punto de enviar esta campaña a{' '}
                <strong className="text-slate-900">{selectedRecipients.length} clientes</strong> con correo válido.
              </p>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="text-slate-400 font-semibold">Asunto:</p>
                <p className="font-bold text-slate-900 mt-0.5">{subject}</p>
              </div>
              <p className="text-xs text-slate-500">
                Cada correo se enviará personalizado con el nombre del cliente.
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
