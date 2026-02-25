import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-auth';
import { logApiRequest, extractRequestMeta } from '@/lib/api-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { valid } = validateApiKey(request);
  const { ipAddress, userAgent } = extractRequestMeta(request);

  if (!valid) {
    const rb = { success: false, error: 'Unauthorized' };
    logApiRequest({ method: 'POST', path: '/api/passengers', responseBody: rb, responseStatus: 401, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: 'Unauthorized', apiKeyPresent: false });
    return NextResponse.json(rb, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
    const { phone, firstName, lastName, email, passportNumber, nationality, dateOfBirth } = body;

    const { data: existing } = await supabaseAdmin.from('passengers').select('*').eq('phone', phone).single();
    if (existing) {
      const rb = { success: true, data: { passenger: existing, isNew: false } };
      logApiRequest({ method: 'POST', path: '/api/passengers', requestBody: body, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
      return NextResponse.json(rb);
    }

    const { data: newP, error } = await supabaseAdmin.from('passengers').insert({
      phone, first_name: firstName, last_name: lastName,
      email, passport_number: passportNumber, nationality, date_of_birth: dateOfBirth, loyalty_points: 0,
    }).select().single();
    if (error) throw error;

    const rb = { success: true, data: { passenger: newP, isNew: true } };
    logApiRequest({ method: 'POST', path: '/api/passengers', requestBody: body, responseBody: rb, responseStatus: 200, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, apiKeyPresent: true });
    return NextResponse.json(rb);
  } catch (error: any) {
    const rb = { success: false, error: error.message };
    logApiRequest({ method: 'POST', path: '/api/passengers', requestBody: body, responseBody: rb, responseStatus: 500, responseTimeMs: Date.now() - startTime, ipAddress, userAgent, errorMessage: error.message, apiKeyPresent: true });
    return NextResponse.json(rb, { status: 500 });
  }
}
