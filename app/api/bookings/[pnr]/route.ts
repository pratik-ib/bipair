import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getBookingByPnr(pnr: string) {
  const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', pnr).single();
  if (!booking) return null;
  const { data: passenger } = await supabaseAdmin.from('passengers').select('*').eq('id', booking.passenger_id).single();
  const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', booking.flight_id).single();
  const { data: payment } = booking.payment_id
    ? await supabaseAdmin.from('payments').select('*').eq('id', booking.payment_id)
    : { data: null };
  return { ...booking, passenger, flight, payment: Array.isArray(payment) ? payment[0] : payment };
}

export async function GET(request: NextRequest, { params }: { params: { pnr: string } }) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const path = `/api/bookings/${params.pnr}`;

  if (!valid) {
    const rb = { success: false, error: 'Unauthorized' };
    logApiRequest({ method: 'GET', path, responseBody: rb, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json(rb, { status: 401 });
  }

  try {
    const booking = await getBookingByPnr(params.pnr);
    if (!booking) {
      const rb = { success: false, error: 'Booking not found' };
      logApiRequest({ method: 'GET', path, responseBody: rb, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking not found', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 404 });
    }
    const rb = { success: true, data: booking };
    logApiRequest({ method: 'GET', path, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'GET', path, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { pnr: string } }) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const path = `/api/bookings/${params.pnr}`;

  if (!valid) {
    const rb = { success: false, error: 'Unauthorized' };
    logApiRequest({ method: 'PATCH', path, responseBody: rb, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json(rb, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();

    const updates: any = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.seat_number !== undefined) updates.seat_number = body.seat_number;
    if (body.seatNumber !== undefined) updates.seat_number = body.seatNumber;
    if (body.special_requests !== undefined) updates.special_requests = body.special_requests;
    if (body.specialRequests !== undefined) updates.special_requests = body.specialRequests;
    if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
    if (body.paymentStatus !== undefined) updates.payment_status = body.paymentStatus;

    if (Object.keys(updates).length === 0) {
      const rb = { success: false, error: 'No valid fields to update. Allowed fields: status, seat_number, special_requests, payment_status' };
      logApiRequest({ method: 'PATCH', path, requestBody: body, responseBody: rb, responseStatus: 400, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'No valid fields to update', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('bookings').select('id').eq('pnr', params.pnr).maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      const rb = { success: false, error: 'Booking not found' };
      logApiRequest({ method: 'PATCH', path, requestBody: body, responseBody: rb, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Booking not found', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('bookings').update(updates).eq('pnr', params.pnr).select().maybeSingle();
    if (error) throw error;

    const rb = { success: true, data };
    logApiRequest({ method: 'PATCH', path, requestBody: body, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'PATCH', path, requestBody: body, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { pnr: string } }) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const path = `/api/bookings/${params.pnr}`;

  if (!valid) {
    const rb = { success: false, error: 'Unauthorized' };
    logApiRequest({ method: 'DELETE', path, responseBody: rb, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json(rb, { status: 401 });
  }

  try {
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) {
      const rb = { success: false, error: 'Not found' };
      logApiRequest({ method: 'DELETE', path, responseBody: rb, responseStatus: 404, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Not found', apiKeyPresent: true });
      return NextResponse.json(rb, { status: 404 });
    }

    await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('pnr', params.pnr);
    let refunded = false;
    if (booking.payment_id && booking.payment_status === 'paid') {
      await supabaseAdmin.from('payments').update({ status: 'refunded' }).eq('id', booking.payment_id);
      await supabaseAdmin.from('bookings').update({ payment_status: 'refunded' }).eq('pnr', params.pnr);
      refunded = true;
    }
    const rb = { success: true, data: { refunded } };
    logApiRequest({ method: 'DELETE', path, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'DELETE', path, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}
