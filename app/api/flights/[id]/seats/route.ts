import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';

const ROWS = Array.from({length: 30}, (_, i) => i + 1).filter(r => r !== 13);
const COLS = ['A','B','C','D','E','F'];
const FC_ROWS = [1,2,3];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', params.id).single();
    if (!flight) return NextResponse.json({ success: false, error: 'Flight not found' }, { status: 404 });

    const { data: bookings } = await supabaseAdmin
      .from('bookings').select('seat_number, fare_class').eq('flight_id', params.id).neq('status', 'cancelled');
    const occupiedSeats = new Set(bookings?.map(b => b.seat_number).filter(Boolean) || []);

    const seats = [];
    for (const row of ROWS) {
      const isFC = FC_ROWS.includes(row);
      const cols = isFC ? ['A','C','D','F'] : COLS;
      for (const col of cols) {
        const seatNumber = `${row}${col}`;
        const fareClass = row <= 3 ? 'first_class' : row <= 8 ? 'business' : 'economy';
        seats.push({
          seatNumber,
          row,
          column: col,
          fareClass,
          isOccupied: occupiedSeats.has(seatNumber),
          isExtraLegroom: row === 9 || row === 20,
        });
      }
    }

    const totalEconomy = seats.filter(s => s.fareClass === 'economy').length;
    const totalBusiness = seats.filter(s => s.fareClass === 'business').length;
    const totalFirstClass = seats.filter(s => s.fareClass === 'first_class').length;
    const availableEconomy = seats.filter(s => s.fareClass === 'economy' && !s.isOccupied).length;
    const availableBusiness = seats.filter(s => s.fareClass === 'business' && !s.isOccupied).length;
    const availableFirstClass = seats.filter(s => s.fareClass === 'first_class' && !s.isOccupied).length;

    return NextResponse.json({
      success: true,
      data: {
        seats,
        summary: { totalEconomy, totalBusiness, totalFirstClass, availableEconomy, availableBusiness, availableFirstClass },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
