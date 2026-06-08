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

async function googleFetch(url, accessToken) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || 'Google request failed');
  }
  return data;
}

function toDateOnly(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function classifySource(name) {
  const normalized = (name || '').toLowerCase();
  return /(prüfung|pruefung|klausur|test|exam|quiz)/i.test(normalized) ? 'exam' : 'task';
}

exports.handler = async (event) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Google OAuth environment variables not configured.' }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    let accessToken = body.access_token;
    let refreshToken = body.refresh_token;
    let expiresAt = body.expires_at;
    const selectedCalendarIds = Array.isArray(body.selected_calendar_ids) ? body.selected_calendar_ids : null;
    const selectedTaskListIds = Array.isArray(body.selected_tasklist_ids) ? body.selected_tasklist_ids : null;

    if ((!accessToken || !expiresAt || Date.now() > expiresAt - 60000) && refreshToken) {
      const tokens = await refreshAccessToken(refreshToken);
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token || refreshToken;
      expiresAt = Date.now() + (tokens.expires_in || 0) * 1000;
    }

    if (!accessToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing Google access token.' }) };
    }

    const [calendarListData, taskListData] = await Promise.all([
      googleFetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', accessToken),
      googleFetch('https://www.googleapis.com/tasks/v1/users/@me/lists', accessToken),
    ]);

    const calendars = (calendarListData.items || []).map((calendar) => ({
      id: calendar.id,
      title: calendar.summaryOverride || calendar.summary || 'Kalender',
      selected: selectedCalendarIds ? selectedCalendarIds.includes(calendar.id) : true,
      type: classifySource(calendar.summaryOverride || calendar.summary),
    }));

    const taskLists = (taskListData.items || []).map((list) => ({
      id: list.id,
      title: list.title || 'Tasks',
      selected: selectedTaskListIds ? selectedTaskListIds.includes(list.id) : true,
      type: classifySource(list.title),
    }));

    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 7);
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 1);

    const calendarEvents = [];
    for (const calendar of calendars.filter((item) => item.selected)) {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('timeMin', timeMin.toISOString());
      url.searchParams.set('timeMax', timeMax.toISOString());
      const eventsData = await googleFetch(url.toString(), accessToken);

      for (const item of eventsData.items || []) {
        if (item.status === 'cancelled') continue;
        const date = toDateOnly(item.start?.date || item.start?.dateTime);
        if (!date || !item.summary) continue;
        calendarEvents.push({
          google_id: item.id,
          title: item.summary,
          description: item.description || null,
          date,
          subject: calendar.title,
          type: calendar.type,
          source_id: calendar.id,
          source_title: calendar.title,
        });
      }
    }

    const googleTasks = [];
    for (const list of taskLists.filter((item) => item.selected)) {
      const url = new URL(`https://www.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks`);
      url.searchParams.set('showCompleted', 'true');
      url.searchParams.set('showDeleted', 'false');
      url.searchParams.set('showHidden', 'true');
      const tasksData = await googleFetch(url.toString(), accessToken);

      for (const item of tasksData.items || []) {
        if (!item.title) continue;
        const date = toDateOnly(item.due) || new Date().toISOString().slice(0, 10);
        googleTasks.push({
          google_id: item.id,
          title: item.title,
          description: item.notes || null,
          date,
          completed: item.status === 'completed',
          subject: list.title,
          type: list.type,
          source_id: list.id,
          source_title: list.title,
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        tokens: { access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt },
        calendars,
        taskLists,
        items: [...calendarEvents, ...googleTasks],
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Google import failed' }),
    };
  }
};
