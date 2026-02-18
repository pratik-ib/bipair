import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: { pnr: string } }) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });

    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', booking.flight_id).single();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    const canCheckin = booking.status === 'confirmed' && booking.payment_status === 'paid';
    let reason = null;
    if (booking.status === 'checked_in') reason = 'Already checked in';
    else if (booking.status === 'cancelled') reason = 'Booking is cancelled';
    else if (booking.payment_status !== 'paid') reason = 'Payment not completed';

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { pnr: string } }) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { seatNumber } = await request.json();
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    if (booking.status !== 'confirmed' || booking.payment_status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Booking must be confirmed and paid to check in' }, { status: 400 });
    }

    // Check seat is not occupied
    const { data: seatCheck } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('flight_id', booking.flight_id)
      .eq('seat_number', seatNumber)
      .neq('status', 'cancelled')
      .neq('id', booking.id)
      .single();
    if (seatCheck) return NextResponse.json({ success: false, error: 'Seat already occupied' }, { status: 409 });

    await supabaseAdmin.from('bookings').update({ seat_number: seatNumber, status: 'checked_in' }).eq('pnr', params.pnr);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
