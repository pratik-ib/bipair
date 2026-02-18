import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: { phone: string } }) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const phone = decodeURIComponent(params.phone);
    const { data: passenger } = await supabaseAdmin.from('passengers').select('*').eq('phone', phone).single();
    if (!passenger) return NextResponse.json({ success: false, error: 'Passenger not found' }, { status: 404 });

    const { data: bookingsRaw } = await supabaseAdmin
      .from('bookings').select('*, flights(*)').eq('passenger_id', passenger.id).order('created_at', { ascending: false });
    const bookings = bookingsRaw?.map(b => ({ ...b, flight: b.flights })) || [];

    return NextResponse.json({ success: true, data: { passenger, bookings } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
