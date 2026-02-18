import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData } from './types';

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'bipair-secret-session-key-2026-must-be-32-chars',
  cookieName: 'bipair-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession() {
  const cookieStore = cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}
