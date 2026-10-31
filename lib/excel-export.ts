/**
 * Generador nativo de archivos Microsoft Excel (.xlsx) para JRS Cargo S.A.
 * 100% TypeScript puro, sin dependencias externas pesadas.
 * Cumple con el estándar internacional OpenXML (ECMA-376 / ISO/IEC 29500).
 */

import { getInvoiceStats, formatDisplayDate } from '@/lib/billing';

export type InvoiceExportItem = {
  id: string;
  invoice_number: string;
  issue_date: string;
  created_at?: string;
  total: number | string;
  status: string;
  client_id?: string;
  currency?: string;
  email_sent_at?: string | null;
  clients?: { id?: string; name: string; email: string; address?: string; secondary_email?: string };
  invoice_payments?: { amount_applied: number | string }[];
};

// Tabla CRC32 precalculada para rendimiento óptimo
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCRC32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Creador de archivos ZIP estándar (Método 0: Stored - sin compresión, estándar OpenXML)
function createZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const cdParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = file.data;
    const crc = computeCRC32(dataBytes);
    const size = dataBytes.length;

    // Encabezado local de archivo (30 bytes + nombre + datos)
    const lh = new Uint8Array(30);
    const lhView = new DataView(lh.buffer);
    lhView.setUint32(0, 0x04034b50, true); // Firma local
    lhView.setUint16(4, 20, true); // Versión requerida
    lhView.setUint16(6, 0x0800, true); // Flag UTF-8
    lhView.setUint16(8, 0, true); // Método: Stored
    lhView.setUint32(10, 0, true); // Hora y fecha mod
    lhView.setUint32(14, crc, true); // CRC32
    lhView.setUint32(18, size, true); // Tamaño comprimido
    lhView.setUint32(22, size, true); // Tamaño descomprimido
    lhView.setUint16(26, nameBytes.length, true);
    lhView.setUint16(28, 0, true); // Extra length

    localParts.push(lh, nameBytes, dataBytes);

    // Encabezado de Directorio Central (46 bytes + nombre)
    const cd = new Uint8Array(46);
    const cdView = new DataView(cd.buffer);
    cdView.setUint32(0, 0x02014b50, true); // Firma CD
    cdView.setUint16(4, 20, true); // Hecho por
    cdView.setUint16(6, 20, true); // Versión requerida
    cdView.setUint16(8, 0x0800, true); // Flag UTF-8
    cdView.setUint16(10, 0, true); // Método: Stored
    cdView.setUint32(12, 0, true); // Mod time
    cdView.setUint32(16, crc, true); // CRC32
    cdView.setUint32(20, size, true); // Tamaño
    cdView.setUint32(24, size, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint16(30, 0, true);
    cdView.setUint16(32, 0, true);
    cdView.setUint16(34, 0, true);
    cdView.setUint16(36, 0, true);
    cdView.setUint32(38, 0, true);
    cdView.setUint32(42, offset, true); // Offset relativo del header local

    cdParts.push(cd, nameBytes);

    offset += lh.length + nameBytes.length + dataBytes.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const part of cdParts) cdSize += part.length;

  // Fin de Directorio Central (EOCD - 22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // Firma EOCD
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true); // Entradas en este disco
  eocdView.setUint16(10, files.length, true); // Entradas totales
  eocdView.setUint32(12, cdSize, true); // Tamaño CD
  eocdView.setUint32(16, cdOffset, true); // Offset de inicio CD
  eocdView.setUint16(20, 0, true); // Longitud de comentario

  const totalLength = offset + cdSize + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;

  for (const part of localParts) {
    result.set(part, pos);
    pos += part.length;
  }
  for (const part of cdParts) {
    result.set(part, pos);
    pos += part.length;
  }
  result.set(eocd, pos);

  return result;
}

function escapeXml(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getColLetter(colIdx: number): string {
  let col = '';
  let temp = colIdx;
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    temp = Math.floor((temp - 1) / 26);
  }
  return col;
}

/**
 * Genera y descarga un archivo genuino de Microsoft Excel (.xlsx)
 * con el Estado de Ingresos y Facturación de JRS Cargo.
 */
export function generateIncomeReportXlsx(
  items: InvoiceExportItem[],
  startStr: string,
  endStr: string
): void {
  const encoder = new TextEncoder();

  let totalFact = 0;
  let totalPag = 0;
  let totalPend = 0;

  items.forEach(inv => {
    const stats = getInvoiceStats(inv);
    if (stats.currency !== 'CRC') {
      totalFact += Number(inv.total) || 0;
      totalPag += stats.paid;
      totalPend += stats.pending;
    }
  });

  const recoveryRate = totalFact > 0 ? ((totalPag / totalFact) * 100).toFixed(1) : '0.0';
  const nowCR = new Date().toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' });
  const periodLabel =
    startStr && endStr
      ? startStr === endStr
        ? startStr
        : `${startStr} al ${endStr}`
      : startStr
      ? `Desde ${startStr}`
      : endStr
      ? `Hasta ${endStr}`
      : 'Histórico Completo';

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // 3. xl/workbook.xml
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Estado de Ingresos" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  // 4. xl/_rels/workbook.xml.rels
  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // 5. xl/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/>
    <numFmt numFmtId="165" formatCode="0.0&quot;%&quot;"/>
  </numFmts>
  <fonts count="6">
    <!-- 0: Normal 10pt -->
    <font><name val="Calibri"/><sz val="10"/><color rgb="FF0F172A"/></font>
    <!-- 1: Header Tabla (Negrita Blanca) -->
    <font><b/><name val="Calibri"/><sz val="10"/><color rgb="FFFFFFFF"/></font>
    <!-- 2: Título Principal 16pt -->
    <font><b/><name val="Calibri"/><sz val="16"/><color rgb="FF0B2737"/></font>
    <!-- 3: Subtítulo 11pt -->
    <font><b/><name val="Calibri"/><sz val="11"/><color rgb="FF14445D"/></font>
    <!-- 4: Metadata Etiqueta 9pt Negrita -->
    <font><b/><name val="Calibri"/><sz val="9"/><color rgb="FF475569"/></font>
    <!-- 5: Celda Negrita Normal 10pt -->
    <font><b/><name val="Calibri"/><sz val="10"/><color rgb="FF0F172A"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Navy Header #0B2737 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B2737"/></patternFill></fill>
    <!-- 3: Metadata Background #F8FAFC -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <!-- 4: Cobrado Soft Green #ECFDF5 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>
    <!-- 5: Pendiente Soft Amber #FFFBEB -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/></patternFill></fill>
  </fills>
  <borders count="3">
    <!-- 0: Sin borde -->
    <border><left/><right/><top/><bottom/></border>
    <!-- 1: Borde delgado suave #CBD5E1 -->
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
    <!-- 2: Borde total superior simple, inferior doble -->
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
  <cellXfs count="11">
    <!-- 0: Normal texto izquierda -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 1: Encabezado de tabla (Navy, blanco, negrita, centrado) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 2: Título Principal Grande -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 3: Subtítulo Azul Petróleo -->
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 4: Metadata Etiqueta -->
    <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 5: Metadata Valor -->
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 6: Moneda USD ($#,##0.00) a la derecha -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 7: Moneda USD Negrita a la derecha -->
    <xf numFmtId="164" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 8: Celda de texto centrada -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 9: Fila Total - Etiqueta -->
    <xf numFmtId="0" fontId="5" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="2">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 10: Fila Total - Monto Moneda Negrita -->
    <xf numFmtId="164" fontId="5" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="2">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;

  // 6. xl/worksheets/sheet1.xml
  let rowIdx = 1;
  const rowsXml: string[] = [];

  // Título Corporativo
  rowsXml.push(`
    <row r="${rowIdx}" ht="26" customHeight="1">
      <c r="A${rowIdx}" t="inlineStr" s="2"><is><t>JRS CARGO S.A. — ESTADO DE INGRESOS Y FACTURACIÓN</t></is></c>
    </row>
  `);
  rowIdx++;

  rowsXml.push(`
    <row r="${rowIdx}" ht="18" customHeight="1">
      <c r="A${rowIdx}" t="inlineStr" s="3"><is><t>Reporte Oficial de Auditoría de Cuentas y Cobros</t></is></c>
    </row>
  `);
  rowIdx++;

  // Metadata Card en Excel
  const metaRows: [string, string, string, string][] = [
    ['Período Auditado:', periodLabel, 'Fecha de Emisión:', nowCR],
    ['Total Facturas:', `${items.length} comprobantes`, 'Efectividad Cobro:', `${recoveryRate}%`],
    ['Total Facturado (USD):', `$${totalFact.toFixed(2)}`, 'Total Cobrado (USD):', `$${totalPag.toFixed(2)}`],
    ['Saldo Pendiente (USD):', `$${totalPend.toFixed(2)}`, 'Moneda Base:', 'USD ($)']
  ];

  for (const m of metaRows) {
    rowsXml.push(`
      <row r="${rowIdx}" ht="20" customHeight="1">
        <c r="A${rowIdx}" t="inlineStr" s="4"><is><t>${escapeXml(m[0])}</t></is></c>
        <c r="B${rowIdx}" t="inlineStr" s="5"><is><t>${escapeXml(m[1])}</t></is></c>
        <c r="C${rowIdx}" t="inlineStr" s="4"><is><t>${escapeXml(m[2])}</t></is></c>
        <c r="D${rowIdx}" t="inlineStr" s="5"><is><t>${escapeXml(m[3])}</t></is></c>
      </row>
    `);
    rowIdx++;
  }

  // Fila vacía de separación
  rowIdx++;

  // Encabezados de la Tabla Principal
  const headers = [
    '#',
    'Fecha Emisión',
    'N.° Factura',
    'Cliente',
    'Correo Electrónico',
    'Moneda',
    'Total Facturado ($)',
    'Total Cobrado ($)',
    'Saldo Pendiente ($)',
    'Estado',
    'Notificación Correo',
    'Fecha Envío'
  ];

  const headerCells = headers
    .map((h, i) => `<c r="${getColLetter(i + 1)}${rowIdx}" t="inlineStr" s="1"><is><t>${escapeXml(h)}</t></is></c>`)
    .join('');
  rowsXml.push(`<row r="${rowIdx}" ht="26" customHeight="1">${headerCells}</row>`);
  const dataStartRow = rowIdx + 1;
  rowIdx++;

  // Filas de Datos
  items.forEach((inv, idx) => {
    const stats = getInvoiceStats(inv);
    const invDate = inv.issue_date ? inv.issue_date.split('T')[0] : '';
    const emailStatus = inv.email_sent_at ? 'Enviado' : 'No enviado';
    const emailDate = inv.email_sent_at ? formatDisplayDate(inv.email_sent_at) : '—';
    const clientName = inv.clients?.name || 'Cliente sin nombre';
    const clientEmail = inv.clients?.email || '';

    const facturado = Number(inv.total) || 0;
    const pagado = stats.paid;
    const pendiente = stats.pending;

    rowsXml.push(`
      <row r="${rowIdx}" ht="20" customHeight="1">
        <c r="A${rowIdx}" t="inlineStr" s="8"><is><t>${idx + 1}</t></is></c>
        <c r="B${rowIdx}" t="inlineStr" s="8"><is><t>${escapeXml(invDate)}</t></is></c>
        <c r="C${rowIdx}" t="inlineStr" s="8"><is><t>${escapeXml(inv.invoice_number)}</t></is></c>
        <c r="D${rowIdx}" t="inlineStr" s="0"><is><t>${escapeXml(clientName)}</t></is></c>
        <c r="E${rowIdx}" t="inlineStr" s="0"><is><t>${escapeXml(clientEmail)}</t></is></c>
        <c r="F${rowIdx}" t="inlineStr" s="8"><is><t>${escapeXml(stats.currency || 'USD')}</t></is></c>
        <c r="G${rowIdx}" s="6"><v>${facturado.toFixed(2)}</v></c>
        <c r="H${rowIdx}" s="6"><v>${pagado.toFixed(2)}</v></c>
        <c r="I${rowIdx}" s="6"><v>${pendiente.toFixed(2)}</v></c>
        <c r="J${rowIdx}" t="inlineStr" s="8"><is><t>${escapeXml(stats.displayStatus)}</t></is></c>
        <c r="K${rowIdx}" t="inlineStr" s="8"><is><t>${escapeXml(emailStatus)}</t></is></c>
        <c r="L${rowIdx}" t="inlineStr" s="8"><is><t>${escapeXml(emailDate)}</t></is></c>
      </row>
    `);
    rowIdx++;
  });

  const dataEndRow = rowIdx - 1;

  // Fila de Totales con Fórmulas Nativas de Excel (=SUM)
  if (items.length > 0) {
    rowsXml.push(`
      <row r="${rowIdx}" ht="24" customHeight="1">
        <c r="A${rowIdx}" s="9"><is><t></t></is></c>
        <c r="B${rowIdx}" s="9"><is><t></t></is></c>
        <c r="C${rowIdx}" s="9"><is><t></t></is></c>
        <c r="D${rowIdx}" s="9"><is><t></t></is></c>
        <c r="E${rowIdx}" s="9"><is><t></t></is></c>
        <c r="F${rowIdx}" t="inlineStr" s="9"><is><t>TOTALES:</t></is></c>
        <c r="G${rowIdx}" s="10"><f>SUM(G${dataStartRow}:G${dataEndRow})</f><v>${totalFact.toFixed(2)}</v></c>
        <c r="H${rowIdx}" s="10"><f>SUM(H${dataStartRow}:H${dataEndRow})</f><v>${totalPag.toFixed(2)}</v></c>
        <c r="I${rowIdx}" s="10"><f>SUM(I${dataStartRow}:I${dataEndRow})</f><v>${totalPend.toFixed(2)}</v></c>
        <c r="J${rowIdx}" s="9"><is><t></t></is></c>
        <c r="K${rowIdx}" s="9"><is><t></t></is></c>
        <c r="L${rowIdx}" s="9"><is><t></t></is></c>
      </row>
    `);
  }

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="14" customWidth="1"/>
    <col min="3" max="3" width="15" customWidth="1"/>
    <col min="4" max="4" width="30" customWidth="1"/>
    <col min="5" max="5" width="30" customWidth="1"/>
    <col min="6" max="6" width="10" customWidth="1"/>
    <col min="7" max="7" width="20" customWidth="1"/>
    <col min="8" max="8" width="20" customWidth="1"/>
    <col min="9" max="9" width="20" customWidth="1"/>
    <col min="10" max="10" width="15" customWidth="1"/>
    <col min="11" max="11" width="18" customWidth="1"/>
    <col min="12" max="12" width="20" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowsXml.join('')}
  </sheetData>
</worksheet>`;

  // Empaquetar en archivo ZIP estándar (.xlsx)
  const zipBytes = createZip([
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(relsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheetXml) }
  ]);

  const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const fileSuffix =
    startStr && endStr
      ? startStr === endStr
        ? startStr
        : `${startStr}_a_${endStr}`
      : startStr || endStr || 'historico';

  const filename = `estado-ingresos-jrs-cargo-${fileSuffix}.xlsx`;

  // Descarga en navegador
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type InventoryExportRow = {
  index: number;
  tracking: string;
  client: string;
  company: string;
  weight: string;
  invoice: string;
  shelf: string;
  date: string;
  status: string;
};

/**
 * Genera y descarga un archivo genuino de Microsoft Excel (.xlsx)
 * con el Inventario Físico de Bodega de JRS Cargo.
 */
export function generateInventoryReportXlsx(items: InventoryExportRow[]): void {
  const encoder = new TextEncoder();
  const nowCR = new Date().toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' });

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // 3. xl/workbook.xml
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Inventario Bodega" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  // 4. xl/_rels/workbook.xml.rels
  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // 5. xl/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><name val="Calibri"/><sz val="10"/><color rgb="FF0F172A"/></font>
    <font><b/><name val="Calibri"/><sz val="10"/><color rgb="FFFFFFFF"/></font>
    <font><b/><name val="Calibri"/><sz val="15"/><color rgb="FF0B2737"/></font>
    <font><b/><name val="Calibri"/><sz val="10"/><color rgb="FF0F172A"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B2737"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="4">
    <!-- 0: Normal texto izquierda -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 1: Encabezado Tabla (Navy) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 2: Título Principal -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 3: Centrado -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;

  // 6. xl/worksheets/sheet1.xml
  let rowIdx = 1;
  const rowsXml: string[] = [];

  rowsXml.push(`
    <row r="${rowIdx}" ht="26" customHeight="1">
      <c r="A${rowIdx}" t="inlineStr" s="2"><is><t>JRS CARGO S.A. — INVENTARIO DE BODEGA LOCAL</t></is></c>
    </row>
  `);
  rowIdx++;

  rowsXml.push(`
    <row r="${rowIdx}" ht="18" customHeight="1">
      <c r="A${rowIdx}" t="inlineStr" s="0"><is><t>Fecha de Descarga: ${escapeXml(nowCR)} | Total Paquetes: ${items.length}</t></is></c>
    </row>
  `);
  rowIdx += 2;

  const headers = [
    '#',
    'Tracking / Guía',
    'Cliente',
    'Empresa',
    'Peso / Medida',
    'Factura',
    'Estante / Ubicación',
    'Fecha Ingreso',
    'Estado'
  ];

  const headerCells = headers
    .map((h, i) => `<c r="${getColLetter(i + 1)}${rowIdx}" t="inlineStr" s="1"><is><t>${escapeXml(h)}</t></is></c>`)
    .join('');
  rowsXml.push(`<row r="${rowIdx}" ht="26" customHeight="1">${headerCells}</row>`);
  rowIdx++;

  items.forEach(it => {
    rowsXml.push(`
      <row r="${rowIdx}" ht="20" customHeight="1">
        <c r="A${rowIdx}" t="inlineStr" s="3"><is><t>${it.index}</t></is></c>
        <c r="B${rowIdx}" t="inlineStr" s="3"><is><t>${escapeXml(it.tracking)}</t></is></c>
        <c r="C${rowIdx}" t="inlineStr" s="0"><is><t>${escapeXml(it.client)}</t></is></c>
        <c r="D${rowIdx}" t="inlineStr" s="0"><is><t>${escapeXml(it.company)}</t></is></c>
        <c r="E${rowIdx}" t="inlineStr" s="3"><is><t>${escapeXml(it.weight)}</t></is></c>
        <c r="F${rowIdx}" t="inlineStr" s="3"><is><t>${escapeXml(it.invoice)}</t></is></c>
        <c r="G${rowIdx}" t="inlineStr" s="3"><is><t>${escapeXml(it.shelf)}</t></is></c>
        <c r="H${rowIdx}" t="inlineStr" s="3"><is><t>${escapeXml(it.date)}</t></is></c>
        <c r="I${rowIdx}" t="inlineStr" s="3"><is><t>${escapeXml(it.status)}</t></is></c>
      </row>
    `);
    rowIdx++;
  });

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="30" customWidth="1"/>
    <col min="3" max="3" width="28" customWidth="1"/>
    <col min="4" max="4" width="20" customWidth="1"/>
    <col min="5" max="5" width="16" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="20" customWidth="1"/>
    <col min="8" max="8" width="16" customWidth="1"/>
    <col min="9" max="9" width="16" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowsXml.join('')}
  </sheetData>
</worksheet>`;

  const zipBytes = createZip([
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(relsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheetXml) }
  ]);

  const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const filename = `inventario-jrs-cargo-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
