import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type WorldboxPackageApiItem = {
  trackingNumber?: string;
  tenantName?: string;
  clientName?: string;
  clientCode?: string;
  consignatario?: string;
  weight?: string | number;
};

// In-memory cache for Worldbox packages list (60 seconds TTL)
let cachedWorldboxPackages: WorldboxPackageApiItem[] = [];
let lastCacheTime = 0;

export async function GET() {
  const apiToken =
    process.env.TRACKING_API_TOKEN ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTgyNiwiZW1haWwiOiJqb3NlZ29uMjAwMEBob3RtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6MTIsInRlbmFudElkIjoiOWRjZGFlZGItZmZlMS00M2Y3LWI1ZTgtMDMzOGVjYjk4NmQwIiwiY2xpZW50SWQiOjYwODMsImNsaWVudENvZGUiOiJKUlMtMTAwMSIsImlzVG9wTWFzdGVyIjpmYWxzZSwiaXNNYXlvcmlzdGEiOnRydWUsImlhdCI6MTc4NjIzNzE1Mn0.ZLEBwa8iR_wLw59Akpl-PpR_Mwq3h3IBO6XKVi2PZpQ';

  const now = Date.now();
  if (cachedWorldboxPackages.length > 0 && now - lastCacheTime < 60000) {
    const res = NextResponse.json({
      success: true,
      count: cachedWorldboxPackages.length,
      data: cachedWorldboxPackages,
      cached: true
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }

  try {
    const res = await fetch('https://worldboxcr.com/api/jrscargo/packages', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        cachedWorldboxPackages = data;
        lastCacheTime = Date.now();
      }
      const response = NextResponse.json({
        success: true,
        count: Array.isArray(data) ? data.length : 0,
        data: Array.isArray(data) ? data : []
      });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }

    // Return whatever cached packages we have on non-ok status
    return NextResponse.json({
      success: false,
      error: `Worldbox responded with ${res.status}`,
      count: cachedWorldboxPackages.length,
      data: cachedWorldboxPackages
    });
  } catch (error) {
    console.error('Error fetching Worldbox packages in /api/worldbox/packages:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching Worldbox packages',
      count: cachedWorldboxPackages.length,
      data: cachedWorldboxPackages
    });
  }
}
