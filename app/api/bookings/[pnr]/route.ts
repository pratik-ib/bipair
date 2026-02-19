import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';

// Force dynamic rendering - prevent Vercel edge caching
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
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const booking = await getBookingByPnr(params.pnr);
    if (!booking) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: booking });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { pnr: string } }) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Accept both camelCase and snake_case keys for all allowed fields
    const updates: any = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.seat_number !== undefined) updates.seat_number = body.seat_number;
    if (body.seatNumber !== undefined) updates.seat_number = body.seatNumber;
    if (body.special_requests !== undefined) updates.special_requests = body.special_requests;
    if (body.specialRequests !== undefined) updates.special_requests = body.specialRequests;
    if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
    if (body.paymentStatus !== undefined) updates.payment_status = body.paymentStatus;

    // Guard: if no valid fields provided, return 400 instead of sending empty update to Supabase
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update. Allowed fields: status, seat_number, special_requests, payment_status' },
        { status: 400 }
      );
    }

    // First verify the booking exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('pnr', params.pnr)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });

    // Perform the update and return the updated row
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('pnr', params.pnr)
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { pnr: string } }) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('pnr', params.pnr);
    let refunded = false;
    if (booking.payment_id && booking.payment_status === 'paid') {
      await supabaseAdmin.from('payments').update({ status: 'refunded' }).eq('id', booking.payment_id);
      await supabaseAdmin.from('bookings').update({ payment_status: 'refunded' }).eq('pnr', params.pnr);
      refunded = true;
    }
    return NextResponse.json({ success: true, data: { refunded } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
