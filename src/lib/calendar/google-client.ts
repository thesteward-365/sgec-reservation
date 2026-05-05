import { google } from 'googleapis';
import { db } from '@/lib/db';
import { calendarSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const SCOPES = ['https://www.googleapis.com/auth/calendar', 'openid', 'email'];

export function createOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl() {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function getCalendarClient() {
  const settings = await db
    .select()
    .from(calendarSettings)
    .limit(1)
    .then((rows) => rows[0]);

  if (!settings?.googleAccessToken || !settings?.googleRefreshToken) {
    return null;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: settings.googleAccessToken,
    refresh_token: settings.googleRefreshToken,
    expiry_date: settings.googleTokenExpiry ? settings.googleTokenExpiry * 1000 : undefined,
  });

  // 토큰 자동 갱신 처리
  oauth2Client.on('tokens', async (tokens) => {
    const update: Record<string, unknown> = {};
    if (tokens.access_token) update.googleAccessToken = tokens.access_token;
    if (tokens.expiry_date) update.googleTokenExpiry = Math.floor(tokens.expiry_date / 1000);
    if (tokens.refresh_token) update.googleRefreshToken = tokens.refresh_token;

    if (Object.keys(update).length > 0) {
      await db.update(calendarSettings).set(update).where(eq(calendarSettings.id, settings.id));
    }
  });

  // 만료 10분 이내면 미리 갱신
  if (settings.googleTokenExpiry) {
    const expiryMs = settings.googleTokenExpiry * 1000;
    if (Date.now() > expiryMs - 10 * 60 * 1000) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await db.update(calendarSettings).set({
          googleAccessToken: credentials.access_token ?? settings.googleAccessToken,
          googleTokenExpiry: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : settings.googleTokenExpiry,
        }).where(eq(calendarSettings.id, settings.id));
      } catch {
        // refresh 실패 시 재연동 필요 상태
        return null;
      }
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function getCalendarSettings() {
  return db.select().from(calendarSettings).limit(1).then((rows) => rows[0] ?? null);
}
