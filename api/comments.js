// Inbox: list recent comments on your posts, reply, hide/unhide.
// POST {action:'list'} | {action:'reply', id, message} | {action:'hide', id, hide}
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
    if (b.action === 'list') {
      const media = (await call('/me/media?fields=id,caption,permalink,timestamp,comments_count&limit=15', token)).data || [];
      const withC = media.filter((m) => m.comments_count > 0);
      const out = await Promise.all(withC.map(async (m) => {
        const c = (await call(`/${m.id}/comments?fields=id,text,username,timestamp,hidden,replies{id,text,username,timestamp}&limit=50`, token)).data || [];
        return { media: { id: m.id, caption: (m.caption || '').slice(0, 80), permalink: m.permalink }, comments: c };
      }));
      return res.json({ items: out });
    }
    if (b.action === 'reply') return res.json(await call(`/${b.id}/replies`, token, { message: String(b.message || '').slice(0, 2200) }));
    if (b.action === 'hide') return res.json(await call(`/${b.id}`, token, { hide: !!b.hide }));
    res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
