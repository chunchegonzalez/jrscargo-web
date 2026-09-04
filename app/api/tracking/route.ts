import { NextResponse } from 'next/server';
import { getInventoryItem } from '@/lib/supabase';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackingNumber = searchParams.get('number');

  if (!trackingNumber) {
    return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
  }

  const apiToken = process.env.TRACKING_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTgyNiwiZW1haWwiOiJqb3NlZ29uMjAwMEBob3RtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6MTIsInRlbmFudElkIjoiOWRjZGFlZGItZmZlMS00M2Y3LWI1ZTgtMDMzOGVjYjk4NmQwIiwiY2xpZW50SWQiOjYwODMsImNsaWVudENvZGUiOiJKUlMtMTAwMSIsImlzVG9wTWFzdGVyIjpmYWxzZSwiaXNNYXlvcmlzdGEiOnRydWUsImlhdCI6MTc4NjIzNzE1Mn0.ZLEBwa8iR_wLw59Akpl-PpR_Mwq3h3IBO6XKVi2PZpQ";

  if (!apiToken) {
    return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
  }

  try {
    // 1. Calling the tracking endpoint for timeline, weight, fotos, status
    const [res, packagesList] = await Promise.all([
      fetch(`https://worldboxcr.com/api/jrscargo/tracking/${encodeURIComponent(trackingNumber)}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }),
      getWorldboxPackages(apiToken)
    ]);
    
    if (!res.ok) {
      console.error('Tracking API error:', res.status, await res.text());
      return NextResponse.json({ error: 'Tracking API responded with an error' }, { status: res.status });
    }

    const data = await res.json();
    
    // 2. Match package in Worldbox packages list to extract exact tenantName & clientCode
    if (data.package && packagesList && packagesList.length > 0) {
      const cleanSearch = trackingNumber.trim().toUpperCase();
      const matched = packagesList.find(p => (p.trackingNumber || '').trim().toUpperCase() === cleanSearch);
      
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
          // If we had no consignatario or matched clientName is a real person name, use it
          if (!data.package.consignatario) {
            data.package.consignatario = matched.clientName;
          }
        }
      }
    }

    // 3. Local inventory status check
    try {
      const localItem = await getInventoryItem(trackingNumber);
      if (localItem && localItem.status && localItem.status.includes('Entregado')) {
        if (!data.package) data.package = { tracking: trackingNumber };
        if (!data.timeline) data.timeline = [];
        
        data.package.statusLabel = 'Entregado';
        
        // Remove the existing 'Entregado' event if it already exists to avoid duplicates
        data.timeline = data.timeline.filter((e: { status: string }) => e.status !== 'Paquete Entregado');

        data.timeline.unshift({
          date: localItem.updated_at || localItem.created_at || new Date().toISOString(),
          status: 'Paquete Entregado',
          description: 'El paquete ha sido entregado exitosamente al cliente.',
          icon: 'circle'
        });
      }
    } catch (e) {
      console.error('Error fetching local inventory for tracking:', e);
    }

    // We pass the raw data to the frontend so it can be mapped.
    return NextResponse.json({
      trackingNumber,
      status: 'SUCCESS',
      rawData: data
    });

  } catch (error) {
    console.error('Error fetching tracking data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
