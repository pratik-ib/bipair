import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { generatePNR } from '@/lib/bipair-utils';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

const LOYALTY_POINTS: Record<string, number> = {
  economy: 100,
  business: 250,
  first_class: 500,
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);

  if (!valid) {
    logApiRequest({ method: 'POST', path: '/api/bookings', responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
    const {
      passengerPhone, firstName, lastName, email,
      passportNumber, nationality, dateOfBirth,
      flightId, fareClass, seatNumber, specialRequests,
      webhookUrl,
    } = body;

    // Get or create passenger
    let passenger: any;
    const { data: existing } = await supabaseAdmin
      .from('passengers').select('*').eq('phone', passengerPhone).single();

    if (existing) {
      passenger = existing;
    } else {
      const { data: newP, error: pErr } = await supabaseAdmin.from('passengers').insert({
        first_name: firstName, last_name: lastName,
        email, phone: passengerPhone,
        passport_number: passportNumber,
        nationality, date_of_birth: dateOfBirth,
        loyalty_points: 0,
      }).select().single();
      if (pErr) throw pErr;
      passenger = newP;
    }

    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', flightId).single();
    if (!flight) {
      logApiRequest({ method: 'POST', path: '/api/bookings', requestBody: body, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Flight not found', apiKeyPresent: true });
      return NextResponse.json({ success: false, error: 'Flight not found' }, { status: 404 });
    }

    if (seatNumber) {
      const { data: existingSeats, error: seatError } = await supabaseAdmin
        .from('bookings')
        .select('id, pnr')
        .eq('flight_id', flightId)
        .eq('seat_number', seatNumber)
        .neq('status', 'cancelled');
      if (!seatError && existingSeats && existingSeats.length > 0) {
        logApiRequest({ method: 'POST', path: '/api/bookings', requestBody: body, responseStatus: 409, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: `Seat ${seatNumber} already taken`, apiKeyPresent: true });
        return NextResponse.json({ success: false, error: `Seat ${seatNumber} is already taken on this flight` }, { status: 409 });
      }
    }

    const priceMap: Record<string, number> = {
      economy: flight.economy_price,
      business: flight.business_price,
      first_class: flight.first_class_price,
    };
    const amount = priceMap[fareClass] || flight.economy_price;

    let pnr = generatePNR();
    let pnrExists = true;
    while (pnrExists) {
      const { data: check } = await supabaseAdmin.from('bookings').select('id').eq('pnr', pnr).single();
      if (!check) pnrExists = false;
      else pnr = generatePNR();
    }

    const { data: booking, error: bErr } = await supabaseAdmin.from('bookings').insert({
      pnr, passenger_id: passenger.id, flight_id: flightId,
      seat_number: seatNumber, fare_class: fareClass,
      status: 'pending', payment_status: 'pending',
      total_amount: amount, booking_source: 'whatsapp',
      special_requests: specialRequests,
    }).select().single();
    if (bErr) throw bErr;

    const paymentData: any = {
      booking_id: booking.id,
      amount, currency: 'USD',
      status: 'pending', payment_method: 'card',
    };
    if (webhookUrl) paymentData.webhook_url = webhookUrl;

    const { data: payment, error: payErr } = await supabaseAdmin.from('payments').insert(paymentData).select().single();
    if (payErr) throw payErr;

    await supabaseAdmin.from('bookings').update({ payment_id: payment.id }).eq('id', booking.id);

    const points = LOYALTY_POINTS[fareClass] || 100;
    await supabaseAdmin.from('passengers').update({
      loyalty_points: (passenger.loyalty_points || 0) + points
    }).eq('id', passenger.id);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    logApiRequest({ method: 'POST', path: '/api/bookings', requestBody: body, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json({
      success: true,
      data: {
        pnr,
        bookingId: booking.id,
        paymentId: payment.id,
        amount,
        currency: 'USD',
        checkoutUrl: `${baseUrl}/checkout/${payment.id}`,
        ticketUrl: `${baseUrl}/api/ticket/${pnr}`,
        checkInUrl: `${baseUrl}/checkin/${pnr}`,
        boardingPassUrl: `${baseUrl}/api/boarding-pass/${pnr}`,
        passenger: {
          id: passenger.id,
          firstName: passenger.first_name,
          lastName: passenger.last_name,
          loyaltyPoints: passenger.loyalty_points + points
        },
      },
    });
  } catch (error: any) {
    logApiRequest({ method: 'POST', path: '/api/bookings', requestBody: body, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
