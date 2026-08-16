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
  const textDark = rgb(0.15, 0.15, 0.15);
  const textGray = rgb(0.45, 0.45, 0.45);
  const textLight = rgb(0.65, 0.65, 0.65);
  const borderGray = rgb(0.88, 0.88, 0.88);
  const bgLight = rgb(0.96, 0.97, 0.98);
  const successGreen = rgb(0.06, 0.65, 0.40);
  const amberColor = rgb(0.90, 0.55, 0.05);

  const margin = 40;
  const pageTop = height - margin;

  // ==========================================
  // 1. HEADER (Top Left: Text, Top Right: Logo)
  // ==========================================
  let headerBottom = pageTop - 65;

  // Draw Logo in top right corner (proportional scaling to height = 46pt)
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImg = await pdfDoc.embedPng(logoBytes);
      const targetLogoHeight = 46;
      const logoScale = targetLogoHeight / logoImg.height;
      const logoWidth = logoImg.width * logoScale;
      const logoHeight = targetLogoHeight;
      
      page.drawImage(logoImg, {
        x: width - margin - logoWidth,
        y: pageTop - logoHeight + 4,
        width: logoWidth,
        height: logoHeight,
      });
      headerBottom = Math.min(headerBottom, pageTop - logoHeight - 12);
    }
  } catch (e) {
    console.warn('Could not embed PNG logo in PDF, rendering vector text header', e);
  }

  // Header Text (Top Left)
  page.drawText('FACTURA', {
    x: margin,
    y: pageTop - 5,
    size: 22,
    font: fontBold,
    color: brandBlue,
  });

  page.drawText('JRS CARGO S.A.', {
    x: margin,
    y: pageTop - 25,
    size: 11,
    font: fontBold,
    color: textDark,
  });

  page.drawText('San Pablo de Heredia, Costa Rica', {
    x: margin,
    y: pageTop - 38,
    size: 8.5,
    font: fontRegular,
    color: textGray,
  });

  page.drawText('Tel: +506 7260-1238  |  info@jrscargocr.com  |  www.jrscargocr.com', {
    x: margin,
    y: pageTop - 50,
    size: 8,
    font: fontRegular,
    color: textGray,
  });

  // Divider Line (strictly below header)
  let y = headerBottom;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderGray,
  });
  y -= 16;

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
    y: metaStartY - 13,
    size: 12,
    font: fontBold,
    color: textDark,
  });

  if (clientEmail) {
    page.drawText(clientEmail, {
      x: margin,
      y: metaStartY - 25,
      size: 8.5,
      font: fontRegular,
      color: textGray,
    });
  }

  if (clientPhone) {
    page.drawText(clientPhone, {
      x: margin,
      y: metaStartY - (clientEmail ? 36 : 25),
      size: 8.5,
      font: fontRegular,
      color: textGray,
    });
  }

  // Right: Invoice Meta (Cleanly positioned on the right)
  const metaLabelX = width - margin - 170;
  const metaValueX = width - margin - 65;

  page.drawText('No. de Factura:', { x: metaLabelX, y: metaStartY, size: 8.5, font: fontRegular, color: textGray });
  page.drawText(clean(invoice.invoice_number), { x: metaValueX, y: metaStartY, size: 10, font: fontBold, color: brandBlue });

  page.drawText('Fecha de Emision:', { x: metaLabelX, y: metaStartY - 14, size: 8.5, font: fontRegular, color: textGray });
  page.drawText(clean(formattedDate), { x: metaValueX, y: metaStartY - 14, size: 8.5, font: fontRegular, color: textDark });

  const statusText = clean((invoice.status || 'PENDIENTE').toUpperCase());
  const statusColor = statusText === 'PAGADA' ? successGreen : (statusText === 'ANULADA' ? rgb(0.8, 0.2, 0.2) : amberColor);
  page.drawText('Estado:', { x: metaLabelX, y: metaStartY - 28, size: 8.5, font: fontBold, color: textGray });
  page.drawText(statusText, { x: metaValueX, y: metaStartY - 28, size: 8.5, font: fontBold, color: statusColor });

  y = metaStartY - 52;

  // ==========================================
  // 3. TABLE HEADER
  // ==========================================
  const colX = {
    service: margin + 8,
    tracking: margin + 175,
    weight: margin + 325,
    rate: margin + 385,
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
    const rowHeight = 22;
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

    // Clean service name so it doesn't overlap tracking
    let rawService = item.service_name || 'Transporte Internacional';
    if (rawService.includes(' - ') && item.tracking_number) {
      rawService = rawService.split(' - ')[0];
    }
    const serviceName = clean(rawService.substring(0, 28));
    page.drawText(serviceName, { x: colX.service, y: y - 8, size: 8.5, font: fontRegular, color: textDark });

    // Tracking
    const tracking = clean((item.tracking_number || '-').substring(0, 24));
    page.drawText(tracking, { x: colX.tracking, y: y - 8, size: 8, font: fontMono, color: brandNavy });

    // Weight
    const weightStr = item.weight !== undefined && item.weight !== null && item.weight !== '' ? `${item.weight} lb` : '-';
    page.drawText(clean(weightStr), { x: colX.weight, y: y - 8, size: 8.5, font: fontRegular, color: textGray });

    // Rate
    const rateStr = item.rate !== undefined && item.rate !== null && item.rate !== '' ? `$${Number(item.rate).toFixed(2)}` : '-';
    page.drawText(clean(rateStr), { x: colX.rate, y: y - 8, size: 8.5, font: fontRegular, color: textGray });

    // Amount
    const amountStr = `$${Number(item.amount || 0).toFixed(2)}`;
    const amtWidth = fontBold.widthOfTextAtSize(amountStr, 9);
    page.drawText(amountStr, { x: colX.amount - amtWidth, y: y - 8, size: 9, font: fontBold, color: textDark });

    // Bottom row border
    page.drawLine({
      start: { x: margin, y: y - rowHeight + 6 },
      end: { x: width - margin, y: y - rowHeight + 6 },
      thickness: 0.5,
      color: borderGray,
    });

    y -= rowHeight;
  }

  y -= 15;

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
  y -= 14;

  // Discount (if any)
  if (invoice.discount_percent && invoice.discount_percent > 0) {
    const discAmt = ((Number(invoice.subtotal) * invoice.discount_percent) / 100).toFixed(2);
    page.drawText(`Descuento (${invoice.discount_percent}%):`, { x: totalsX, y, size: 9, font: fontRegular, color: successGreen });
    const discStr = `-$${discAmt}`;
    page.drawText(discStr, { x: width - margin - fontRegular.widthOfTextAtSize(discStr, 9), y, size: 9, font: fontRegular, color: successGreen });
    y -= 14;
  }

  // Total USD (Clean, without rectangle border)
  page.drawText('Total USD:', { x: totalsX, y, size: 11, font: fontBold, color: brandBlue });
  const totalStr = `$${totalUSD.toFixed(2)}`;
  const totalWidth = fontBold.widthOfTextAtSize(totalStr, 13);
  page.drawText(totalStr, { x: width - margin - totalWidth, y, size: 13, font: fontBold, color: brandBlue });
  y -= 16;

  // Total Colones
  page.drawText('Total Colones:', { x: totalsX, y, size: 9, font: fontRegular, color: textGray });
  const crcStr = clean(`CRC ${formattedColones}`);
  page.drawText(crcStr, { x: width - margin - fontBold.widthOfTextAtSize(crcStr, 9), y, size: 9, font: fontBold, color: textDark });
  y -= 12;

  const tcText = clean(`T.C. CRC ${exchangeRate} por $1 USD`);
  page.drawText(tcText, { x: width - margin - fontRegular.widthOfTextAtSize(tcText, 7.5), y, size: 7.5, font: fontRegular, color: textLight });

  // 6. Notes / Mensaje de Cliente (Left Side)
  const notesY = y + 38;
  const notesText = clean(invoice.notes || 'Gracias por elegir a JRS CARGO');
  page.drawRectangle({
    x: margin,
    y: notesY - 35,
    width: 280,
    height: 48,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 0.5,
  });

  page.drawText('NOTAS & CONDICIONES:', { x: margin + 8, y: notesY - 2, size: 7.5, font: fontBold, color: brandBlue });
  page.drawText(notesText.substring(0, 75), { x: margin + 8, y: notesY - 14, size: 8, font: fontRegular, color: textGray });
  page.drawText('Servicio de Casillero y Envios Internacionales.', { x: margin + 8, y: notesY - 26, size: 7.5, font: fontRegular, color: textLight });

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
