import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const { valid } = validateApiKey(request);
  if (!valid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { phone, firstName, lastName, email, passportNumber, nationality, dateOfBirth } = await request.json();

    const { data: existing } = await supabaseAdmin.from('passengers').select('*').eq('phone', phone).single();
    if (existing) return NextResponse.json({ success: true, data: { passenger: existing, isNew: false } });

    const { data: newP, error } = await supabaseAdmin.from('passengers').insert({
      phone, first_name: firstName, last_name: lastName,
      email, passport_number: passportNumber, nationality, date_of_birth: dateOfBirth, loyalty_points: 0,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data: { passenger: newP, isNew: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
