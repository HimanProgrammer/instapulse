// Generic OAuth for Facebook (Pages + IG hashtag/competitor APIs), YouTube (Google), LinkedIn and TikTok.
//   /api/oauth?p=facebook            -> redirect to provider login
//   /api/oauth?p=facebook&code=...   -> callback, exchanges code and returns to /#oauth_p=..&oauth_token=..
// Env per provider: FB_APP_ID/FB_APP_SECRET, GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET,
// LINKEDIN_CLIENT_ID/LINKEDIN_CLIENT_SECRET, TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET.
// Redirect URI to register with each provider: https://<your-domain>/api/oauth?p=<provider>
const P = {
  facebook: {
    id: 'FB_APP_ID', secret: 'FB_APP_SECRET', auth: 'https://www.facebook.com/v23.0/dialog/oauth',
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_manage_insights,business_management',
    token: 'https://graph.facebook.com/v23.0/oauth/access_token', method: 'GET',
  },
  google: {
    id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET', auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    token: 'https://oauth2.googleapis.com/token', extra: { access_type: 'offline', prompt: 'consent' },
  },
  linkedin: {
    id: 'LINKEDIN_CLIENT_ID', secret: 'LINKEDIN_CLIENT_SECRET', auth: 'https://www.linkedin.com/oauth/v2/authorization',
    scope: 'openid profile w_member_social', token: 'https://www.linkedin.com/oauth/v2/accessToken',
  },
  tiktok: {
    id: 'TIKTOK_CLIENT_KEY', secret: 'TIKTOK_CLIENT_SECRET', auth: 'https://www.tiktok.com/v2/auth/authorize/',
    scope: 'user.info.basic,video.publish,video.upload', token: 'https://open.tiktokapis.com/v2/oauth/token/', idParam: 'client_key',
  },
};

export default async function handler(req, res) {
  const p = P[req.query.p];
  if (!p) return res.status(400).send('Unknown provider');
  const id = process.env[p.id], secret = process.env[p.secret];
  const redirect = `https://${req.headers.host}/api/oauth?p=${req.query.p}`;
  const back = (o) => res.writeHead(302, { Location: '/#' + new URLSearchParams({ oauth_p: req.query.p, ...o }) }).end();
  if (req.method === 'POST') { // refresh an expiring token (YouTube 1 h, TikTok 24 h)
    try {
      const params = { [p.idParam || 'client_id']: id, client_secret: secret, grant_type: 'refresh_token', refresh_token: req.body?.refresh };
      const r = await (await fetch(p.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) })).json();
      if (!r.access_token) throw new Error(r.error_description || r.error || 'Refresh failed');
      return res.json({ token: r.access_token, refresh: r.refresh_token || req.body?.refresh });
    } catch (e) { return res.status(400).json({ error: e.message }); }
  }
  if (!id || !secret) return back({ oauth_error: `${req.query.p} is not set up yet: add ${p.id} and ${p.secret} in Vercel (see README).` });

  if (!req.query.code) {
    if (req.query.error) return back({ oauth_error: req.query.error_description || req.query.error });
    const u = new URL(p.auth);
    u.searchParams.set(p.idParam || 'client_id', id);
    u.searchParams.set('redirect_uri', redirect);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', p.scope);
    u.searchParams.set('state', 'ip');
    for (const [k, v] of Object.entries(p.extra || {})) u.searchParams.set(k, v);
    return res.writeHead(302, { Location: u.toString() }).end();
  }
  try {
    const params = { [p.idParam || 'client_id']: id, client_secret: secret, code: req.query.code, redirect_uri: redirect, grant_type: 'authorization_code' };
    const r = p.method === 'GET'
      ? await fetch(`${p.token}?${new URLSearchParams(params)}`)
      : await fetch(p.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
    const j = await r.json();
    let token = j.access_token;
    if (!token) throw new Error(j.error_description || j.error?.message || j.error || 'Token exchange failed');
    if (req.query.p === 'facebook') { // long-lived (60 days) user token
      const l = await (await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${id}&client_secret=${secret}&fb_exchange_token=${token}`)).json();
      token = l.access_token || token;
    }
    back({ oauth_token: token, oauth_refresh: j.refresh_token || '' });
  } catch (e) {
    back({ oauth_error: e.message });
  }
}
