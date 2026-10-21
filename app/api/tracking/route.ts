import { NextResponse } from 'next/server';
import { getInventoryItem } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Cache for Worldbox packages list (60 seconds TTL)
let cachedPackages: Array<{
  trackingNumber?: string;
  tenantName?: string;
  clientName?: string;
  clientCode?: string;
  consignatario?: string;
}> | null = null;
let lastCacheTime = 0;

async function getWorldboxPackages(apiToken: string) {
  const now = Date.now();
  if (cachedPackages && (now - lastCacheTime < 60000)) {
    return cachedPackages;
  }
  try {
    const res = await fetch('https://worldboxcr.com/api/jrscargo/packages', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 }
    });
    if (res.ok) {
      cachedPackages = await res.json();
      lastCacheTime = Date.now();
      return cachedPackages;
    }
  } catch (e) {
    console.error('Error fetching Worldbox packages list:', e);
  }
  return cachedPackages || [];
}

interface RawTimelineEvent {
  date?: string;
  status?: string;
  description?: string;
  icon?: string;
}

interface NormalizedTimelineEvent {
  date: string;
  status: string;
  description: string;
  icon: string;
  stageKey: string;
}

function normalizeAndDeduplicateTimeline(
  rawTimeline: RawTimelineEvent[],
  isRegisteredInCR: boolean,
  isDeliveredInCR: boolean,
  localItem: { created_at?: string; updated_at?: string; received_date?: string } | null
): { timeline: Array<{ date: string; status: string; description: string; icon: string }>; stageKeys: Set<string> } {
  const normalizedList: NormalizedTimelineEvent[] = [];

  for (const evt of rawTimeline) {
    const rawStatus = (evt.status || evt.description || '').trim();
    const rawDesc = (evt.description || '').trim();
    if (!rawStatus) continue;

    const combined = `${rawStatus} ${rawDesc}`.toLowerCase();
    const date = evt.date || '';

    // 1. Worldbox central office / nationalized / premature delivery statuses
    if (
      combined.includes('oficina central') ||
      combined.includes('sede central') ||
      combined.includes('nacionalizado') ||
      combined.includes('por entregar') ||
      combined.includes('cambio de estatus') ||
      combined.includes('entregado')
    ) {
      if (isRegisteredInCR) {
        normalizedList.push({
          date,
          status: 'Paquete nacionalizado en Costa Rica',
          description: 'Liberación aduanal completada y trasladado a bodega central.',
          icon: 'warehouse',
          stageKey: 'STAGE_CR_NATIONALIZED'
        });
      } else {
        normalizedList.push({
          date,
          status: 'Paquete nacionalizado — En tránsito a Bodega JRS',
          description: 'Proceso aduanal completado. En traslado hacia el inventario de Costa Rica.',
          icon: 'truck',
          stageKey: 'STAGE_CR_NATIONALIZED'
        });
      }
      continue;
    }

    // 2. Customs in Costa Rica
    if (combined.includes('aduana')) {
      normalizedList.push({
        date,
        status: 'Paquete en aduanas de Costa Rica',
        description: 'En proceso de revisión y desalmacenaje aduanal en Costa Rica.',
        icon: 'package',
        stageKey: 'STAGE_CR_CUSTOMS'
      });
      continue;
    }

    // 3. In transit / flight / manifest to Costa Rica
    if (
      combined.includes('tránsito') ||
      combined.includes('transito') ||
      combined.includes('manifiesto') ||
      combined.includes('vuelo') ||
      combined.includes('despachado') ||
      combined.includes('en camino') ||
      combined.includes('embarcado')
    ) {
      normalizedList.push({
        date,
        status: 'En tránsito hacia Costa Rica',
        description: 'El paquete salió de la bodega de origen y viaja hacia Costa Rica.',
        icon: 'plane',
        stageKey: 'STAGE_IN_TRANSIT'
      });
      continue;
    }

    // 4. Received at origin warehouse (Miami / Spain / China)
    if (
      combined.includes('miami') ||
      combined.includes('bodega origen') ||
      combined.includes('recibido en bodega') ||
      combined.includes('recibido y procesado') ||
      combined.includes('warehouse')
    ) {
      normalizedList.push({
        date,
        status: 'Paquete recibido y procesado en Bodega Miami',
        description: 'Recibido, pesado y procesado en nuestro centro de distribución en Miami.',
        icon: 'warehouse',
        stageKey: 'STAGE_ORIGIN_MIA'
      });
      continue;
    }

    // 5. Created / Registered in system
    if (combined.includes('creado') || combined.includes('registrado en el sistema')) {
      normalizedList.push({
        date,
        status: 'Paquete registrado en el sistema',
        description: 'Guía registrada inicialmente en plataforma.',
        icon: 'package',
        stageKey: 'STAGE_CREATED'
      });
      continue;
    }

    // 5. Fallback for any other custom event: clean duplicate description
    const cleanStatusKey = rawStatus.toLowerCase().replace(/[.\s]+$/g, '');
    const cleanDescKey = rawDesc.toLowerCase().replace(/[.\s]+$/g, '');
    normalizedList.push({
      date,
      status: rawStatus.replace(/\.$/, ''),
      description: cleanDescKey && cleanDescKey !== cleanStatusKey ? rawDesc : '',
      icon: evt.icon || 'package',
      stageKey: `CUSTOM_${cleanStatusKey}`
    });
  }

  // Deduplicate by stageKey while preserving newest-first order
  const seenStages = new Set<string>();
  const deduped: Array<{ date: string; status: string; description: string; icon: string }> = [];

  // Prepend official Costa Rica local inventory milestones if registered in CR
  if (isRegisteredInCR && localItem) {
    if (isDeliveredInCR) {
      seenStages.add('STAGE_JRS_DELIVERED');
      deduped.push({
        date: localItem.updated_at || localItem.created_at || new Date().toISOString(),
        status: 'Paquete Entregado',
        description: 'El paquete ha sido entregado exitosamente al cliente.',
        icon: 'circle'
      });
    }

    seenStages.add('STAGE_JRS_POR_ENTREGAR');
    deduped.push({
      date: localItem.received_date || localItem.created_at || new Date().toISOString(),
      status: 'Por Entregar — En Bodega Costa Rica',
      description: 'Registrado en el inventario de Costa Rica y disponible para entrega al cliente.',
      icon: 'warehouse'
    });
  }

  for (const item of normalizedList) {
    if (seenStages.has(item.stageKey)) continue;
    seenStages.add(item.stageKey);
    deduped.push({
      date: item.date,
      status: item.status,
      description: item.description,
      icon: item.icon
    });
  }

  return { timeline: deduped, stageKeys: seenStages };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawNumber = searchParams.get('number');

  if (!rawNumber) {
    return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
  }

  // Clean invisible scanner control characters (GS1 \x1d, etc.) and whitespace
  let trackingNumber = rawNumber.replace(/[\x00-\x1F\x7F\s]+/g, '').trim();
  if (!trackingNumber) {
    return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
  }

  const apiToken = process.env.TRACKING_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTgyNiwiZW1haWwiOiJqb3NlZ29uMjAwMEBob3RtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6MTIsInRlbmFudElkIjoiOWRjZGFlZGItZmZlMS00M2Y3LWI1ZTgtMDMzOGVjYjk4NmQwIiwiY2xpZW50SWQiOjYwODMsImNsaWVudENvZGUiOiJKUlMtMTAwMSIsImlzVG9wTWFzdGVyIjpmYWxzZSwiaXNNYXlvcmlzdGEiOnRydWUsImlhdCI6MTc4NjIzNzE1Mn0.ZLEBwa8iR_wLw59Akpl-PpR_Mwq3h3IBO6XKVi2PZpQ";

  if (!apiToken) {
    return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
  }

  try {
    // 1. Calling the tracking endpoint for timeline, weight, fotos, status
    const [initialRes, packagesList] = await Promise.all([
      fetch(`https://worldboxcr.com/api/jrscargo/tracking/${encodeURIComponent(trackingNumber)}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }),
      getWorldboxPackages(apiToken)
    ]);

    let res = initialRes;

    // Fallback 1: If barcode gun included USPS 420XXXXX / 420XXXXXXXXX ZIP routing prefix or matches a package in packagesList
    if (!res.ok) {
      const strippedUSPS = trackingNumber
        .replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '')
        .replace(/^420\d{5}/i, '');
      let candidateTracking = strippedUSPS !== trackingNumber && strippedUSPS.length >= 8 ? strippedUSPS : '';

      if (!candidateTracking && packagesList && packagesList.length > 0) {
        const upperInput = trackingNumber.toUpperCase();
        const foundInList = packagesList.find(p => {
          const t = (p.trackingNumber || '').trim().toUpperCase();
          if (!t || t.length < 8) return false;
          return t === upperInput || upperInput.endsWith(t) || t.endsWith(upperInput);
        });
        if (foundInList?.trackingNumber) {
          candidateTracking = foundInList.trackingNumber.trim();
        }
      }

      if (candidateTracking && candidateTracking.toUpperCase() !== trackingNumber.toUpperCase()) {
        const retryRes = await fetch(`https://worldboxcr.com/api/jrscargo/tracking/${encodeURIComponent(candidateTracking)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (retryRes.ok) {
          res = retryRes;
          trackingNumber = candidateTracking;
        }
      }
    }
    
    if (!res.ok) {
      // Fallback 2: Check if package already exists in local Supabase inventory
      try {
        const localFallback = await getInventoryItem(trackingNumber);

        if (localFallback) {
          const resolvedCode = String(localFallback.id || trackingNumber);
          const isDelivered = String(localFallback.status || '').toLowerCase().includes('entregad');
          const { timeline } = normalizeAndDeduplicateTimeline(
            Array.isArray(localFallback.history)
              ? localFallback.history.map((h: { date?: string; action?: string }) => ({
                  date: h.date || '',
                  status: h.action || 'En Bodega',
                  description: ''
                }))
              : [],
            true,
            isDelivered,
            localFallback
          );

          return NextResponse.json({
            trackingNumber: resolvedCode,
            status: 'SUCCESS',
            localItem: localFallback,
            rawData: {
              package: {
                tracking: resolvedCode,
                consignatario: localFallback.client || 'Desconocido',
                company: localFallback.company || 'JRS CARGO',
                provider: localFallback.company || 'JRS CARGO',
                weight: String(localFallback.weight || '0').replace(/[^\d.]/g, '') || '0',
                weightUnit: String(localFallback.weight || '').toLowerCase().includes('kg') ? 'kg' : 'lbs',
                statusLabel: isDelivered ? 'Entregado' : 'Por Entregar',
                description: 'Paquete registrado en inventario de Costa Rica'
              },
              timeline
            }
          });
        }
      } catch {
        // Ignore local fallback error
      }

      console.error('Tracking API error:', res.status, await res.text());
      return NextResponse.json({ error: 'Tracking API responded with an error' }, { status: res.status });
    }

    const data = await res.json();
    
    // 2. Match package in Worldbox packages list to extract exact tenantName & clientCode
    if (data.package && packagesList && packagesList.length > 0) {
      const cleanSearch = trackingNumber.trim().toUpperCase();
      const matched = packagesList.find(p => {
        const pt = (p.trackingNumber || '').trim().toUpperCase();
        return pt === cleanSearch || pt.endsWith(cleanSearch) || cleanSearch.endsWith(pt);
      });
      
      if (matched) {
        data.package.tenantName = matched.tenantName;
        data.package.clientName = matched.clientName;
        data.package.clientCode = matched.clientCode;
        
        const upperTenant = (matched.tenantName || '').toUpperCase();
        const upperCode = (matched.clientCode || '').toUpperCase();
        
        if (upperTenant.includes('ATLANTIC') || upperCode.startsWith('AT-') || upperCode.includes('ATLANTIC')) {
          data.package.provider = 'ATLANTIC IMPORTS';
          data.package.company = 'ATLANTIC IMPORTS';
        } else if (upperTenant.includes('TRINITY') || upperCode.startsWith('TB-') || upperCode.startsWith('TRINITY') || upperCode.includes('TRINITY')) {
          data.package.provider = 'TRINITY BOX';
          data.package.company = 'TRINITY BOX';
        } else if (upperTenant.includes('LOGISTICS') || upperTenant.includes('JR ') || upperCode.startsWith('JR-') || upperCode.startsWith('JRL-')) {
          data.package.provider = 'JR LOGISTICS';
          data.package.company = 'JR LOGISTICS';
        } else {
          data.package.provider = 'JRS CARGO';
          data.package.company = 'JRS CARGO';
        }

        const genericCompanies = ['JRS CARGO', 'ATLANTIC IMPORTS', 'JR LOGISTICS', 'TRINITY BOX'];
        const isGenericClientName = genericCompanies.includes((matched.clientName || '').trim().toUpperCase());
        
        if (matched.clientName && (!data.package.consignatario || !isGenericClientName)) {
          if (!data.package.consignatario) {
            data.package.consignatario = matched.clientName;
          }
        }
      }
    }

    // 3. Local Costa Rica inventory status check & timeline deduplication
    let localItem = null;
    try {
      localItem = await getInventoryItem(trackingNumber);
    } catch (e) {
      console.error('Error fetching local inventory for tracking:', e);
    }

    const isRegisteredInCR = Boolean(localItem && localItem.status && localItem.status !== 'Eliminado');
    const isDeliveredInCR = Boolean(
      isRegisteredInCR && String(localItem.status).toLowerCase().includes('entregad')
    );

    if (!data.package) {
      data.package = { tracking: trackingNumber };
    }

    const rawTimeline: RawTimelineEvent[] = Array.isArray(data.timeline) ? data.timeline : [];
    const { timeline: cleanTimeline, stageKeys } = normalizeAndDeduplicateTimeline(
      rawTimeline,
      isRegisteredInCR,
      isDeliveredInCR,
      localItem
    );

    data.timeline = cleanTimeline;

    // Only show "Por Entregar" (or "Entregado") once registered in the Costa Rica inventory
    if (isDeliveredInCR) {
      data.package.statusLabel = 'Entregado';
    } else if (isRegisteredInCR) {
      data.package.statusLabel = 'Por Entregar';
    } else {
      // Not yet registered in Costa Rica inventory -> never show "Por Entregar" or "Entregado"
      if (stageKeys.has('STAGE_CR_NATIONALIZED') || stageKeys.has('STAGE_CR_CUSTOMS')) {
        data.package.statusLabel = 'En Tránsito a Bodega CR';
      } else if (stageKeys.has('STAGE_IN_TRANSIT')) {
        data.package.statusLabel = 'En Tránsito a Costa Rica';
      } else {
        const rawStatusLabel = String(data.package.statusLabel || '').toLowerCase();
        if (
          rawStatusLabel.includes('por entregar') ||
          rawStatusLabel.includes('entregado') ||
          rawStatusLabel.includes('sede central') ||
          rawStatusLabel.includes('oficina central') ||
          rawStatusLabel.includes('aduana')
        ) {
          data.package.statusLabel = 'En Tránsito a Bodega CR';
        } else if (!data.package.statusLabel) {
          data.package.statusLabel = 'En Bodega Miami';
        }
      }
    }

    return NextResponse.json({
      trackingNumber,
      status: 'SUCCESS',
      localItem: localItem || null,
      rawData: data
    });

  } catch (error) {
    console.error('Error fetching tracking data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
