import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export async function GET(request: NextRequest, { params }: { params: { phone: string } }) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const path = `/api/passengers/${params.phone}`;

  if (!valid) {
    logApiRequest({ method: 'GET', path, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const phone = decodeURIComponent(params.phone);
    const { data: passenger } = await supabaseAdmin.from('passengers').select('*').eq('phone', phone).single();
    if (!passenger) {
      logApiRequest({ method: 'GET', path, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Passenger not found', apiKeyPresent: true });
      return NextResponse.json({ success: false, error: 'Passenger not found' }, { status: 404 });
    }

    const { data: bookingsRaw } = await supabaseAdmin
      .from('bookings').select('*, flights(*)').eq('passenger_id', passenger.id).order('created_at', { ascending: false });
    const bookings = bookingsRaw?.map(b => ({ ...b, flight: b.flights })) || [];

    logApiRequest({ method: 'GET', path, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json({ success: true, data: { passenger, bookings } });
  } catch (error: any) {
    logApiRequest({ method: 'GET', path, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
