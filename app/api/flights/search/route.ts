import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { getDurationMinutes } from '@/lib/bipair-utils';

export async function GET(request: NextRequest) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date'); // YYYY-MM-DD

    let query = supabaseAdmin.from('flights').select('*').neq('status', 'cancelled');
    if (origin) query = query.ilike('origin', `%${origin}%`);
    if (destination) query = query.ilike('destination', `%${destination}%`);
    if (date) {
      query = query.gte('departure_time', `${date}T00:00:00Z`).lt('departure_time', `${date}T23:59:59Z`);
    }

    const { data: flights, error } = await query.order('departure_time');
    if (error) throw error;

    // Calculate available seats for each flight
    const result = await Promise.all((flights || []).map(async (f) => {
      const { data: bookings } = await supabaseAdmin
        .from('bookings').select('fare_class').eq('flight_id', f.id).neq('status', 'cancelled');
      const econBooked = bookings?.filter(b => b.fare_class === 'economy').length || 0;
      const bizBooked = bookings?.filter(b => b.fare_class === 'business').length || 0;
      const fcBooked = bookings?.filter(b => b.fare_class === 'first_class').length || 0;
      return {
        id: f.id, flightNumber: f.flight_number,
        origin: f.origin, originCity: f.origin_city,
        destination: f.destination, destinationCity: f.destination_city,
        departureTime: f.departure_time, arrivalTime: f.arrival_time,
        durationMinutes: getDurationMinutes(f.departure_time, f.arrival_time),
        status: f.status, gate: f.gate, terminal: f.terminal,
        availableSeats: {
          economy: Math.max(0, f.economy_seats - econBooked),
          business: Math.max(0, f.business_seats - bizBooked),
          firstClass: Math.max(0, f.first_class_seats - fcBooked),
        },
        prices: {
          economy: f.economy_price,
          business: f.business_price,
          firstClass: f.first_class_price,
        },
      };
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
