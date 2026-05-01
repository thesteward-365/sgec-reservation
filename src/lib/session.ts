import { SessionOptions } from 'iron-session';

export interface SessionData {
  user?: {
    id: number;
    name: string;
    phoneNumber: string;
    role: 'user' | 'admin';
    status: 'pending' | 'approved' | 'rejected';
  };
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || 'complex_password_at_least_32_characters_long_for_security',
  cookieName: 'sgec_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365, // 365 days
  },
};
