// Exchanges the OAuth code for a long-lived (60-day) token and hands it to the app.
export default async function handler(req, res) {
  const { IG_APP_ID, IG_APP_SECRET, IG_REDIRECT_URI } = process.env;
  const { code, error_description } = req.query;
  const back = (frag) => res.writeHead(302, { Location: '/#' + new URLSearchParams(frag) }).end();
  if (!code) return back({ ig_error: error_description || 'Login cancelled' });
  try {
    const body = new URLSearchParams({ client_id: IG_APP_ID, client_secret: IG_APP_SECRET, grant_type: 'authorization_code', redirect_uri: IG_REDIRECT_URI, code: String(code).replace(/#_$/, '') });
    const short = await (await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body })).json();
    if (!short.access_token) throw new Error(short.error_message || 'Token exchange failed');
    const long = await (await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${short.access_token}`)).json();
    const token = long.access_token || short.access_token;
    const me = await (await fetch(`https://graph.instagram.com/me?fields=user_id,username&access_token=${token}`)).json();
    back({ ig_token: token, ig_user: me.user_id || short.user_id, ig_name: me.username || '' });
  } catch (e) {
    back({ ig_error: e.message });
  }
}
