import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Admin endpoint for updating bookings - no API key required (session-based auth)
export async function PATCH(request: NextRequest, { params }: { params: { pnr: string } }) {
  try {
    const body = await request.json();
    const allowed = ['status', 'seat_number', 'special_requests', 'payment_status'];
    const updates: any = {};
    for (const key of allowed) { if (body[key] !== undefined) updates[key] = body[key]; }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('pnr', params.pnr)
      .select()
      .single();
    
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Admin endpoint for getting single booking details
export async function GET(request: NextRequest, { params }: { params: { pnr: string } }) {
  try {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        passengers(*),
        flights(*),
        payments(*)
      `)
      .eq('pnr', params.pnr)
      .single();
    
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...booking,
        passenger: booking.passengers,
        flight: booking.flights,
        payment: Array.isArray(booking.payments) ? booking.payments[0] : booking.payments
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
