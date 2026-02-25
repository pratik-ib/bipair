import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { ipAddress, userAgent } = extractRequestMeta(request);

  let body: any = {};
  try {
    body = await request.json();
    const { passengerId, message, bookingId } = body;
    const { data, error } = await supabaseAdmin.from('notifications').insert({
      passenger_id: passengerId, booking_id: bookingId || null,
      channel: 'whatsapp', message, status: 'sent',
    }).select().single();
    if (error) throw error;

    const rb = { success: true, data: { notificationId: data.id } };
    logApiRequest({ method: 'POST', path: '/api/notifications/send', requestBody: body, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'POST', path: '/api/notifications/send', requestBody: body, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}
