import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export async function GET(request: NextRequest, { params }: { params: { pnr: string } }) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const path = `/api/checkin/${params.pnr}`;

  if (!valid) {
    const rb = { success: false, error: 'Unauthorized' };
    logApiRequest({ method: 'GET', path, responseBody: rb, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json(rb, { status: 401 });
  }

  try {
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) {
      const rb = { success: false, error: 'Booking not found' };
      logApiRequest({ method: 'GET', path, responseBody: rb, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking not found', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 404 });
    }

    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', booking.flight_id).single();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const canCheckin = booking.status === 'confirmed' && booking.payment_status === 'paid';
    let reason = null;
    if (booking.status === 'checked_in') reason = 'Already checked in';
    else if (booking.status === 'cancelled') reason = 'Booking is cancelled';
    else if (booking.payment_status !== 'paid') reason = 'Payment not completed';

    const rb = {
      success: true,
      data: {
        canCheckin, reason,
        currentSeat: booking.seat_number,
        checkinStatus: booking.status,
        seatMapImageUrl: `${baseUrl}/api/checkin/${params.pnr}/seat-map-image`,
        flight: {
          flightNumber: flight?.flight_number,
          origin: flight?.origin,
          destination: flight?.destination,
          departureTime: flight?.departure_time,
          gate: flight?.gate,
          terminal: flight?.terminal,
        },
      },
    };
    logApiRequest({ method: 'GET', path, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'GET', path, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { pnr: string } }) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const path = `/api/checkin/${params.pnr}`;

  if (!valid) {
    const rb = { success: false, error: 'Unauthorized' };
    logApiRequest({ method: 'POST', path, responseBody: rb, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json(rb, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
    const { seatNumber } = body;
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) {
      const rb = { success: false, error: 'Booking not found' };
      logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking not found', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 404 });
    }
    if (booking.status !== 'confirmed' || booking.payment_status !== 'paid') {
      const rb = { success: false, error: 'Booking must be confirmed and paid to check in' };
      logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 400, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking must be confirmed and paid', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 400 });
    }

    const { data: seatCheck } = await supabaseAdmin
      .from('bookings').select('id')
      .eq('flight_id', booking.flight_id).eq('seat_number', seatNumber)
      .neq('status', 'cancelled').neq('id', booking.id).single();
    if (seatCheck) {
      const rb = { success: false, error: 'Seat already occupied' };
      logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 409, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Seat already occupied', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 409 });
    }

    await supabaseAdmin.from('bookings').update({ seat_number: seatNumber, status: 'checked_in' }).eq('pnr', params.pnr);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const rb = {
      success: true,
      data: {
        message: 'Check-in successful', seatNumber,
        boardingPassUrl: `${baseUrl}/api/boarding-pass/${params.pnr}`,
        confirmationPageUrl: `${baseUrl}/checkin/${params.pnr}`,
        seatMapImageUrl: `${baseUrl}/api/checkin/${params.pnr}/seat-map-image`,
      },
    };
    logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'POST', path, requestBody: body, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}
