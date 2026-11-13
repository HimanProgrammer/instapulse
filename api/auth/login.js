// Starts Instagram Login (Instagram API with Instagram Login, Business/Creator accounts).
export default function handler(req, res) {
  const { IG_APP_ID, IG_REDIRECT_URI } = process.env;
  if (!IG_APP_ID || !IG_REDIRECT_URI) {
    const host = req.headers.host || 'your-site.vercel.app';
    res.status(503).setHeader('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set up Instagram login</title>
<body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px;line-height:1.6">
<h2>Instagram login needs a one-time setup</h2>
<p>Instagram only allows logins through an app you register with Meta (free, ~15 min).</p>
<ol>
<li>Switch each Instagram account to <b>Business</b> or <b>Creator</b> (Instagram app → Settings → Account type and tools).</li>
<li>Go to <a href="https://developers.facebook.com/apps" target="_blank">developers.facebook.com/apps</a> → <b>Create app</b> → use case <b>“Manage messaging &amp; content on Instagram”</b>.</li>
<li>Open <b>Instagram → API setup with Instagram login</b>. Copy the <b>Instagram app ID</b> and <b>Instagram app secret</b>.</li>
<li>In <b>Business login settings</b>, add the redirect URL:<br><code>https://${host}/api/auth/callback</code></li>
<li><b>App roles → Roles → Instagram testers</b>: add your accounts, then accept each invite in Instagram (Settings → Website permissions → Apps and websites).</li>
<li>In <a href="https://vercel.com/dashboard" target="_blank">Vercel</a> → instapulse → <b>Settings → Environment Variables</b>, add <code>IG_APP_ID</code>, <code>IG_APP_SECRET</code>, and <code>IG_REDIRECT_URI</code> = <code>https://${host}/api/auth/callback</code>. Then redeploy.</li>
</ol>
<p><a href="/">← Back to InstaPulse</a></p></body>`);
    return;
  }
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', IG_APP_ID);
  url.searchParams.set('redirect_uri', IG_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_messages');
  url.searchParams.set('force_reauth', 'true'); // lets you log into a different account each time
  res.writeHead(302, { Location: url.toString() }).end();
}
