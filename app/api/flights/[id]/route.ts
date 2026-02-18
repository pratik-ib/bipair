import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { getDurationMinutes } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: f, error } = await supabaseAdmin.from('flights').select('*').eq('id', params.id).single();
    if (error || !f) return NextResponse.json({ success: false, error: 'Flight not found' }, { status: 404 });

    const { data: bookings } = await supabaseAdmin
      .from('bookings').select('fare_class').eq('flight_id', params.id).neq('status', 'cancelled');
    const econBooked = bookings?.filter(b => b.fare_class === 'economy').length || 0;
    const bizBooked = bookings?.filter(b => b.fare_class === 'business').length || 0;
    const fcBooked = bookings?.filter(b => b.fare_class === 'first_class').length || 0;

    return NextResponse.json({
      success: true,
      data: {
        ...f,
        durationMinutes: getDurationMinutes(f.departure_time, f.arrival_time),
        availableSeats: {
          economy: Math.max(0, f.economy_seats - econBooked),
          business: Math.max(0, f.business_seats - bizBooked),
          firstClass: Math.max(0, f.first_class_seats - fcBooked),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
