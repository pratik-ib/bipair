import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateTransactionRef } from '@/lib/bipair-utils';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const path = `/api/payments/${params.id}/process`;

  let body: any = {};
  try {
    body = await request.json();
    const { cardLastFour, cardholderName, forceSuccess } = body;

    // Fetch payment with booking details
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*, bookings(*)')
      .eq('id', params.id)
      .single();

    if (!payment) {
      const rb = { success: false, error: 'Payment not found' };
      logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: false });
      return NextResponse.json(rb, { status: 404 });
    }

    // Mock payment: 90% success, 10% failure (unless forceSuccess is true)
    const isSuccess = forceSuccess === true || Math.random() < 0.9;
    const transactionRef = generateTransactionRef();

    console.log(`[Payment] Processing payment ${params.id}, forceSuccess=${forceSuccess}, result=${isSuccess ? 'SUCCESS' : 'FAILED'}`);

    if (isSuccess) {
      await supabaseAdmin.from('payments').update({
        status: 'success',
        card_last_four: cardLastFour,
        transaction_ref: transactionRef,
      }).eq('id', params.id);

      const booking = Array.isArray(payment.bookings) ? payment.bookings[0] : payment.bookings;

      if (booking?.id) {
        await supabaseAdmin.from('bookings').update({
          status: 'confirmed',
          payment_status: 'paid',
        }).eq('id', booking.id);

        // Fire webhook if configured - await to ensure completion on serverless
        if (payment.webhook_url) {
          console.log(`[Webhook] Triggering webhook for PNR ${booking.pnr} to ${payment.webhook_url}`);
          try {
            await fireWebhook(payment, booking, transactionRef);
          } catch (err) {
            console.error('[Webhook] Delivery error (non-blocking):', err);
          }
        } else {
          console.log(`[Webhook] No webhook URL configured for payment ${payment.id}`);
        }
      }

      const rb = { success: true, data: { status: 'success', transactionRef } };
      logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: false });
      return NextResponse.json(rb);
    } else {
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', params.id);

      const booking = Array.isArray(payment.bookings) ? payment.bookings[0] : payment.bookings;
      if (booking?.id) {
        await supabaseAdmin.from('bookings').update({ payment_status: 'failed' }).eq('id', booking.id);
      }

      const rb = { success: false, data: { status: 'failed', transactionRef: null } };
      logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: false });
      return NextResponse.json(rb);
    }
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: false });
    return NextResponse.json(rb, { status: 500 });
  }
}

/**
 * Fire webhook notification and log it as a separate entry in api_logs.
 * Uses path prefix "[WEBHOOK]" so it's clearly distinguishable from incoming API calls.
 */
async function fireWebhook(payment: any, booking: any, transactionRef: string): Promise<void> {
  const webhookStart = Date.now();

  try {
    console.log(`[Webhook] Starting webhook delivery for PNR ${booking.pnr}`);

    const { data: passenger } = await supabaseAdmin
      .from('passengers').select('*').eq('id', booking.passenger_id).single();

    const { data: flight } = await supabaseAdmin
      .from('flights').select('*').eq('id', booking.flight_id).single();

    if (!passenger || !flight) {
      console.error('[Webhook] Missing passenger or flight data');
      logApiRequest({
        method: 'POST',
        path: `[WEBHOOK] ${payment.webhook_url}`,
        requestBody: { error: 'Missing passenger or flight data — payload not built' },
        responseBody: null,
        responseStatus: 0,
        responseTimeMs: Date.now() - webhookStart,
        errorMessage: 'Missing passenger or flight data',
        apiKeyPresent: false,
      });
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    const webhookPayload = {
      event: 'payment.success',
      pnr: booking.pnr,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      transactionRef,
      ticketUrl: `${baseUrl}/api/ticket/${booking.pnr}`,
      checkInUrl: `${baseUrl}/checkin/${booking.pnr}`,
      boardingPassUrl: `${baseUrl}/api/boarding-pass/${booking.pnr}`,
      passenger: {
        firstName: passenger.first_name,
        lastName: passenger.last_name,
        phone: passenger.phone,
        email: passenger.email,
        loyaltyPoints: passenger.loyalty_points,
      },
      flight: {
        flightNumber: flight.flight_number,
        origin: flight.origin,
        originCity: flight.origin_city,
        destination: flight.destination,
        destinationCity: flight.destination_city,
        departureTime: flight.departure_time,
        arrivalTime: flight.arrival_time,
        gate: flight.gate,
        terminal: flight.terminal,
        status: flight.status,
      },
      booking: {
        seatNumber: booking.seat_number,
        fareClass: booking.fare_class,
        bookingSource: booking.booking_source,
        createdAt: booking.created_at,
      },
    };

    console.log(`[Webhook] Sending POST to ${payment.webhook_url}`);

    const response = await fetch(payment.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    // Try to read response body for logging
    let responseBody: any = null;
    try {
      const text = await response.text();
      // Try to parse as JSON, fall back to raw text
      try { responseBody = JSON.parse(text); } catch { responseBody = { raw: text }; }
    } catch { /* ignore */ }

    const deliveryStatus = response.ok ? 'delivered' : 'failed';
    console.log(`[Webhook] ${response.ok ? '✓' : '✗'} ${deliveryStatus} → ${response.status} ${response.statusText}`);

    logApiRequest({
      method: 'POST',
      path: `[WEBHOOK] ${payment.webhook_url}`,
      requestBody: webhookPayload,
      responseBody: responseBody ?? { httpStatus: response.status, statusText: response.statusText },
      responseStatus: response.status,
      responseTimeMs: Date.now() - webhookStart,
      errorMessage: response.ok ? null : `HTTP ${response.status} ${response.statusText}`,
      apiKeyPresent: false,
    });
  } catch (err: any) {
    console.error('[Webhook] ✗ Delivery error:', err);

    logApiRequest({
      method: 'POST',
      path: `[WEBHOOK] ${payment.webhook_url}`,
      requestBody: { pnr: booking.pnr, event: 'payment.success' },
      responseBody: null,
      responseStatus: 0,
      responseTimeMs: Date.now() - webhookStart,
      errorMessage: err?.message || 'Network error',
      apiKeyPresent: false,
    });
  }
}
