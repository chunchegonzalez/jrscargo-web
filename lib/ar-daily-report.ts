import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { getClients, getInvoices, getStoredExchangeRate, getHeaders } from './supabase';
import { getInvoiceStats, isCompraSitioWebInvoice, formatCostaRicaDateTime, formatCostaRicaISO } from './billing';
import { createZip, escapeXml, getColLetter } from './excel-export';

export const AR_DAILY_REPORT_ROW_ID = '__JRS_AR_DAILY_REPORT_STATE__';
export const DEFAULT_AR_REPORT_EMAIL = 'jose.gonzalez@jrscargocr.com';

export interface ARPendingInvoiceDetail {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  totalUsd: number;
  paidUsd: number;
  pendingUsd: number;
  pendingCrc: number;
  status: string;
  isWebPurchase: boolean;
}

export interface ARClientReportRow {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  pendingInvoicesCount: number;
  totalBilledUsd: number;
  totalPaidUsd: number;
  totalPendingUsd: number;
  totalPendingCrc: number;
  invoices: ARPendingInvoiceDetail[];
}

export interface ARReportSnapshot {
  generatedAtIso: string;
  generatedAtDisplay: string;
  reportDateCr: string;
  exchangeRate: number;
  excludeWebPurchases: boolean;
  totalPendingUsd: number;
  totalPendingCrc: number;
  totalClientsCount: number;
  totalPendingInvoicesCount: number;
  excludedWebCount: number;
  excludedWebBalanceUsd: number;
  clients: ARClientReportRow[];
  allPendingInvoices: Array<ARPendingInvoiceDetail & { clientName: string; clientEmail: string }>;
}

export interface ARDailyReportHistoryEntry {
  id: string;
  sentAtIso: string;
  sentAtDisplay: string;
  reportDateCr: string;
  recipientEmail: string;
  ccEmail?: string;
  trigger: 'manual' | 'auto_daily' | 'cron';
  status: 'sent' | 'error';
  totalPendingUsd: number;
  totalPendingCrc: number;
  clientsCount: number;
  invoicesCount: number;
  exchangeRate: number;
  excludeWebPurchases: boolean;
  errorMessage?: string;
}

export interface ARDailyReportConfigState {
  enabled: boolean;
  recipientEmail: string;
  ccEmail: string;
  sendTimeCr: string; // HH:mm in Costa Rica time, e.g. "08:00"
  excludeWebPurchases: boolean;
  lastAutoSentDateCr: string | null;
  lastSentAtIso: string | null;
  history: ARDailyReportHistoryEntry[];
}

const DEFAULT_CONFIG_STATE: ARDailyReportConfigState = {
  enabled: true,
  recipientEmail: DEFAULT_AR_REPORT_EMAIL,
  ccEmail: '',
  sendTimeCr: '07:00',
  excludeWebPurchases: true,
  lastAutoSentDateCr: null,
  lastSentAtIso: null,
  history: [],
};

export async function loadARDailyReportState(): Promise<ARDailyReportConfigState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return { ...DEFAULT_CONFIG_STATE };

  try {
    const res = await fetch(
      `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(AR_DAILY_REPORT_ROW_ID)}&limit=1`,
      {
        headers: getHeaders(),
        cache: 'no-store',
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const rawHistory = rows[0]?.history;
        const container = Array.isArray(rawHistory) ? rawHistory[0] : rawHistory;
        if (container && typeof container === 'object') {
          return {
            enabled: container.enabled !== undefined ? Boolean(container.enabled) : DEFAULT_CONFIG_STATE.enabled,
            recipientEmail:
              typeof container.recipientEmail === 'string' && container.recipientEmail.trim()
                ? container.recipientEmail.trim()
                : DEFAULT_AR_REPORT_EMAIL,
            ccEmail: typeof container.ccEmail === 'string' ? container.ccEmail.trim() : '',
            sendTimeCr:
              typeof container.sendTimeCr === 'string' && /^\d{2}:\d{2}$/.test(container.sendTimeCr)
                ? container.sendTimeCr
                : '07:00',
            excludeWebPurchases:
              container.excludeWebPurchases !== undefined ? Boolean(container.excludeWebPurchases) : true,
            lastAutoSentDateCr: container.lastAutoSentDateCr || null,
            lastSentAtIso: container.lastSentAtIso || null,
            history: Array.isArray(container.history) ? container.history : [],
          };
        }
      }
    }
  } catch (err) {
    console.error('Error loading AR daily report state:', err);
  }

  return { ...DEFAULT_CONFIG_STATE };
}

export async function saveARDailyReportState(state: ARDailyReportConfigState): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return;

  const payload = {
    id: AR_DAILY_REPORT_ROW_ID,
    client: 'SYSTEM_AR_DAILY_REPORT_CONFIG',
    company: 'JRS CARGO',
    weight: '0 lbs',
    status: 'Eliminado',
    history: [
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        enabled: state.enabled,
        recipientEmail: state.recipientEmail || DEFAULT_AR_REPORT_EMAIL,
        ccEmail: state.ccEmail || '',
        sendTimeCr: state.sendTimeCr || '07:00',
        excludeWebPurchases: state.excludeWebPurchases,
        lastAutoSentDateCr: state.lastAutoSentDateCr,
        lastSentAtIso: state.lastSentAtIso,
        history: (state.history || []).slice(0, 120),
      },
    ],
  };

  const checkRes = await fetch(
    `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(AR_DAILY_REPORT_ROW_ID)}&select=id`,
    {
      headers: getHeaders(),
      cache: 'no-store',
    }
  );
  const existing = checkRes.ok ? await checkRes.json() : [];

  if (Array.isArray(existing) && existing.length > 0) {
    await fetch(`${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(AR_DAILY_REPORT_ROW_ID)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        status: 'Eliminado',
        history: payload.history,
      }),
    });
  } else {
    await fetch(`${url}/rest/v1/local_inventory`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
  }
}

export async function buildAccountsReceivableSnapshot(opts?: {
  excludeWebPurchases?: boolean;
}): Promise<ARReportSnapshot> {
  const excludeWeb = opts?.excludeWebPurchases !== undefined ? opts.excludeWebPurchases : true;

  const [rawClients, rawInvoices, exchangeRate] = await Promise.all([
    getClients(),
    getInvoices({ includeItems: true }),
    getStoredExchangeRate(),
  ]);

  const clientsMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      phone: string;
      invoices: ARPendingInvoiceDetail[];
      totalBilledUsd: number;
      totalPaidUsd: number;
      totalPendingUsd: number;
    }
  >();

  for (const c of rawClients || []) {
    clientsMap.set(String(c.id), {
      id: String(c.id),
      name: String(c.name || 'Cliente'),
      email: String(c.email || ''),
      phone: String(c.phone || ''),
      invoices: [],
      totalBilledUsd: 0,
      totalPaidUsd: 0,
      totalPendingUsd: 0,
    });
  }

  let totalPendingUsd = 0;
  let totalPendingInvoicesCount = 0;
  let excludedWebCount = 0;
  let excludedWebBalanceUsd = 0;
  const allPendingInvoices: Array<ARPendingInvoiceDetail & { clientName: string; clientEmail: string }> = [];

  for (const inv of rawInvoices || []) {
    const clientId = String(inv.client_id || inv.clients?.id || '');
    if (!clientId) continue;

    if (!clientsMap.has(clientId)) {
      clientsMap.set(clientId, {
        id: clientId,
        name: String(inv.clients?.name || 'Cliente'),
        email: String(inv.clients?.email || ''),
        phone: String(inv.clients?.phone || ''),
        invoices: [],
        totalBilledUsd: 0,
        totalPaidUsd: 0,
        totalPendingUsd: 0,
      });
    }

    const stats = getInvoiceStats(inv);
    if (stats.pending <= 0.005) continue;

    const isWeb = isCompraSitioWebInvoice(inv);
    if (isWeb) {
      excludedWebCount += 1;
      excludedWebBalanceUsd += stats.pending;
      if (excludeWeb) continue;
    }

    const clientEntry = clientsMap.get(clientId)!;
    const totalVal = Number(inv.total) || 0;
    const detail: ARPendingInvoiceDetail = {
      id: String(inv.id),
      invoiceNumber: String(inv.invoice_number || 'S/N'),
      issueDate: String(inv.issue_date || inv.created_at || '').split('T')[0],
      totalUsd: totalVal,
      paidUsd: stats.paid,
      pendingUsd: stats.pending,
      pendingCrc: Math.round(stats.pending * exchangeRate),
      status: stats.displayStatus,
      isWebPurchase: isWeb,
    };

    clientEntry.invoices.push(detail);
    clientEntry.totalBilledUsd += totalVal;
    clientEntry.totalPaidUsd += stats.paid;
    clientEntry.totalPendingUsd += stats.pending;

    totalPendingUsd += stats.pending;
    totalPendingInvoicesCount += 1;

    allPendingInvoices.push({
      ...detail,
      clientName: clientEntry.name,
      clientEmail: clientEntry.email,
    });
  }

  const activeClients: ARClientReportRow[] = Array.from(clientsMap.values())
    .filter(c => c.totalPendingUsd > 0.005)
    .sort((a, b) => b.totalPendingUsd - a.totalPendingUsd)
    .map(c => ({
      clientId: c.id,
      clientName: c.name,
      clientEmail: c.email,
      clientPhone: c.phone,
      pendingInvoicesCount: c.invoices.length,
      totalBilledUsd: Number(c.totalBilledUsd.toFixed(2)),
      totalPaidUsd: Number(c.totalPaidUsd.toFixed(2)),
      totalPendingUsd: Number(c.totalPendingUsd.toFixed(2)),
      totalPendingCrc: Math.round(c.totalPendingUsd * exchangeRate),
      invoices: c.invoices.sort((x, y) => y.pendingUsd - x.pendingUsd),
    }));

  allPendingInvoices.sort((a, b) => b.pendingUsd - a.pendingUsd);

  const now = new Date();
  return {
    generatedAtIso: now.toISOString(),
    generatedAtDisplay: formatCostaRicaDateTime(now),
    reportDateCr: formatCostaRicaISO(now),
    exchangeRate,
    excludeWebPurchases: excludeWeb,
    totalPendingUsd: Number(totalPendingUsd.toFixed(2)),
    totalPendingCrc: Math.round(totalPendingUsd * exchangeRate),
    totalClientsCount: activeClients.length,
    totalPendingInvoicesCount,
    excludedWebCount,
    excludedWebBalanceUsd: Number(excludedWebBalanceUsd.toFixed(2)),
    clients: activeClients,
    allPendingInvoices,
  };
}

/**
 * Genera el archivo Microsoft Excel (.xlsx) en Buffer con 2 hojas:
 * Hoja 1: Resumen por Cliente
 * Hoja 2: Detalle de Facturas Pendientes
 */
export function generateAccountsReceivableXlsxBuffer(snapshot: ARReportSnapshot): Buffer {
  const encoder = new TextEncoder();

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Resumen por Cliente" sheetId="1" r:id="rId1"/>
    <sheet name="Facturas Pendientes" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/>
    <numFmt numFmtId="165" formatCode="&quot;CRC &quot;#,##0"/>
  </numFmts>
  <fonts count="6">
    <font><name val="Calibri"/><sz val="10"/><color rgb="FF0F172A"/></font>
    <font><b/><name val="Calibri"/><sz val="10"/><color rgb="FFFFFFFF"/></font>
    <font><b/><name val="Calibri"/><sz val="15"/><color rgb="FF0B2737"/></font>
    <font><b/><name val="Calibri"/><sz val="10"/><color rgb="FF0F172A"/></font>
    <font><b/><name val="Calibri"/><sz val="10"/><color rgb="FFB45309"/></font>
    <font><name val="Calibri"/><sz val="9"/><color rgb="FF475569"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B2737"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FF0F172A"/></top>
      <bottom style="double"><color rgb="FF0F172A"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="9">
    <!-- 0: Texto normal izquierda -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 1: Header Navy -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 2: Título -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 3: Centrado normal -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 4: Moneda USD normal -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 5: Moneda USD Pendiente Destacado -->
    <xf numFmtId="164" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 6: Moneda CRC -->
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 7: Fila Total Texto -->
    <xf numFmtId="0" fontId="3" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 8: Fila Total USD -->
    <xf numFmtId="164" fontId="3" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;

  // ================= HOJA 1: RESUMEN POR CLIENTE =================
  let r1 = 1;
  const rows1: string[] = [];

  rows1.push(`
    <row r="${r1}" ht="26" customHeight="1">
      <c r="A${r1}" t="inlineStr" s="2"><is><t>JRS CARGO S.A. — REPORTE DIARIO DE CUENTAS POR COBRAR</t></is></c>
    </row>
  `);
  r1++;

  const filterNote = snapshot.excludeWebPurchases
    ? 'Excluyendo Compra en Sitio Web'
    : 'Incluyendo Compra en Sitio Web';
  rows1.push(`
    <row r="${r1}" ht="18" customHeight="1">
      <c r="A${r1}" t="inlineStr" s="0"><is><t>Generado: ${escapeXml(snapshot.generatedAtDisplay)} | Clientes con saldo: ${snapshot.totalClientsCount} | Facturas pendientes: ${snapshot.totalPendingInvoicesCount} | T.C.: CRC ${snapshot.exchangeRate} | Filtro: ${filterNote}</t></is></c>
    </row>
  `);
  r1 += 2;

  const headers1 = [
    '#',
    'Cliente',
    'Correo Electrónico',
    'Teléfono',
    'Facturas Pendientes',
    'Total Facturado (USD)',
    'Total Abonado (USD)',
    'Saldo Pendiente (USD)',
    'Equivalente (CRC)',
    'Detalle Facturas',
  ];
  const headerCells1 = headers1
    .map((h, i) => `<c r="${getColLetter(i + 1)}${r1}" t="inlineStr" s="1"><is><t>${escapeXml(h)}</t></is></c>`)
    .join('');
  rows1.push(`<row r="${r1}" ht="26" customHeight="1">${headerCells1}</row>`);
  r1++;

  let sumBilled = 0;
  let sumPaid = 0;

  snapshot.clients.forEach((client, idx) => {
    sumBilled += client.totalBilledUsd;
    sumPaid += client.totalPaidUsd;
    const invListStr = client.invoices.map(i => `${i.invoiceNumber} ($${i.pendingUsd.toFixed(2)})`).join(', ');

    rows1.push(`
      <row r="${r1}" ht="21" customHeight="1">
        <c r="A${r1}" t="n" s="3"><v>${idx + 1}</v></c>
        <c r="B${r1}" t="inlineStr" s="0"><is><t>${escapeXml(client.clientName)}</t></is></c>
        <c r="C${r1}" t="inlineStr" s="0"><is><t>${escapeXml(client.clientEmail || 'Sin correo')}</t></is></c>
        <c r="D${r1}" t="inlineStr" s="3"><is><t>${escapeXml(client.clientPhone || '—')}</t></is></c>
        <c r="E${r1}" t="n" s="3"><v>${client.pendingInvoicesCount}</v></c>
        <c r="F${r1}" t="n" s="4"><v>${client.totalBilledUsd.toFixed(2)}</v></c>
        <c r="G${r1}" t="n" s="4"><v>${client.totalPaidUsd.toFixed(2)}</v></c>
        <c r="H${r1}" t="n" s="5"><v>${client.totalPendingUsd.toFixed(2)}</v></c>
        <c r="I${r1}" t="n" s="6"><v>${client.totalPendingCrc}</v></c>
        <c r="J${r1}" t="inlineStr" s="0"><is><t>${escapeXml(invListStr)}</t></is></c>
      </row>
    `);
    r1++;
  });

  rows1.push(`
    <row r="${r1}" ht="24" customHeight="1">
      <c r="A${r1}" t="inlineStr" s="7"><is><t></t></is></c>
      <c r="B${r1}" t="inlineStr" s="7"><is><t>TOTAL GENERAL POR COBRAR</t></is></c>
      <c r="C${r1}" t="inlineStr" s="7"><is><t></t></is></c>
      <c r="D${r1}" t="inlineStr" s="7"><is><t></t></is></c>
      <c r="E${r1}" t="n" s="7"><v>${snapshot.totalPendingInvoicesCount}</v></c>
      <c r="F${r1}" t="n" s="8"><v>${sumBilled.toFixed(2)}</v></c>
      <c r="G${r1}" t="n" s="8"><v>${sumPaid.toFixed(2)}</v></c>
      <c r="H${r1}" t="n" s="8"><v>${snapshot.totalPendingUsd.toFixed(2)}</v></c>
      <c r="I${r1}" t="n" s="6"><v>${snapshot.totalPendingCrc}</v></c>
      <c r="J${r1}" t="inlineStr" s="7"><is><t></t></is></c>
    </row>
  `);

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="30" customWidth="1"/>
    <col min="3" max="3" width="30" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
    <col min="5" max="5" width="18" customWidth="1"/>
    <col min="6" max="6" width="20" customWidth="1"/>
    <col min="7" max="7" width="20" customWidth="1"/>
    <col min="8" max="8" width="22" customWidth="1"/>
    <col min="9" max="9" width="20" customWidth="1"/>
    <col min="10" max="10" width="46" customWidth="1"/>
  </cols>
  <sheetData>
    ${rows1.join('')}
  </sheetData>
</worksheet>`;

  // ================= HOJA 2: DETALLE DE FACTURAS PENDIENTES =================
  let r2 = 1;
  const rows2: string[] = [];

  rows2.push(`
    <row r="${r2}" ht="26" customHeight="1">
      <c r="A${r2}" t="inlineStr" s="2"><is><t>JRS CARGO S.A. — DETALLE DE FACTURAS PENDIENTES DE PAGO</t></is></c>
    </row>
  `);
  r2 += 2;

  const headers2 = [
    '#',
    'N.º Factura',
    'Fecha Emisión',
    'Cliente',
    'Correo Cliente',
    'Estado',
    'Total Factura (USD)',
    'Abonado (USD)',
    'Saldo Pendiente (USD)',
    'Equivalente (CRC)',
  ];
  const headerCells2 = headers2
    .map((h, i) => `<c r="${getColLetter(i + 1)}${r2}" t="inlineStr" s="1"><is><t>${escapeXml(h)}</t></is></c>`)
    .join('');
  rows2.push(`<row r="${r2}" ht="26" customHeight="1">${headerCells2}</row>`);
  r2++;

  snapshot.allPendingInvoices.forEach((inv, idx) => {
    rows2.push(`
      <row r="${r2}" ht="20" customHeight="1">
        <c r="A${r2}" t="n" s="3"><v>${idx + 1}</v></c>
        <c r="B${r2}" t="inlineStr" s="3"><is><t>${escapeXml(inv.invoiceNumber)}</t></is></c>
        <c r="C${r2}" t="inlineStr" s="3"><is><t>${escapeXml(inv.issueDate)}</t></is></c>
        <c r="D${r2}" t="inlineStr" s="0"><is><t>${escapeXml(inv.clientName)}</t></is></c>
        <c r="E${r2}" t="inlineStr" s="0"><is><t>${escapeXml(inv.clientEmail || 'Sin correo')}</t></is></c>
        <c r="F${r2}" t="inlineStr" s="3"><is><t>${escapeXml(inv.status)}</t></is></c>
        <c r="G${r2}" t="n" s="4"><v>${inv.totalUsd.toFixed(2)}</v></c>
        <c r="H${r2}" t="n" s="4"><v>${inv.paidUsd.toFixed(2)}</v></c>
        <c r="I${r2}" t="n" s="5"><v>${inv.pendingUsd.toFixed(2)}</v></c>
        <c r="J${r2}" t="n" s="6"><v>${inv.pendingCrc}</v></c>
      </row>
    `);
    r2++;
  });

  const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="16" customWidth="1"/>
    <col min="3" max="3" width="16" customWidth="1"/>
    <col min="4" max="4" width="30" customWidth="1"/>
    <col min="5" max="5" width="30" customWidth="1"/>
    <col min="6" max="6" width="18" customWidth="1"/>
    <col min="7" max="7" width="20" customWidth="1"/>
    <col min="8" max="8" width="18" customWidth="1"/>
    <col min="9" max="9" width="22" customWidth="1"/>
    <col min="10" max="10" width="20" customWidth="1"/>
  </cols>
  <sheetData>
    ${rows2.join('')}
  </sheetData>
</worksheet>`;

  const zipBytes = createZip([
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(relsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheet1Xml) },
    { name: 'xl/worksheets/sheet2.xml', data: encoder.encode(sheet2Xml) },
  ]);

  return Buffer.from(zipBytes);
}

function cleanPdfText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/₡/g, 'CRC ')
    .replace(/°/g, '.')
    .replace(/•/g, '-')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

let cachedPdfLogoBytes: Buffer | null = null;

/**
 * Genera el archivo PDF ejecutivo multi-página con el Reporte Diario de Cuentas por Cobrar.
 */
export async function generateAccountsReceivablePdfBuffer(snapshot: ARReportSnapshot): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const brandNavy = rgb(0.043, 0.153, 0.216); // #0B2737
  const brandBlue = rgb(0.07, 0.26, 0.37); // #12435E
  const textDark = rgb(0.09, 0.11, 0.15);
  const textGray = rgb(0.39, 0.45, 0.54);
  const borderGray = rgb(0.88, 0.91, 0.94);
  const bgRowAlt = rgb(0.97, 0.98, 0.99);
  const amberDark = rgb(0.71, 0.33, 0.04);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const margin = 38;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - margin;

  // Logo
  try {
    if (!cachedPdfLogoBytes) {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        cachedPdfLogoBytes = fs.readFileSync(logoPath);
      }
    }
    if (cachedPdfLogoBytes) {
      const logoImg = await pdfDoc.embedPng(cachedPdfLogoBytes);
      const targetH = 46;
      const scale = targetH / logoImg.height;
      const targetW = logoImg.width * scale;
      page.drawImage(logoImg, {
        x: PAGE_W - margin - targetW,
        y: y - targetH + 6,
        width: targetW,
        height: targetH,
      });
    }
  } catch {
    // Ignore logo error
  }

  // Header
  page.drawText('REPORTE DIARIO DE CUENTAS POR COBRAR', {
    x: margin,
    y: y - 10,
    size: 16,
    font: fontBold,
    color: brandNavy,
  });

  page.drawText('JRS CARGO S.A.  |  Cartera Activa de Clientes', {
    x: margin,
    y: y - 27,
    size: 10,
    font: fontBold,
    color: brandBlue,
  });

  page.drawText(
    cleanPdfText(
      `Fecha de corte: ${snapshot.generatedAtDisplay}   |   T.C. Referencia: CRC ${snapshot.exchangeRate}   |   ${
        snapshot.excludeWebPurchases ? 'Excluye Compra en Sitio Web' : 'Incluye Compra en Sitio Web'
      }`
    ),
    {
      x: margin,
      y: y - 41,
      size: 8.5,
      font: fontRegular,
      color: textGray,
    }
  );

  y -= 56;
  page.drawLine({
    start: { x: margin, y },
    end: { x: PAGE_W - margin, y },
    thickness: 1,
    color: borderGray,
  });
  y -= 16;

  // 3 KPI Summary Boxes
  const boxGap = 12;
  const boxW = (PAGE_W - margin * 2 - boxGap * 2) / 3;
  const boxH = 54;

  // Box 1: Total USD
  page.drawRectangle({
    x: margin,
    y: y - boxH,
    width: boxW,
    height: boxH,
    color: rgb(0.96, 0.98, 1),
    borderColor: borderGray,
    borderWidth: 1,
  });
  page.drawText('TOTAL POR COBRAR (USD)', {
    x: margin + 12,
    y: y - 16,
    size: 7.5,
    font: fontBold,
    color: textGray,
  });
  page.drawText(`$${snapshot.totalPendingUsd.toFixed(2)} USD`, {
    x: margin + 12,
    y: y - 36,
    size: 14,
    font: fontBold,
    color: brandNavy,
  });

  // Box 2: Total CRC
  const box2X = margin + boxW + boxGap;
  page.drawRectangle({
    x: box2X,
    y: y - boxH,
    width: boxW,
    height: boxH,
    color: rgb(0.96, 0.98, 1),
    borderColor: borderGray,
    borderWidth: 1,
  });
  page.drawText('EQUIVALENTE EN COLONES', {
    x: box2X + 12,
    y: y - 16,
    size: 7.5,
    font: fontBold,
    color: textGray,
  });
  page.drawText(cleanPdfText(`CRC ${snapshot.totalPendingCrc.toLocaleString('es-CR')}`), {
    x: box2X + 12,
    y: y - 36,
    size: 13.5,
    font: fontBold,
    color: brandBlue,
  });

  // Box 3: Clientes y Facturas
  const box3X = box2X + boxW + boxGap;
  page.drawRectangle({
    x: box3X,
    y: y - boxH,
    width: boxW,
    height: boxH,
    color: rgb(1, 0.985, 0.93),
    borderColor: rgb(0.96, 0.87, 0.65),
    borderWidth: 1,
  });
  page.drawText('CLIENTES CON SALDO ACTIVO', {
    x: box3X + 12,
    y: y - 16,
    size: 7.5,
    font: fontBold,
    color: amberDark,
  });
  page.drawText(`${snapshot.totalClientsCount} clientes (${snapshot.totalPendingInvoicesCount} fact.)`, {
    x: box3X + 12,
    y: y - 36,
    size: 12.5,
    font: fontBold,
    color: amberDark,
  });

  y -= boxH + 20;

  // Table Header helper
  const drawTableHeader = (targetPage: typeof page, topY: number) => {
    targetPage.drawRectangle({
      x: margin,
      y: topY - 22,
      width: PAGE_W - margin * 2,
      height: 22,
      color: brandNavy,
    });
    targetPage.drawText('#', { x: margin + 8, y: topY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    targetPage.drawText('CLIENTE / CORREO', { x: margin + 28, y: topY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    targetPage.drawText('FACTURAS PENDIENTES', { x: margin + 215, y: topY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    targetPage.drawText('SALDO (USD)', { x: PAGE_W - margin - 140, y: topY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    targetPage.drawText('SALDO (CRC)', { x: PAGE_W - margin - 68, y: topY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    return topY - 22;
  };

  y = drawTableHeader(page, y);

  for (let i = 0; i < snapshot.clients.length; i++) {
    const client = snapshot.clients[i];
    const rowH = 30;

    if (y - rowH < margin + 35) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - margin;
      page.drawText('REPORTE DIARIO DE CUENTAS POR COBRAR (Continuacion)', {
        x: margin,
        y: y - 10,
        size: 10,
        font: fontBold,
        color: brandBlue,
      });
      y -= 24;
      y = drawTableHeader(page, y);
    }

    if (i % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - rowH,
        width: PAGE_W - margin * 2,
        height: rowH,
        color: bgRowAlt,
      });
    }

    page.drawText(String(i + 1), {
      x: margin + 8,
      y: y - 13,
      size: 8.5,
      font: fontBold,
      color: textGray,
    });

    const cleanName = cleanPdfText(client.clientName).substring(0, 34);
    page.drawText(cleanName, {
      x: margin + 28,
      y: y - 12,
      size: 9,
      font: fontBold,
      color: textDark,
    });

    const cleanMail = cleanPdfText(client.clientEmail || 'Sin correo').substring(0, 40);
    page.drawText(cleanMail, {
      x: margin + 28,
      y: y - 23,
      size: 7.5,
      font: fontRegular,
      color: textGray,
    });

    const invSummary = `${client.pendingInvoicesCount} ${
      client.pendingInvoicesCount === 1 ? 'factura' : 'facturas'
    }: ${client.invoices
      .slice(0, 4)
      .map(inv => inv.invoiceNumber)
      .join(', ')}${client.invoices.length > 4 ? '...' : ''}`;
    page.drawText(cleanPdfText(invSummary).substring(0, 38), {
      x: margin + 215,
      y: y - 17,
      size: 8,
      font: fontRegular,
      color: textDark,
    });

    const usdStr = `$${client.totalPendingUsd.toFixed(2)}`;
    page.drawText(usdStr, {
      x: PAGE_W - margin - 140,
      y: y - 17,
      size: 9.5,
      font: fontBold,
      color: brandNavy,
    });

    const crcStr = cleanPdfText(`CRC ${client.totalPendingCrc.toLocaleString('es-CR')}`);
    page.drawText(crcStr, {
      x: PAGE_W - margin - 72,
      y: y - 17,
      size: 8,
      font: fontRegular,
      color: textGray,
    });

    page.drawLine({
      start: { x: margin, y: y - rowH },
      end: { x: PAGE_W - margin, y: y - rowH },
      thickness: 0.5,
      color: borderGray,
    });

    y -= rowH;
  }

  // Footer total bar
  if (y - 36 < margin) {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - margin;
  }

  y -= 8;
  page.drawRectangle({
    x: margin,
    y: y - 28,
    width: PAGE_W - margin * 2,
    height: 28,
    color: brandNavy,
  });
  page.drawText('SALDO TOTAL PENDIENTE DE COBRO:', {
    x: margin + 12,
    y: y - 17,
    size: 9.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(
    cleanPdfText(`$${snapshot.totalPendingUsd.toFixed(2)} USD   (aprox. CRC ${snapshot.totalPendingCrc.toLocaleString('es-CR')})`),
    {
      x: PAGE_W - margin - 230,
      y: y - 17,
      size: 10,
      font: fontBold,
      color: rgb(0.98, 0.8, 0.08),
    }
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
