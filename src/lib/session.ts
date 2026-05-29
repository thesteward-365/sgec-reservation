import { SessionOptions } from 'iron-session';

export interface SessionData {
  user?: {
    id: number;
    name: string;
    username: string;
    phoneNumber: string;
    role: 'user' | 'admin';
    status: 'pending' | 'approved' | 'rejected';
  };
}

if (!process.env.SESSION_PASSWORD) {
  throw new Error(
    'SESSION_PASSWORD environment variable is required. It must be at least 32 characters long.'
  );
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD,
  cookieName: 'sgec_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365, // 365 days
  },
};
