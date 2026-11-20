import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import {
  loadARDailyReportState,
  saveARDailyReportState,
  buildAccountsReceivableSnapshot,
  generateAccountsReceivableXlsxBuffer,
  generateAccountsReceivablePdfBuffer,
  DEFAULT_AR_REPORT_EMAIL,
  ARDailyReportHistoryEntry,
  ARReportSnapshot,
} from '@/lib/ar-daily-report';
import { formatCostaRicaDateTime, formatCostaRicaISO } from '@/lib/billing';

export const dynamic = 'force-dynamic';

function buildReportEmailHtml(snapshot: ARReportSnapshot, triggerLabel: string): string {
  const topClientsRows = snapshot.clients
    .slice(0, 15)
    .map(
      (c, i) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;font-weight:700;">${i + 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
          <p style="margin:0;font-size:13.5px;font-weight:800;color:#0f172a;">${c.clientName}</p>
          <p style="margin:2px 0 0;font-size:11.5px;color:#64748b;">${c.clientEmail || 'Sin correo'}</p>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">
          <span style="display:inline-block;background-color:#fffbeb;color:#b45309;border:1px solid #fde68a;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;">
            ${c.pendingInvoicesCount} ${c.pendingInvoicesCount === 1 ? 'factura' : 'facturas'}
          </span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">
          <p style="margin:0;font-size:14px;font-weight:900;color:#0B2737;">$${c.totalPendingUsd.toFixed(2)}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#64748b;">&#8776; &#8353;${c.totalPendingCrc.toLocaleString('es-CR')}</p>
        </td>
      </tr>
    `
    )
    .join('');

  const remainingClientsCount = Math.max(0, snapshot.clients.length - 15);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:660px;margin:24px auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06);border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#0B2737 0%,#12435E 100%);padding:28px 24px;color:#ffffff;">
      <span style="display:inline-block;background-color:rgba(250,204,21,0.18);color:#facc15;border:1px solid rgba(250,204,21,0.35);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;padding:4px 10px;border-radius:999px;margin-bottom:10px;">
        ${triggerLabel}
      </span>
      <h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.3px;">Reporte Diario de Cuentas por Cobrar</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#cbd5e1;">
        Corte generado el <strong>${snapshot.generatedAtDisplay}</strong> &bull; JRS Cargo S.A.
      </p>
    </div>

    <div style="padding:24px;">
      <p style="margin:0 0 18px;font-size:14px;color:#334155;line-height:1.55;">
        Adjunto a este correo encontrarás el <strong>Reporte de Cuentas por Cobrar</strong> actualizado en formato <strong>Microsoft Excel (.xlsx)</strong> y <strong>Documento PDF (.pdf)</strong>.
      </p>

      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:22px;">
        <tr>
          <td style="width:33.3%;padding:14px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <p style="margin:0;font-size:10.5px;font-weight:800;text-transform:uppercase;color:#64748b;">Total por Cobrar (USD)</p>
            <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#0B2737;">$${snapshot.totalPendingUsd.toFixed(2)}</p>
          </td>
          <td style="width:10px;"></td>
          <td style="width:33.3%;padding:14px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <p style="margin:0;font-size:10.5px;font-weight:800;text-transform:uppercase;color:#64748b;">Equivalente (CRC)</p>
            <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#12435E;">&#8353;${snapshot.totalPendingCrc.toLocaleString('es-CR')}</p>
            <p style="margin:2px 0 0;font-size:10.5px;color:#94a3b8;">T.C. &#8353;${snapshot.exchangeRate}</p>
          </td>
          <td style="width:10px;"></td>
          <td style="width:33.3%;padding:14px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
            <p style="margin:0;font-size:10.5px;font-weight:800;text-transform:uppercase;color:#b45309;">Clientes con Saldo</p>
            <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#b45309;">${snapshot.totalClientsCount}</p>
            <p style="margin:2px 0 0;font-size:10.5px;color:#d97706;">${snapshot.totalPendingInvoicesCount} facturas pendientes</p>
          </td>
        </tr>
      </table>

      <h3 style="margin:0 0 10px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">
        Resumen de Cartera Activa (${snapshot.excludeWebPurchases ? 'Excluyendo Compra en Sitio Web' : 'Incluyendo Compra en Sitio Web'})
      </h3>

      <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background-color:#0B2737;color:#ffffff;font-size:11px;text-transform:uppercase;">
            <th style="padding:10px 12px;text-align:left;">#</th>
            <th style="padding:10px 12px;text-align:left;">Cliente</th>
            <th style="padding:10px 12px;text-align:center;">Facturas</th>
            <th style="padding:10px 12px;text-align:right;">Saldo Total</th>
          </tr>
        </thead>
        <tbody>
          ${topClientsRows || '<tr><td colspan="4" style="padding:18px;text-align:center;color:#64748b;">No hay saldos pendientes por cobrar.</td></tr>'}
        </tbody>
      </table>

      ${
        remainingClientsCount > 0
          ? `<p style="margin:10px 0 0;font-size:12px;color:#64748b;text-align:center;">+ ${remainingClientsCount} cliente(s) adicional(es) incluidos en el Excel y PDF adjuntos.</p>`
          : ''
      }

      <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;text-align:center;">
        <a href="https://www.jrscargocr.com/admin/reportes-cobros" style="display:inline-block;background-color:#12435E;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;padding:11px 22px;border-radius:10px;">
          Abrir Panel de Control de Reportes &rarr;
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function executeSendARReport(opts: {
  recipientEmail: string;
  ccEmail?: string;
  excludeWebPurchases: boolean;
  trigger: 'manual' | 'auto_daily' | 'cron';
}) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPass) {
    throw new Error('Credenciales SMTP (SMTP_USER / SMTP_PASSWORD) no configuradas en el servidor.');
  }

  const snapshot = await buildAccountsReceivableSnapshot({
    excludeWebPurchases: opts.excludeWebPurchases,
  });

  const [xlsxBuffer, pdfBuffer] = await Promise.all([
    Promise.resolve(generateAccountsReceivableXlsxBuffer(snapshot)),
    generateAccountsReceivablePdfBuffer(snapshot),
  ]);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const triggerLabel =
    opts.trigger === 'manual'
      ? 'Envío Manual Instantáneo'
      : 'Reporte Diario Automático';

  const dateTag = snapshot.reportDateCr;
  const mailOptions: nodemailer.SendMailOptions = {
    from: `"JRS Cargo Finanzas" <${smtpUser}>`,
    to: opts.recipientEmail,
    ...(opts.ccEmail ? { cc: opts.ccEmail } : {}),
    subject: `📊 Reporte Diario de Cuentas por Cobrar (${dateTag}) - $${snapshot.totalPendingUsd.toFixed(2)} USD - JRS CARGO`,
    html: buildReportEmailHtml(snapshot, triggerLabel),
    attachments: [
      {
        filename: `Cuentas-por-Cobrar-JRS-Cargo-${dateTag}.xlsx`,
        content: xlsxBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      {
        filename: `Cuentas-por-Cobrar-JRS-Cargo-${dateTag}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  return snapshot;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const cronTrigger = searchParams.get('cron') === '1';

    const config = await loadARDailyReportState();
    const excludeWebParam = searchParams.get('excludeWeb');
    const excludeWeb =
      excludeWebParam !== null ? excludeWebParam === 'true' : config.excludeWebPurchases;

    // 1. Direct file download (Excel or PDF)
    if (format === 'xlsx') {
      const snapshot = await buildAccountsReceivableSnapshot({ excludeWebPurchases: excludeWeb });
      const buffer = generateAccountsReceivableXlsxBuffer(snapshot);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Cuentas-por-Cobrar-JRS-Cargo-${snapshot.reportDateCr}.xlsx"`,
        },
      });
    }

    if (format === 'pdf') {
      const snapshot = await buildAccountsReceivableSnapshot({ excludeWebPurchases: excludeWeb });
      const buffer = await generateAccountsReceivablePdfBuffer(snapshot);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Cuentas-por-Cobrar-JRS-Cargo-${snapshot.reportDateCr}.pdf"`,
        },
      });
    }

    // 2. Vercel Cron automatic daily trigger (/api/reports/accounts-receivable?cron=1)
    if (cronTrigger) {
      const todayCr = formatCostaRicaISO(new Date());
      if (!config.enabled) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'Envío diario automático desactivado en configuración.',
        });
      }
      if (config.lastAutoSentDateCr === todayCr) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: `El reporte diario de hoy (${todayCr}) ya fue enviado.`,
        });
      }

      const recipient = config.recipientEmail || DEFAULT_AR_REPORT_EMAIL;
      const snapshot = await executeSendARReport({
        recipientEmail: recipient,
        ccEmail: config.ccEmail,
        excludeWebPurchases: config.excludeWebPurchases,
        trigger: 'cron',
      });

      const entry: ARDailyReportHistoryEntry = {
        id: `ar-rep-${Date.now()}`,
        sentAtIso: new Date().toISOString(),
        sentAtDisplay: formatCostaRicaDateTime(),
        reportDateCr: todayCr,
        recipientEmail: recipient,
        ccEmail: config.ccEmail || undefined,
        trigger: 'cron',
        status: 'sent',
        totalPendingUsd: snapshot.totalPendingUsd,
        totalPendingCrc: snapshot.totalPendingCrc,
        clientsCount: snapshot.totalClientsCount,
        invoicesCount: snapshot.totalPendingInvoicesCount,
        exchangeRate: snapshot.exchangeRate,
        excludeWebPurchases: config.excludeWebPurchases,
      };

      const nextState = {
        ...config,
        lastAutoSentDateCr: todayCr,
        lastSentAtIso: entry.sentAtIso,
        history: [entry, ...(config.history || [])].slice(0, 120),
      };
      await saveARDailyReportState(nextState);

      return NextResponse.json({
        success: true,
        sent: true,
        entry,
      });
    }

    // 3. Default GET: return config, history, and live snapshot summary
    const snapshot = await buildAccountsReceivableSnapshot({
      excludeWebPurchases: config.excludeWebPurchases,
    });

    return NextResponse.json({
      success: true,
      config,
      snapshot,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al procesar reporte de cuentas por cobrar';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'send_now';
    const config = await loadARDailyReportState();

    // Action 1: Save configuration
    if (action === 'save_config') {
      const updatedConfig = {
        ...config,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : config.enabled,
        recipientEmail:
          typeof body.recipientEmail === 'string' && body.recipientEmail.trim()
            ? body.recipientEmail.trim()
            : DEFAULT_AR_REPORT_EMAIL,
        ccEmail: typeof body.ccEmail === 'string' ? body.ccEmail.trim() : config.ccEmail,
        sendTimeCr:
          typeof body.sendTimeCr === 'string' && /^\d{2}:\d{2}$/.test(body.sendTimeCr)
            ? body.sendTimeCr
            : config.sendTimeCr,
        excludeWebPurchases:
          body.excludeWebPurchases !== undefined
            ? Boolean(body.excludeWebPurchases)
            : config.excludeWebPurchases,
      };

      await saveARDailyReportState(updatedConfig);
      const snapshot = await buildAccountsReceivableSnapshot({
        excludeWebPurchases: updatedConfig.excludeWebPurchases,
      });

      return NextResponse.json({
        success: true,
        config: updatedConfig,
        snapshot,
      });
    }

    // Action 2: Automatic Daily Check from Admin Panel
    if (action === 'auto_check') {
      const todayCr = formatCostaRicaISO(new Date());
      if (!config.enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'disabled' });
      }
      if (config.lastAutoSentDateCr === todayCr) {
        return NextResponse.json({ success: true, skipped: true, reason: 'already_sent_today' });
      }

      // Check if current Costa Rica time has reached configured sendTimeCr (HH:mm)
      const nowCrTime = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'America/Costa_Rica',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      if (nowCrTime < (config.sendTimeCr || '07:00')) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: `waiting_until_${config.sendTimeCr}`,
        });
      }

      const recipient = config.recipientEmail || DEFAULT_AR_REPORT_EMAIL;
      const snapshot = await executeSendARReport({
        recipientEmail: recipient,
        ccEmail: config.ccEmail,
        excludeWebPurchases: config.excludeWebPurchases,
        trigger: 'auto_daily',
      });

      const entry: ARDailyReportHistoryEntry = {
        id: `ar-rep-${Date.now()}`,
        sentAtIso: new Date().toISOString(),
        sentAtDisplay: formatCostaRicaDateTime(),
        reportDateCr: todayCr,
        recipientEmail: recipient,
        ccEmail: config.ccEmail || undefined,
        trigger: 'auto_daily',
        status: 'sent',
        totalPendingUsd: snapshot.totalPendingUsd,
        totalPendingCrc: snapshot.totalPendingCrc,
        clientsCount: snapshot.totalClientsCount,
        invoicesCount: snapshot.totalPendingInvoicesCount,
        exchangeRate: snapshot.exchangeRate,
        excludeWebPurchases: config.excludeWebPurchases,
      };

      const nextState = {
        ...config,
        lastAutoSentDateCr: todayCr,
        lastSentAtIso: entry.sentAtIso,
        history: [entry, ...(config.history || [])].slice(0, 120),
      };
      await saveARDailyReportState(nextState);

      return NextResponse.json({
        success: true,
        sent: true,
        entry,
        config: nextState,
      });
    }

    // Action 3: Manual Send Now ('send_now')
    const recipient =
      typeof body.recipientEmail === 'string' && body.recipientEmail.trim()
        ? body.recipientEmail.trim()
        : config.recipientEmail || DEFAULT_AR_REPORT_EMAIL;
    const ccEmail =
      body.ccEmail !== undefined ? String(body.ccEmail).trim() : config.ccEmail;
    const excludeWeb =
      body.excludeWebPurchases !== undefined
        ? Boolean(body.excludeWebPurchases)
        : config.excludeWebPurchases;

    const todayCr = formatCostaRicaISO(new Date());

    try {
      const snapshot = await executeSendARReport({
        recipientEmail: recipient,
        ccEmail,
        excludeWebPurchases: excludeWeb,
        trigger: 'manual',
      });

      const entry: ARDailyReportHistoryEntry = {
        id: `ar-rep-${Date.now()}`,
        sentAtIso: new Date().toISOString(),
        sentAtDisplay: formatCostaRicaDateTime(),
        reportDateCr: todayCr,
        recipientEmail: recipient,
        ccEmail: ccEmail || undefined,
        trigger: 'manual',
        status: 'sent',
        totalPendingUsd: snapshot.totalPendingUsd,
        totalPendingCrc: snapshot.totalPendingCrc,
        clientsCount: snapshot.totalClientsCount,
        invoicesCount: snapshot.totalPendingInvoicesCount,
        exchangeRate: snapshot.exchangeRate,
        excludeWebPurchases: excludeWeb,
      };

      const nextState = {
        ...config,
        recipientEmail: recipient,
        ccEmail,
        excludeWebPurchases: excludeWeb,
        lastAutoSentDateCr: todayCr,
        lastSentAtIso: entry.sentAtIso,
        history: [entry, ...(config.history || [])].slice(0, 120),
      };
      await saveARDailyReportState(nextState);

      return NextResponse.json({
        success: true,
        sent: true,
        entry,
        config: nextState,
        snapshot,
      });
    } catch (sendErr: unknown) {
      const errMsg = sendErr instanceof Error ? sendErr.message : 'Error enviando correo';
      const failedEntry: ARDailyReportHistoryEntry = {
        id: `ar-rep-${Date.now()}`,
        sentAtIso: new Date().toISOString(),
        sentAtDisplay: formatCostaRicaDateTime(),
        reportDateCr: todayCr,
        recipientEmail: recipient,
        ccEmail: ccEmail || undefined,
        trigger: 'manual',
        status: 'error',
        totalPendingUsd: 0,
        totalPendingCrc: 0,
        clientsCount: 0,
        invoicesCount: 0,
        exchangeRate: 500,
        excludeWebPurchases: excludeWeb,
        errorMessage: errMsg,
      };
      const nextState = {
        ...config,
        history: [failedEntry, ...(config.history || [])].slice(0, 120),
      };
      await saveARDailyReportState(nextState);

      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error procesando solicitud';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
