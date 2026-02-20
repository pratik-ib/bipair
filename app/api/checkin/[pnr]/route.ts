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
    logApiRequest({ method: 'GET', path, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) {
      logApiRequest({ method: 'GET', path, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking not found', apiKeyPresent: true });
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', booking.flight_id).single();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    const canCheckin = booking.status === 'confirmed' && booking.payment_status === 'paid';
    let reason = null;
    if (booking.status === 'checked_in') reason = 'Already checked in';
    else if (booking.status === 'cancelled') reason = 'Booking is cancelled';
    else if (booking.payment_status !== 'paid') reason = 'Payment not completed';

    logApiRequest({ method: 'GET', path, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json({
      success: true,
      data: {
        canCheckin,
        reason,
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
    });
  } catch (error: any) {
    logApiRequest({ method: 'GET', path, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { pnr: string } }) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const path = `/api/checkin/${params.pnr}`;

  if (!valid) {
    logApiRequest({ method: 'POST', path, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
    const { seatNumber } = body;
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) {
      logApiRequest({ method: 'POST', path, requestBody: body, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking not found', apiKeyPresent: true });
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }
    if (booking.status !== 'confirmed' || booking.payment_status !== 'paid') {
      logApiRequest({ method: 'POST', path, requestBody: body, responseStatus: 400, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking must be confirmed and paid', apiKeyPresent: true });
      return NextResponse.json({ success: false, error: 'Booking must be confirmed and paid to check in' }, { status: 400 });
    }

    const { data: seatCheck } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('flight_id', booking.flight_id)
      .eq('seat_number', seatNumber)
      .neq('status', 'cancelled')
      .neq('id', booking.id)
      .single();
    if (seatCheck) {
      logApiRequest({ method: 'POST', path, requestBody: body, responseStatus: 409, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Seat already occupied', apiKeyPresent: true });
      return NextResponse.json({ success: false, error: 'Seat already occupied' }, { status: 409 });
    }

    await supabaseAdmin.from('bookings').update({ seat_number: seatNumber, status: 'checked_in' }).eq('pnr', params.pnr);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    logApiRequest({ method: 'POST', path, requestBody: body, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json({
      success: true,
      data: {
        message: 'Check-in successful',
        seatNumber,
        boardingPassUrl: `${baseUrl}/api/boarding-pass/${params.pnr}`,
        confirmationPageUrl: `${baseUrl}/checkin/${params.pnr}`,
        seatMapImageUrl: `${baseUrl}/api/checkin/${params.pnr}/seat-map-image`,
      },
    });
  } catch (error: any) {
    logApiRequest({ method: 'POST', path, requestBody: body, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
