const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Unable to refresh Google token');
  }
  return data;
}

exports.handler = async (event) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Google OAuth environment variables not configured.' }) };
  }

  const body = event.body ? JSON.parse(event.body) : {};
  let accessToken = body.access_token;
  let refreshToken = body.refresh_token;
  let expiresAt = body.expires_at;
  const events = body.events || [];

  if ((!accessToken || !expiresAt || Date.now() > expiresAt - 60000) && refreshToken) {
    const tokens = await refreshAccessToken(refreshToken);
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token || refreshToken;
    expiresAt = Date.now() + (tokens.expires_in || 0) * 1000;
  }

  if (!accessToken) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing Google access token.' }) };
  }

  const created = [];
  for (const eventItem of events) {
    const start = new Date(eventItem.date || new Date().toISOString());
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const eventPayload = {
      summary: eventItem.title,
      description: eventItem.description || '',
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    const data = await res.json();
    created.push({ success: res.ok, data });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      tokens: { access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt },
      created,
    }),
  };
};