import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);

  if (!valid) {
    const rb = { success: false, error: 'Unauthorized' };
    logApiRequest({ method: 'POST', path: '/api/payments/initiate', responseBody: rb, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json(rb, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
    const { pnr } = body;
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', pnr).single();
    if (!booking) {
      const rb = { success: false, error: 'Booking not found' };
      logApiRequest({ method: 'POST', path: '/api/payments/initiate', requestBody: body, responseBody: rb, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking not found', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 404 });
    }

    let payment: any;
    if (booking.payment_id) {
      const { data } = await supabaseAdmin.from('payments').select('*').eq('id', booking.payment_id).single();
      payment = data;
    }
    if (!payment) {
      const { data: newPay } = await supabaseAdmin.from('payments').insert({
        booking_id: booking.id, amount: booking.total_amount,
        currency: 'USD', status: 'pending', payment_method: 'card',
      }).select().single();
      payment = newPay;
      await supabaseAdmin.from('bookings').update({ payment_id: payment.id }).eq('id', booking.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const rb = {
      success: true,
      data: {
        paymentId: payment.id, amount: payment.amount, currency: payment.currency,
        checkoutUrl: `${baseUrl}/checkout/${payment.id}`,
        bookingStatus: booking.status, paymentStatus: payment.status,
      },
    };
    logApiRequest({ method: 'POST', path: '/api/payments/initiate', requestBody: body, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'POST', path: '/api/payments/initiate', requestBody: body, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}
