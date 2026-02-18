import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { pnr } = await request.json();
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('pnr', pnr).single();
    if (!booking) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });

    let payment: any;
    if (booking.payment_id) {
      const { data } = await supabaseAdmin.from('payments').select('*').eq('id', booking.payment_id).single();
      payment = data;
    }
    if (!payment) {
      const { data: newPay } = await supabaseAdmin.from('payments').insert({
        booking_id: booking.id, amount: booking.total_amount,
        currency: 'USD', status: 'pending', payment_method: 'card',
      }).select().single();
      payment = newPay;
      await supabaseAdmin.from('bookings').update({ payment_id: payment.id }).eq('id', booking.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id, amount: payment.amount, currency: payment.currency,
        checkoutUrl: `${baseUrl}/checkout/${payment.id}`,
        bookingStatus: booking.status, paymentStatus: payment.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
