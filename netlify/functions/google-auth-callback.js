const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Collapse accidental duplicate slashes so this redirect_uri matches the one used
// in google-auth-url.js exactly — Google rejects the token exchange otherwise.
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
  ? process.env.GOOGLE_REDIRECT_URI.replace(/([^:]\/)\/+/g, '$1')
  : undefined;

exports.handler = async (event) => {
  const query = event.queryStringParameters || {};
  const code = query.code;
  const state = query.state;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<h1>Google OAuth not configured</h1>`,
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: `<h1>Missing authorization code.</h1>`,
    };
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<h1>Google token exchange failed</h1><pre>${JSON.stringify(tokenData)}</pre>`,
    };
  }

  const expiresAt = Date.now() + (tokenData.expires_in || 0) * 1000;
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Google Authorization</title>
  </head>
  <body>
    <script>
      const data = {
        type: 'googleAuth',
        state: ${JSON.stringify(state)},
        access_token: ${JSON.stringify(tokenData.access_token)},
        refresh_token: ${JSON.stringify(tokenData.refresh_token)},
        expires_at: ${JSON.stringify(expiresAt)},
      };
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(data, window.location.origin);
        window.close();
      } else {
        document.body.innerText = 'Authorization complete. You may close this window.';
      }
    </script>
  </body>
</html>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html,
  };
};