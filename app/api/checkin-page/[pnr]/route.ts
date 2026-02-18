import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { pnr: string } }) {
  try {
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { data: passenger } = await supabaseAdmin.from('passengers').select('*').eq('id', booking.passenger_id).single();
    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', booking.flight_id).single();

    return NextResponse.json({
      success: true,
      data: {
        status: booking.status,
        pnr: booking.pnr,
        seatNumber: booking.seat_number,
        passengerName: passenger ? `${passenger.first_name} ${passenger.last_name}` : null,
        flightNumber: flight?.flight_number,
        route: flight ? `${flight.origin} → ${flight.destination}` : null,
        departureTime: flight?.departure_time,
        gate: flight?.gate,
        terminal: flight?.terminal,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
