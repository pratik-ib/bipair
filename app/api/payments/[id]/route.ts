import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabaseAdmin.from('payments').select('*').eq('id', params.id).single();
    if (error || !data) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: { id: data.id, status: data.status, amount: data.amount, currency: data.currency, transactionRef: data.transaction_ref, createdAt: data.created_at } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
