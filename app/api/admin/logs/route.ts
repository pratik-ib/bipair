import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    return session?.isLoggedIn === true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const method = searchParams.get('method') || '';
    const path = searchParams.get('path') || '';
    const status = searchParams.get('status') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('api_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (method) query = query.eq('method', method.toUpperCase());
    if (path) query = query.ilike('path', `%${path}%`);
    if (status) {
      if (status === '2xx') {
        query = query.gte('response_status', 200).lt('response_status', 300);
      } else if (status === '4xx') {
        query = query.gte('response_status', 400).lt('response_status', 500);
      } else if (status === '5xx') {
        query = query.gte('response_status', 500).lt('response_status', 600);
      } else {
        const statusNum = parseInt(status, 10);
        if (!isNaN(statusNum)) query = query.eq('response_status', statusNum);
      }
    }
    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    return NextResponse.json(
      { success: true, data: logs || [], total: count || 0, page, limit },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: 'api_logs table not found. Please run the SQL migration in Supabase.',
        setupRequired: true,
      }, { status: 503 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('api_logs')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Logs cleared' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
