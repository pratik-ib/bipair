import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSeatMapImage, uploadSeatMapToStorage } from '@/lib/seat-map';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const highlight = searchParams.get('highlight') || undefined;
    const format = searchParams.get('format');
    const fareClassParam = (searchParams.get('fareClass') || searchParams.get('fare_class') || '').toLowerCase();
    
    // Normalize fare class parameter - accept multiple variations
    const fareClassMap: Record<string, 'economy' | 'business' | 'first_class'> = {
      'economy': 'economy',
      'econ': 'economy',
      'e': 'economy',
      'business': 'business',
      'biz': 'business',
      'b': 'business',
      'first_class': 'first_class',
      'first': 'first_class',
      'firstclass': 'first_class',
      'f': 'first_class',
    };
    const fareClass = fareClassMap[fareClassParam] || undefined;

    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', params.id).single();
    if (!flight) return NextResponse.json({ success: false, error: 'Flight not found' }, { status: 404 });

    // Query all bookings for this flight (not cancelled)
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('seat_number, status')
      .eq('flight_id', params.id);
    
    console.log(`[SeatMap] Flight ${params.id}: all bookings:`, bookings);
    
    // Filter out cancelled bookings and extract seat numbers
    const occupiedSeats = bookings
      ?.filter(b => b.status !== 'cancelled' && b.seat_number)
      .map(b => b.seat_number) || [];
    
    console.log(`[SeatMap] Flight ${params.id}: occupiedSeats =`, occupiedSeats);

    const imageBuffer = await generateSeatMapImage({
      flightNumber: flight.flight_number,
      originCity: flight.origin_city,
      destinationCity: flight.destination_city,
      occupiedSeats,
      highlightSeat: highlight,
      fareClass,
      seatConfig: {
        economySeats: flight.economy_seats || 48,
        businessSeats: flight.business_seats || 24,
        firstClassSeats: flight.first_class_seats || 12,
      },
    });

    if (format === 'url') {
      const filename = `flight-${params.id}-${Date.now()}.png`;
      const imageUrl = await uploadSeatMapToStorage(imageBuffer, filename);
      return NextResponse.json({ success: true, data: { imageUrl } });
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
