import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { getDurationMinutes } from '@/lib/bipair-utils';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  if (!valid) {
    const rb = { success: false, error: 'Unauthorized' };
    logApiRequest({ method: 'GET', path: '/api/flights/search', queryParams, responseBody: rb, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json(rb, { status: 401 });
  }

  try {
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');

    let query = supabaseAdmin.from('flights').select('*').neq('status', 'cancelled');
    if (origin) query = query.ilike('origin', `%${origin}%`);
    if (destination) query = query.ilike('destination', `%${destination}%`);
    if (date) {
      const startDate = new Date(`${date}T00:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.gte('departure_time', startDate.toISOString()).lt('departure_time', endDate.toISOString());
    }

    const { data: flights, error } = await query.order('departure_time');
    if (error) throw error;

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

    const rb = { success: true, data: result };
    logApiRequest({ method: 'GET', path: '/api/flights/search', queryParams, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'GET', path: '/api/flights/search', queryParams, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}
