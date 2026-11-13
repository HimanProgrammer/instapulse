// Actions on connected platforms. Token in "Authorization: Bearer". POST {p, action, ...}.
const FB = 'https://graph.facebook.com/v23.0';
const j = async (r) => { const t = await r.text(); let o; try { o = JSON.parse(t); } catch { o = { raw: t }; } if (!r.ok || o.error) throw new Error(o.error?.message || o.message || o.error || `HTTP ${r.status}`); return o; };
const fb = (path, token, body) => fetch(`${FB}${path}${path.includes('?') ? '&' : '?'}access_token=${token}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}).then(j);
const isVideo = (u) => !/\.(jpe?g|png|webp)(\?|$)/i.test(u || '');

async function facebook(b, token) {
  if (b.action === 'accounts') { // Pages and their linked Instagram business accounts
    const d = await fb('/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=50', token);
    return { pages: d.data.map((p) => ({ id: p.id, name: p.name, pageToken: p.access_token, ig: p.instagram_business_account || null })) };
  }
  if (b.action === 'post') { // Facebook Page post
    const t = b.pageToken;
    if (!b.mediaUrl) return fb(`/${b.pageId}/feed`, t, { message: b.caption });
    if (isVideo(b.mediaUrl)) return fb(`/${b.pageId}/videos`, t, { file_url: b.mediaUrl, description: b.caption });
    return fb(`/${b.pageId}/photos`, t, { url: b.mediaUrl, caption: b.caption });
  }
  if (b.action === 'hashtag') { // Instagram hashtag search (max 30 unique hashtags / 7 days per IG account)
    const tag = String(b.tag || '').replace(/^#/, '');
    const id = (await fb(`/ig_hashtag_search?user_id=${b.igId}&q=${encodeURIComponent(tag)}`, token)).data?.[0]?.id;
    if (!id) throw new Error('Hashtag not found');
    const f = 'id,caption,media_type,like_count,comments_count,permalink,timestamp';
    const [top, recent] = await Promise.all([fb(`/${id}/top_media?user_id=${b.igId}&fields=${f}&limit=25`, token), fb(`/${id}/recent_media?user_id=${b.igId}&fields=${f}&limit=25`, token)]);
    return { tag, top: top.data, recent: recent.data };
  }
  if (b.action === 'competitor') { // Business Discovery: public stats of another Business/Creator account
    const u = String(b.username || '').replace(/^@/, '');
    const d = await fb(`/${b.igId}?fields=business_discovery.username(${encodeURIComponent(u)}){username,name,biography,followers_count,follows_count,media_count,profile_picture_url,media.limit(25){caption,like_count,comments_count,timestamp,media_type,media_product_type,permalink}}`, token);
    return d.business_discovery;
  }
  throw new Error('Unknown action');
}

async function youtube(b, token) {
  if (b.action === 'me') return j(await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers: { Authorization: `Bearer ${token}` } }));
  if (b.action === 'post') { // Upload a video from a public URL (Shorts if vertical & ≤3 min)
    const vid = await fetch(b.mediaUrl); if (!vid.ok) throw new Error('Could not download media');
    const buf = Buffer.from(await vid.arrayBuffer());
    const meta = { snippet: { title: (b.title || b.caption || 'New video').split('\n')[0].slice(0, 95), description: b.caption || '', categoryId: '22' }, status: { privacyStatus: b.privacy || 'public', selfDeclaredMadeForKids: false } };
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Upload-Content-Type': vid.headers.get('content-type') || 'video/mp4', 'X-Upload-Content-Length': String(buf.length) }, body: JSON.stringify(meta),
    });
    if (!init.ok) await j(init);
    const up = await j(await fetch(init.headers.get('location'), { method: 'PUT', headers: { 'Content-Type': vid.headers.get('content-type') || 'video/mp4' }, body: buf }));
    return { id: up.id, url: `https://youtube.com/watch?v=${up.id}` };
  }
  throw new Error('Unknown action');
}

async function linkedin(b, token) {
  const me = await j(await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } }));
  if (b.action === 'me') return { name: me.name, id: me.sub };
  if (b.action === 'post') {
    const body = {
      author: `urn:li:person:${me.sub}`, lifecycleState: 'PUBLISHED', visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: b.caption || '' }, shareMediaCategory: b.mediaUrl ? 'ARTICLE' : 'NONE', ...(b.mediaUrl ? { media: [{ status: 'READY', originalUrl: b.mediaUrl }] } : {}) } },
    };
    const r = await fetch('https://api.linkedin.com/v2/ugcPosts', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' }, body: JSON.stringify(body) });
    if (!r.ok) await j(r);
    return { id: r.headers.get('x-restli-id') };
  }
  throw new Error('Unknown action');
}

async function tiktok(b, token) {
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' };
  if (b.action === 'me') return j(await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', { headers: H }));
  if (b.action === 'post') {
    const vid = await fetch(b.mediaUrl); if (!vid.ok) throw new Error('Could not download media');
    const buf = Buffer.from(await vid.arrayBuffer());
    const init = await j(await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST', headers: H,
      body: JSON.stringify({ post_info: { title: (b.caption || '').slice(0, 2200), privacy_level: b.privacy || 'SELF_ONLY' }, source_info: { source: 'FILE_UPLOAD', video_size: buf.length, chunk_size: buf.length, total_chunk_count: 1 } }),
    }));
    const up = await fetch(init.data.upload_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes 0-${buf.length - 1}/${buf.length}` }, body: buf });
    if (!up.ok) throw new Error(`TikTok upload failed (${up.status})`);
    return { publish_id: init.data.publish_id };
  }
  throw new Error('Unknown action');
}

export const config = { maxDuration: 60 };
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Not connected' });
  const b = req.body || {};
  try {
    const fn = { facebook, youtube, linkedin, tiktok }[b.p];
    if (!fn) throw new Error('Unknown platform');
    res.json(await fn(b, token));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
