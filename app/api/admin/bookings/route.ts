import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('bookings')
      .select('*, passengers(*), flights(*), payments(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`pnr.ilike.%${search}%`);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    const bookings = data?.map(b => ({
      ...b,
      passenger: b.passengers,
      flight: b.flights,
      payment: b.payments,
    }));

    return NextResponse.json({ success: true, data: { bookings, total: count } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
