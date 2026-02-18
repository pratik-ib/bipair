import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    // Flights today
    const { count: flightsToday } = await supabaseAdmin
      .from('flights')
      .select('*', { count: 'exact', head: true })
      .gte('departure_time', todayStart)
      .lt('departure_time', todayEnd);

    // Total bookings
    const { count: totalBookings } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Revenue today (paid bookings created today)
    const { data: todayBookings } = await supabaseAdmin
      .from('bookings')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', todayStart)
      .lt('created_at', todayEnd);
    const revenueToday = todayBookings?.reduce((s, b) => s + Number(b.total_amount || 0), 0) || 0;

    // Check-in rate
    const { count: confirmedCount } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['confirmed', 'checked_in']);
    const { count: checkedInCount } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'checked_in');
    const checkinRate = confirmedCount ? Math.round(((checkedInCount || 0) / confirmedCount) * 100) : 0;

    // Bookings per day (last 14 days)
    const bookingsPerDay: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
      const { count } = await supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lt('created_at', end);
      bookingsPerDay.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        count: count || 0,
      });
    }

    // Bookings by source
    const { data: allBookings } = await supabaseAdmin.from('bookings').select('booking_source');
    const sourceMap: Record<string, number> = {};
    allBookings?.forEach(b => {
      const src = b.booking_source || 'unknown';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const bookingsBySource = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

    // Recent bookings (last 10)
    const { data: recentRaw } = await supabaseAdmin
      .from('bookings')
      .select('*, passengers(first_name, last_name), flights(flight_number, origin, destination)')
      .order('created_at', { ascending: false })
      .limit(10);
    const recentBookings = recentRaw?.map(b => ({
      ...b,
      passenger_name: b.passengers ? `${b.passengers.first_name} ${b.passengers.last_name}` : 'Unknown',
      flight_number: b.flights?.flight_number,
      route: b.flights ? `${b.flights.origin} → ${b.flights.destination}` : '',
    })) || [];

    return NextResponse.json({
      success: true,
      data: { flightsToday, totalBookings, revenueToday, checkinRate, bookingsPerDay, bookingsBySource, recentBookings },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
