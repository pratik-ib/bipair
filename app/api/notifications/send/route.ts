import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { passengerId, message, bookingId } = await request.json();
    const { data, error } = await supabaseAdmin.from('notifications').insert({
      passenger_id: passengerId, booking_id: bookingId || null,
      channel: 'whatsapp', message, status: 'sent',
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data: { notificationId: data.id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
