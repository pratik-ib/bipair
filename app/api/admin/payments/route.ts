import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const { data: paymentsRaw, count, error } = await supabaseAdmin
      .from('payments')
      .select('*, bookings(pnr, passenger_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const payments = await Promise.all((paymentsRaw || []).map(async p => {
      let passenger = null;
      if (p.bookings?.passenger_id) {
        const { data } = await supabaseAdmin.from('passengers').select('first_name, last_name').eq('id', p.bookings.passenger_id).single();
        passenger = data;
      }
      return { ...p, booking: p.bookings, passenger };
    }));

    const response = NextResponse.json({ success: true, data: { payments, total: count } });
    // Prevent Vercel Edge caching for real-time data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
