import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('notifications')
      .select('*, passengers(first_name, last_name, phone), bookings(pnr)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const notifications = data?.map(n => ({
      ...n,
      passenger: n.passengers,
      booking: n.bookings,
    })) || [];

    return NextResponse.json({ success: true, data: { notifications, total: count } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
