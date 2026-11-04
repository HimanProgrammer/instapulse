// Starts Instagram Login (Instagram API with Instagram Login, Business/Creator accounts).
export default function handler(req, res) {
  const { IG_APP_ID, IG_REDIRECT_URI } = process.env;
  if (!IG_APP_ID || !IG_REDIRECT_URI) {
    res.status(500).send('Instagram login is not configured: set IG_APP_ID, IG_APP_SECRET and IG_REDIRECT_URI in Vercel.');
    return;
  }
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', IG_APP_ID);
  url.searchParams.set('redirect_uri', IG_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights');
  url.searchParams.set('force_reauth', 'true'); // lets you log into a different account each time
  res.writeHead(302, { Location: url.toString() }).end();
}
