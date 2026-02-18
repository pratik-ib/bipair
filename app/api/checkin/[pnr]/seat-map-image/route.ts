import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSeatMapImage, uploadSeatMapToStorage } from '@/lib/seat-map';

export async function GET(request: NextRequest, { params }: { params: { pnr: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const highlight = searchParams.get('highlight') || undefined;
    const format = searchParams.get('format');

    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', params.pnr).single();
    if (!booking) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });

    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', booking.flight_id).single();
    if (!flight) return NextResponse.json({ success: false, error: 'Flight not found' }, { status: 404 });

    const { data: bookingsRaw } = await supabaseAdmin
      .from('bookings').select('seat_number').eq('flight_id', booking.flight_id).neq('status', 'cancelled');
    const occupiedSeats = bookingsRaw?.map(b => b.seat_number).filter(Boolean) || [];

    // Normalize the booking's fare class to ensure correct matching
    const fareClassMap: Record<string, 'economy' | 'business' | 'first_class'> = {
      'economy': 'economy',
      'business': 'business',
      'first_class': 'first_class',
    };
    const fareClass = fareClassMap[booking.fare_class] || undefined;

    const imageBuffer = await generateSeatMapImage({
      flightNumber: flight.flight_number,
      originCity: flight.origin_city,
      destinationCity: flight.destination_city,
      occupiedSeats,
      highlightSeat: highlight || booking.seat_number,
      headerText: 'CHECK-IN - SELECT YOUR SEAT',
      fareClass, // Automatically use booking's fare class
      seatConfig: {
        economySeats: flight.economy_seats || 48,
        businessSeats: flight.business_seats || 24,
        firstClassSeats: flight.first_class_seats || 12,
      },
    });

    if (format === 'url') {
      const filename = `checkin-${params.pnr}-${Date.now()}.png`;
      const imageUrl = await uploadSeatMapToStorage(imageBuffer, filename);
      return NextResponse.json({ success: true, data: { imageUrl } });
    }

    return new NextResponse(imageBuffer, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
