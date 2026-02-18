import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSeatMapImage, uploadSeatMapToStorage } from '@/lib/seat-map';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const highlight = searchParams.get('highlight') || undefined;
    const format = searchParams.get('format');
    const fareClassParam = searchParams.get('fareClass') || searchParams.get('fare_class');
    
    // Validate fare class parameter
    const validFareClasses = ['economy', 'business', 'first_class'];
    const fareClass = fareClassParam && validFareClasses.includes(fareClassParam) 
      ? fareClassParam as 'economy' | 'business' | 'first_class' 
      : undefined;

    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', params.id).single();
    if (!flight) return NextResponse.json({ success: false, error: 'Flight not found' }, { status: 404 });

    const { data: bookings } = await supabaseAdmin
      .from('bookings').select('seat_number').eq('flight_id', params.id).neq('status', 'cancelled');
    const occupiedSeats = bookings?.map(b => b.seat_number).filter(Boolean) || [];

    const imageBuffer = await generateSeatMapImage({
      flightNumber: flight.flight_number,
      originCity: flight.origin_city,
      destinationCity: flight.destination_city,
      occupiedSeats,
      highlightSeat: highlight,
      fareClass,
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
