type CalendarConnectionSettings = {
  googleAccessToken?: string | null;
  googleRefreshToken?: string | null;
  googleTokenExpiry?: Date | null;
};

export function hasGoogleCalendarConnection(
  settings: CalendarConnectionSettings | null | undefined,
  now = new Date()
) {
  if (!settings) return false;
  if (settings.googleRefreshToken) return true;
  if (!settings.googleAccessToken) return false;
  if (!settings.googleTokenExpiry) return true;
  return settings.googleTokenExpiry.getTime() > now.getTime();
}
