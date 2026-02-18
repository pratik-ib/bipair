import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Update payment to refunded
    const { data: payment, error: pErr } = await supabaseAdmin
      .from('payments').update({ status: 'refunded' }).eq('id', params.id).select().single();
    if (pErr) throw pErr;

    // Update booking payment_status to refunded
    await supabaseAdmin.from('bookings').update({ payment_status: 'refunded' }).eq('payment_id', params.id);

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
