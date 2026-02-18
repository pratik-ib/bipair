import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateTransactionRef } from '@/lib/bipair-utils';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { cardLastFour, cardholderName } = await request.json();
    const { data: payment } = await supabaseAdmin.from('payments').select('*, bookings(*)').eq('id', params.id).single();
    if (!payment) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });

    // 90% success, 10% failure
    const isSuccess = Math.random() < 0.9;
    const transactionRef = generateTransactionRef();

    if (isSuccess) {
      await supabaseAdmin.from('payments').update({
        status: 'success', card_last_four: cardLastFour, transaction_ref: transactionRef,
      }).eq('id', params.id);
      const booking = Array.isArray(payment.bookings) ? payment.bookings[0] : payment.bookings;
      if (booking?.id) {
        await supabaseAdmin.from('bookings').update({ status: 'confirmed', payment_status: 'paid' }).eq('id', booking.id);
      }
      return NextResponse.json({ success: true, data: { status: 'success', transactionRef } });
    } else {
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', params.id);
      const booking = Array.isArray(payment.bookings) ? payment.bookings[0] : payment.bookings;
      if (booking?.id) {
        await supabaseAdmin.from('bookings').update({ payment_status: 'failed' }).eq('id', booking.id);
      }
      return NextResponse.json({ success: false, data: { status: 'failed', transactionRef: null } });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
