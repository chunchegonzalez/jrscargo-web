import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface InvoiceDataForPdf {
  invoice_number: string;
  issue_date?: string;
  due_date?: string;
  status: string;
  subtotal: number;
  discount_percent: number;
  total: number;
  exchange_rate?: number;
  notes?: string;
  clients?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  items: Array<{
    service_name: string;
    tracking_number?: string;
    weight?: string | number;
    rate?: string | number;
    amount: number;
  }>;
}

function clean(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/₡/g, 'CRC ')
    .replace(/°/g, '.')
    .replace(/•/g, '-')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/‘/g, "'")
    .replace(/’/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

let cachedLogoBytes: Buffer | null = null;

export async function generateInvoicePdf(invoice: InvoiceDataForPdf): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 (595.28 x 841.89 pt)
  const { width, height } = page.getSize();

  // Fonts
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Colors
  const brandBlue = rgb(0.07, 0.26, 0.37); // #12435E
  const brandNavy = rgb(0.04, 0.15, 0.21); // #0A2636
  const textDark = rgb(0.12, 0.14, 0.17);
  const textGray = rgb(0.42, 0.46, 0.52);
  const textLight = rgb(0.60, 0.64, 0.70);
  const borderGray = rgb(0.88, 0.90, 0.92);
  const bgLight = rgb(0.97, 0.98, 0.99);
  const successGreen = rgb(0.06, 0.65, 0.40);
  const amberColor = rgb(0.90, 0.55, 0.05);

  const margin = 44;
  const pageTop = height - margin;

  // ==========================================
  // 1. HEADER (Top Left: Text, Top Right: Large Logo)
  // ==========================================
  const logoTargetHeight = 62; // Increased logo size for clear branding
  let logoBottom = pageTop - logoTargetHeight;

  try {
    if (!cachedLogoBytes) {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        cachedLogoBytes = fs.readFileSync(logoPath);
      }
    }
    if (cachedLogoBytes) {
      const logoImg = await pdfDoc.embedPng(cachedLogoBytes);
      const logoScale = logoTargetHeight / logoImg.height;
      const logoWidth = logoImg.width * logoScale;
      
      page.drawImage(logoImg, {
        x: width - margin - logoWidth,
        y: pageTop - logoTargetHeight + 6,
        width: logoWidth,
        height: logoTargetHeight,
      });
      logoBottom = pageTop - logoTargetHeight;
    }
  } catch (e) {
    console.warn('Could not embed PNG logo in PDF', e);
  }

  // Header Text (Left)
  page.drawText('FACTURA', {
    x: margin,
    y: pageTop - 6,
    size: 24,
    font: fontBold,
    color: brandBlue,
  });

  page.drawText('JRS CARGO S.A.', {
    x: margin,
    y: pageTop - 28,
    size: 11,
    font: fontBold,
    color: textDark,
  });

  page.drawText('San Pablo de Heredia, Costa Rica', {
    x: margin,
    y: pageTop - 42,
    size: 9,
    font: fontRegular,
    color: textGray,
  });

  page.drawText('Tel: +506 7260-1238  |  info@jrscargocr.com  |  www.jrscargocr.com', {
    x: margin,
    y: pageTop - 56,
    size: 8.5,
    font: fontRegular,
    color: textLight,
  });

  // Divider Line (Clean, strictly below header)
  let y = Math.min(pageTop - 74, logoBottom - 14);
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderGray,
  });
  y -= 20;

  // ==========================================
  // 2. CLIENT & INVOICE METADATA SECTION
  // ==========================================
  const clientName = clean(invoice.clients?.name || 'Cliente');
  const clientEmail = clean(invoice.clients?.email || '');
  const clientPhone = clean(invoice.clients?.phone || '');
  const [yearStr, monthStr, dayStr] = (invoice.issue_date || '').split('T')[0].split('-');
  const formattedDate = yearStr && monthStr && dayStr ? `${dayStr}/${monthStr}/${yearStr}` : new Date().toLocaleDateString('es-CR');

  const metaStartY = y;

  // Left: Client info
  page.drawText('FACTURAR A:', {
    x: margin,
    y: metaStartY,
    size: 8,
    font: fontBold,
    color: textLight,
  });

  page.drawText(clientName, {
    x: margin,
    y: metaStartY - 15,
    size: 13,
    font: fontBold,
    color: textDark,
  });

  if (clientEmail) {
    page.drawText(clientEmail, {
      x: margin,
      y: metaStartY - 28,
      size: 9,
      font: fontRegular,
      color: textGray,
    });
  }

  if (clientPhone) {
    page.drawText(clientPhone, {
      x: margin,
      y: metaStartY - (clientEmail ? 40 : 28),
      size: 9,
      font: fontRegular,
      color: textGray,
    });
  }

  // Right: Invoice Meta (Aligned to right edge)
  const metaLabelX = width - margin - 170;
  const metaValueX = width - margin - 60;

  page.drawText('No. de Factura:', { x: metaLabelX, y: metaStartY, size: 9, font: fontRegular, color: textGray });
  page.drawText(clean(invoice.invoice_number), { x: metaValueX, y: metaStartY, size: 10.5, font: fontBold, color: brandBlue });

  page.drawText('Fecha de Emision:', { x: metaLabelX, y: metaStartY - 15, size: 9, font: fontRegular, color: textGray });
  page.drawText(clean(formattedDate), { x: metaValueX, y: metaStartY - 15, size: 9, font: fontRegular, color: textDark });

  const statusText = clean((invoice.status || 'PENDIENTE').toUpperCase());
  const statusColor = statusText === 'PAGADA' ? successGreen : (statusText === 'ANULADA' ? rgb(0.8, 0.2, 0.2) : amberColor);
  page.drawText('Estado:', { x: metaLabelX, y: metaStartY - 30, size: 9, font: fontBold, color: textGray });
  page.drawText(statusText, { x: metaValueX, y: metaStartY - 30, size: 9, font: fontBold, color: statusColor });

  y = metaStartY - 56;

  // ==========================================
  // 3. TABLE HEADER
  // ==========================================
  const colX = {
    service: margin + 10,
    tracking: margin + 185,
    weight: margin + 335,
    rate: margin + 395,
    amount: width - margin - 10,
  };

  const tableTop = y;
  page.drawRectangle({
    x: margin,
    y: tableTop - 18,
    width: width - (margin * 2),
    height: 24,
    color: brandBlue,
  });

  page.drawText('PRODUCTO / SERVICIO', { x: colX.service, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('NO. DE RASTREO', { x: colX.tracking, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('PESO', { x: colX.weight, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('TARIFA', { x: colX.rate, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('IMPORTE (USD)', { x: colX.amount - 65, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  y = tableTop - 24;

  // ==========================================
  // 4. TABLE ROWS
  // ==========================================
  const items = invoice.items || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowHeight = 24;
    const isEven = i % 2 === 0;

    if (isEven) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 6,
        width: width - (margin * 2),
        height: rowHeight,
        color: bgLight,
      });
    }

    // Clean service name
    let rawService = item.service_name || 'Transporte Internacional';
    if (rawService.includes(' - ') && item.tracking_number) {
      rawService = rawService.split(' - ')[0];
    }
    const serviceName = clean(rawService.substring(0, 32));
    page.drawText(serviceName, { x: colX.service, y: y - 9, size: 8.5, font: fontRegular, color: textDark });

    // Tracking
    const tracking = clean((item.tracking_number || '-').substring(0, 24));
    page.drawText(tracking, { x: colX.tracking, y: y - 9, size: 8, font: fontMono, color: brandNavy });

    // Weight
    const weightStr = item.weight !== undefined && item.weight !== null && item.weight !== '' ? `${item.weight} lb` : '-';
    page.drawText(clean(weightStr), { x: colX.weight, y: y - 9, size: 8.5, font: fontRegular, color: textGray });

    // Rate
    const rateStr = item.rate !== undefined && item.rate !== null && item.rate !== '' ? `$${Number(item.rate).toFixed(2)}` : '-';
    page.drawText(clean(rateStr), { x: colX.rate, y: y - 9, size: 8.5, font: fontRegular, color: textGray });

    // Amount
    const amountStr = `$${Number(item.amount || 0).toFixed(2)}`;
    const amtWidth = fontBold.widthOfTextAtSize(amountStr, 9);
    page.drawText(amountStr, { x: colX.amount - amtWidth, y: y - 9, size: 9, font: fontBold, color: textDark });

    // Bottom row border
    page.drawLine({
      start: { x: margin, y: y - rowHeight + 6 },
      end: { x: width - margin, y: y - rowHeight + 6 },
      thickness: 0.5,
      color: borderGray,
    });

    y -= rowHeight;
  }

  y -= 18;

  // ==========================================
  // 5. TOTALS SECTION
  // ==========================================
  const totalsWidth = 200;
  const totalsX = width - margin - totalsWidth;
  const exchangeRate = invoice.exchange_rate || 530;
  const totalUSD = Number(invoice.total || 0);
  const totalCRC = totalUSD * exchangeRate;
  const formattedColones = totalCRC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Subtotal
  page.drawText('Subtotal:', { x: totalsX, y, size: 9, font: fontRegular, color: textGray });
  const subStr = `$${Number(invoice.subtotal || invoice.total).toFixed(2)}`;
  page.drawText(subStr, { x: width - margin - fontRegular.widthOfTextAtSize(subStr, 9), y, size: 9, font: fontRegular, color: textDark });
  y -= 15;

  // Discount (if any)
  if (invoice.discount_percent && invoice.discount_percent > 0) {
    const discAmt = ((Number(invoice.subtotal) * invoice.discount_percent) / 100).toFixed(2);
    page.drawText(`Descuento (${invoice.discount_percent}%):`, { x: totalsX, y, size: 9, font: fontRegular, color: successGreen });
    const discStr = `-$${discAmt}`;
    page.drawText(discStr, { x: width - margin - fontRegular.widthOfTextAtSize(discStr, 9), y, size: 9, font: fontRegular, color: successGreen });
    y -= 15;
  }

  // Total USD (Clean, Large, Brand Blue)
  page.drawText('Total USD:', { x: totalsX, y, size: 12, font: fontBold, color: brandBlue });
  const totalStr = `$${totalUSD.toFixed(2)}`;
  const totalWidth = fontBold.widthOfTextAtSize(totalStr, 14);
  page.drawText(totalStr, { x: width - margin - totalWidth, y, size: 14, font: fontBold, color: brandBlue });
  y -= 18;

  // Total Colones
  page.drawText('Total Colones:', { x: totalsX, y, size: 9, font: fontRegular, color: textGray });
  const crcStr = clean(`CRC ${formattedColones}`);
  page.drawText(crcStr, { x: width - margin - fontBold.widthOfTextAtSize(crcStr, 9.5), y, size: 9.5, font: fontBold, color: textDark });
  y -= 13;

  const tcText = clean(`T.C. CRC ${exchangeRate} por $1 USD`);
  page.drawText(tcText, { x: width - margin - fontRegular.widthOfTextAtSize(tcText, 8), y, size: 8, font: fontRegular, color: textLight });

  // 6. Notes / Mensaje de Cliente (Left Side)
  const notesY = y + 42;
  const notesText = clean(invoice.notes || 'Gracias por elegir a JRS CARGO');
  page.drawRectangle({
    x: margin,
    y: notesY - 36,
    width: 270,
    height: 48,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 0.5,
  });

  page.drawText('NOTAS & CONDICIONES:', { x: margin + 10, y: notesY - 2, size: 7.5, font: fontBold, color: brandBlue });
  page.drawText(notesText.substring(0, 75), { x: margin + 10, y: notesY - 14, size: 8, font: fontRegular, color: textGray });
  page.drawText('Servicio de Casillero y Envios Internacionales.', { x: margin + 10, y: notesY - 26, size: 7.5, font: fontRegular, color: textLight });

  // 7. Footer
  const footerY = 35;
  page.drawLine({
    start: { x: margin, y: footerY + 18 },
    end: { x: width - margin, y: footerY + 18 },
    thickness: 0.5,
    color: borderGray,
  });

  const footerText1 = 'JRS CARGO S.A. - San Pablo de Heredia, Costa Rica';
  const footerText2 = 'info@jrscargocr.com | Tel: +506 7260-1238 | www.jrscargocr.com';
  
  page.drawText(footerText1, {
    x: (width - fontBold.widthOfTextAtSize(footerText1, 8)) / 2,
    y: footerY + 6,
    size: 8,
    font: fontBold,
    color: brandBlue,
  });

  page.drawText(footerText2, {
    x: (width - fontRegular.widthOfTextAtSize(footerText2, 7.5)) / 2,
    y: footerY - 5,
    size: 7.5,
    font: fontRegular,
    color: textLight,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
