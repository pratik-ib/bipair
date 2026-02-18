import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatDateTime } from '@/lib/bipair-utils';

export async function GET(request: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const { data: payment } = await supabaseAdmin.from('payments').select('*').eq('id', params.paymentId).single();
    if (!payment) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('payment_id', params.paymentId).single();
    if (!booking) return NextResponse.json({ success: true, data: { payment } });

    const { data: passenger } = await supabaseAdmin.from('passengers').select('*').eq('id', booking.passenger_id).single();
    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', booking.flight_id).single();

    return NextResponse.json({
      success: true,
      data: {
        passengerName: passenger ? `${passenger.first_name} ${passenger.last_name}` : null,
        passportNumber: passenger?.passport_number,
        flightNumber: flight?.flight_number,
        route: flight ? `${flight.origin} → ${flight.destination}` : null,
        departureTime: flight?.departure_time ? formatDateTime(flight.departure_time) : null,
        fareClass: booking.fare_class,
        seatNumber: booking.seat_number,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
