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
  const tasks = body.tasks || [];

  if ((!accessToken || !expiresAt || Date.now() > expiresAt - 60000) && refreshToken) {
    const tokens = await refreshAccessToken(refreshToken);
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token || refreshToken;
    expiresAt = Date.now() + (tokens.expires_in || 0) * 1000;
  }

  if (!accessToken) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing Google access token.' }) };
  }

  const listRes = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const listData = await listRes.json();
  const tasklistId = listData.items?.[0]?.id || '@default';

  const created = [];
  for (const taskItem of tasks) {
    const taskPayload = {
      title: taskItem.title,
      notes: taskItem.description || '',
      due: taskItem.due_date ? new Date(taskItem.due_date).toISOString() : undefined,
      status: taskItem.completed ? 'completed' : 'needsAction',
    };

    const res = await fetch(`https://www.googleapis.com/tasks/v1/lists/${encodeURIComponent(tasklistId)}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskPayload),
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