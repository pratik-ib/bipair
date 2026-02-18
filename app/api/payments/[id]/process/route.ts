import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateTransactionRef } from '@/lib/bipair-utils';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { cardLastFour, cardholderName } = await request.json();
    
    // Fetch payment with booking details
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*, bookings(*)')
      .eq('id', params.id)
      .single();
    
    if (!payment) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });

    // 90% success, 10% failure
    const isSuccess = Math.random() < 0.9;
    const transactionRef = generateTransactionRef();

    if (isSuccess) {
      // Update payment status
      await supabaseAdmin.from('payments').update({
        status: 'success', 
        card_last_four: cardLastFour, 
        transaction_ref: transactionRef,
      }).eq('id', params.id);
      
      const booking = Array.isArray(payment.bookings) ? payment.bookings[0] : payment.bookings;
      
      if (booking?.id) {
        // Update booking status
        await supabaseAdmin.from('bookings').update({ 
          status: 'confirmed', 
          payment_status: 'paid' 
        }).eq('id', booking.id);

        // Fire webhook if configured (non-blocking)
        if (payment.webhook_url) {
          fireWebhook(payment, booking, transactionRef);
        }
      }
      
      return NextResponse.json({ success: true, data: { status: 'success', transactionRef } });
    } else {
      // Payment failed
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

/**
 * Fire webhook notification asynchronously (non-blocking)
 * This ensures webhook failures don't affect the payment response
 */
function fireWebhook(payment: any, booking: any, transactionRef: string) {
  // Non-blocking async webhook fire
  (async () => {
    try {
      // Fetch full passenger and flight details for webhook payload
      const { data: passenger } = await supabaseAdmin
        .from('passengers')
        .select('*')
        .eq('id', booking.passenger_id)
        .single();

      const { data: flight } = await supabaseAdmin
        .from('flights')
        .select('*')
        .eq('id', booking.flight_id)
        .single();

      if (!passenger || !flight) {
        console.error('Webhook: Missing passenger or flight data');
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      
      const webhookPayload = {
        event: 'payment.success',
        pnr: booking.pnr,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        transactionRef: transactionRef,
        ticketUrl: `${baseUrl}/api/ticket/${booking.pnr}`,
        checkInUrl: `${baseUrl}/checkin/${booking.pnr}`,
        boardingPassUrl: `${baseUrl}/api/boarding-pass/${booking.pnr}`,
        passenger: {
          firstName: passenger.first_name,
          lastName: passenger.last_name,
          phone: passenger.phone,
          email: passenger.email,
          loyaltyPoints: passenger.loyalty_points,
        },
        flight: {
          flightNumber: flight.flight_number,
          origin: flight.origin,
          originCity: flight.origin_city,
          destination: flight.destination,
          destinationCity: flight.destination_city,
          departureTime: flight.departure_time,
          arrivalTime: flight.arrival_time,
          gate: flight.gate,
          terminal: flight.terminal,
          status: flight.status,
        },
        booking: {
          seatNumber: booking.seat_number,
          fareClass: booking.fare_class,
          bookingSource: booking.booking_source,
          createdAt: booking.created_at,
        },
      };

      const response = await fetch(payment.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (response.ok) {
        console.log(`Webhook delivered successfully to ${payment.webhook_url} for PNR ${booking.pnr}`);
      } else {
        console.error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('Webhook delivery failed:', err);
    }
  })();
}
