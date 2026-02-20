import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);

  if (!valid) {
    logApiRequest({ method: 'POST', path: '/api/passengers', responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
    const { phone, firstName, lastName, email, passportNumber, nationality, dateOfBirth } = body;

    const { data: existing } = await supabaseAdmin.from('passengers').select('*').eq('phone', phone).single();
    if (existing) {
      logApiRequest({ method: 'POST', path: '/api/passengers', requestBody: body, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
      return NextResponse.json({ success: true, data: { passenger: existing, isNew: false } });
    }

    const { data: newP, error } = await supabaseAdmin.from('passengers').insert({
      phone, first_name: firstName, last_name: lastName,
      email, passport_number: passportNumber, nationality, date_of_birth: dateOfBirth, loyalty_points: 0,
    }).select().single();
    if (error) throw error;
    logApiRequest({ method: 'POST', path: '/api/passengers', requestBody: body, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json({ success: true, data: { passenger: newP, isNew: true } });
  } catch (error: any) {
    logApiRequest({ method: 'POST', path: '/api/passengers', requestBody: body, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
