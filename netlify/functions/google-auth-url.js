// Collapse accidental duplicate slashes in the path (e.g. "...netlify.app//.netlify/functions/...")
// while preserving the "https://" scheme separator, so redirect_uri is always cleanly formatted.
const normalizeRedirectUri = (raw) => raw.replace(/([^:]\/)\/+/g, '$1');

exports.handler = async (event) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
    ? normalizeRedirectUri(process.env.GOOGLE_REDIRECT_URI)
    : undefined;
  const state = event.queryStringParameters?.state || '';

  if (!clientId || !redirectUri) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Google OAuth environment variables are not configured.' }),
    };
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/tasks',
  ].join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  // Send a real HTTP 302 so the browser navigates straight to Google's
  // consent screen instead of receiving a JSON payload it has to handle itself.
  return {
    statusCode: 302,
    headers: {
      Location: authUrl.toString(),
      'Cache-Control': 'no-store',
    },
    body: '',
  };
};