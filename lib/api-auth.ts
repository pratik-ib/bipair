import { NextRequest } from 'next/server';

export function validateApiKey(request: NextRequest): { valid: boolean } {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.CHATBOT_API_KEY;
  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return { valid: false };
  }
  return { valid: true };
}
