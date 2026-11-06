// Publishes to Instagram via the Instagram Graph API (Instagram API with Instagram Login).
// POST {action:'create', type, mediaUrl, caption, trial}  -> {container}
// POST {action:'status', container}                         -> {status: IN_PROGRESS|FINISHED|ERROR|EXPIRED}
// POST {action:'publish', container}                        -> {id, permalink}
const G = 'https://graph.instagram.com/v23.0';
async function call(path, token, body) {
  const r = await fetch(`${G}${path}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }
    : { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  if (j.error) throw new Error(j.error.error_user_msg || j.error.message);
  return j;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  const b = req.body || {};
  try {
    if (b.action === 'create') {
      const me = await call('/me?fields=user_id', token);
      const isVideo = /\.(mp4|mov)(\?|$)/i.test(b.mediaUrl) || ['Reel', 'Trial Reel', 'Story'].includes(b.type) && !/\.(jpe?g|png)(\?|$)/i.test(b.mediaUrl);
      const p = { caption: b.caption || '' };
      if (b.type === 'Story') { p.media_type = 'STORIES'; p[isVideo ? 'video_url' : 'image_url'] = b.mediaUrl; delete p.caption; }
      else if (b.type === 'Reel' || b.type === 'Trial Reel') {
        p.media_type = 'REELS'; p.video_url = b.mediaUrl; p.share_to_feed = true;
        if (b.type === 'Trial Reel') p.trial_params = { graduation_strategy: 'SS_PERFORMANCE' }; // shown to non-followers first
      } else if (isVideo) { p.media_type = 'REELS'; p.video_url = b.mediaUrl; }
      else p.image_url = b.mediaUrl;
      const c = await call(`/${me.user_id}/media`, token, p);
      return res.json({ container: c.id, user: me.user_id });
    }
    if (b.action === 'status') {
      const s = await call(`/${b.container}?fields=status_code,status`, token);
      return res.json({ status: s.status_code, detail: s.status });
    }
    if (b.action === 'publish') {
      const me = await call('/me?fields=user_id', token);
      const p = await call(`/${me.user_id}/media_publish`, token, { creation_id: b.container });
      let permalink = '';
      try { permalink = (await call(`/${p.id}?fields=permalink`, token)).permalink; } catch {}
      return res.json({ id: p.id, permalink });
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
