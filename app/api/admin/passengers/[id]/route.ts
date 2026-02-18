import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: passenger, error } = await supabaseAdmin
      .from('passengers').select('*').eq('id', params.id).single();
    if (error) throw error;

    const { data: bookingsRaw } = await supabaseAdmin
      .from('bookings')
      .select('*, flights(*)')
      .eq('passenger_id', params.id)
      .order('created_at', { ascending: false });

    const bookings = bookingsRaw?.map(b => ({ ...b, flight: b.flights })) || [];
    return NextResponse.json({ success: true, data: { passenger, bookings } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin.from('passengers').update(body).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
