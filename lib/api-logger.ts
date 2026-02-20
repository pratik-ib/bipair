import { supabaseAdmin } from '@/lib/supabase';

interface ApiLogParams {
  method: string;
  path: string;
  queryParams?: Record<string, string> | null;
  requestBody?: any;
  responseStatus: number;
  responseTimeMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  errorMessage?: string | null;
  apiKeyPresent?: boolean;
}

/**
 * Log a chatbot API request to the api_logs table.
 * Fire-and-forget: does NOT block the response.
 */
export function logApiRequest(params: ApiLogParams): void {
  // Sanitize request body - remove sensitive fields before logging
  let safeBody = params.requestBody;
  if (safeBody && typeof safeBody === 'object') {
    safeBody = { ...safeBody };
    if (safeBody.cardNumber) safeBody.cardNumber = '****';
    if (safeBody.cvv) safeBody.cvv = '***';
    if (safeBody.cardExpiry) safeBody.cardExpiry = '**/**';
  }

  // Fire and forget - intentionally not awaited
  supabaseAdmin
    .from('api_logs')
    .insert({
      method: params.method,
      path: params.path,
      query_params: params.queryParams || null,
      request_body: safeBody || null,
      response_status: params.responseStatus,
      response_time_ms: params.responseTimeMs,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      error_message: params.errorMessage || null,
      api_key_present: params.apiKeyPresent ?? false,
    })
    .then(() => {})
    .catch((err: any) => {
      // Silently ignore logging errors - never let logging break the API
      console.warn('[ApiLogger] Failed to log request:', err?.message);
    });
}

/**
 * Helper: extract IP and user-agent from a NextRequest
 */
export function extractRequestMeta(request: Request): { ipAddress: string | null; userAgent: string | null } {
  const headers = request.headers as any;
  const ipAddress =
    headers.get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get?.('x-real-ip') ||
    null;
  const userAgent = headers.get?.('user-agent') || null;
  return { ipAddress, userAgent };
}
