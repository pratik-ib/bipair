import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';

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
    const allowed = ['status', 'seat_number', 'special_requests', 'payment_status'];
    const updates: any = {};
    for (const key of allowed) { if (body[key] !== undefined) updates[key] = body[key]; }

    const { data, error } = await supabaseAdmin.from('bookings').update(updates).eq('pnr', params.pnr).select().single();
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
