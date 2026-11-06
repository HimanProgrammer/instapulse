// Pulls profile, daily account insights and recent media insights for one logged-in account.
export const G = 'https://graph.instagram.com/v23.0';
export const get = async (path, token) => {
  const r = await fetch(`${G}${path}${path.includes('?') ? '&' : '?'}access_token=${token}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
};
const day = (d) => d.toISOString().slice(0, 10);

export async function fetchAccount(token) {
    const me = await get('/me?fields=user_id,username,followers_count,media_count,profile_picture_url', token);
    const until = Math.floor(Date.now() / 1000), since = until - 29 * 86400;
    const series = async (metric) => {
      try { return (await get(`/me/insights?metric=${metric}&period=day&since=${since}&until=${until}`, token)).data?.[0]?.values || []; }
      catch { return []; }
    };
    const [reach, newFollowers] = await Promise.all([series('reach'), series('follower_count')]);
    const byDay = {};
    for (let i = 0; i < 30; i++) byDay[day(new Date((since + i * 86400) * 1000))] = { reach: 0, gained: 0 };
    reach.forEach((v) => { const k = v.end_time.slice(0, 10); if (byDay[k]) byDay[k].reach = v.value; });
    newFollowers.forEach((v) => { const k = v.end_time.slice(0, 10); if (byDay[k]) byDay[k].gained = v.value; });
    // Rebuild a follower curve backwards from today's total.
    const keys = Object.keys(byDay).sort();
    let f = me.followers_count || 0;
    const daily = keys.reverse().map((k) => { const row = { date: k, followers: f, reach: byDay[k].reach, impressions: 0, engagement: 0, profileViews: 0 }; f -= byDay[k].gained; return row; }).reverse();

    const media = (await get('/me/media?fields=id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink&limit=40', token)).data || [];
    const posts = await Promise.all(media.map(async (m) => {
      let ins = {};
      try { (await get(`/${m.id}/insights?metric=reach,views,saved,shares`, token)).data.forEach((x) => { ins[x.name] = x.values?.[0]?.value ?? x.total_value?.value ?? 0; }); } catch {}
      const t = new Date(m.timestamp);
      return {
        id: m.id, date: day(t), time: t.toTimeString().slice(0, 5), permalink: m.permalink,
        type: m.media_product_type === 'REELS' ? 'Reel' : m.media_product_type === 'STORY' ? 'Story' : m.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Image',
        caption: (m.caption || '').slice(0, 300), reach: ins.reach || 0, views: ins.views || 0,
        likes: m.like_count || 0, comments: m.comments_count || 0, saves: ins.saved || 0, shares: ins.shares || 0,
      };
    }));
    posts.forEach((p) => { const d = daily.find((x) => x.date === p.date); if (d) { d.engagement += p.likes + p.comments + p.saves + p.shares; d.impressions += p.views; } });
    return { profile: me, daily, posts };
}

export async function fetchMediaInsights(token, id) {
  const m = await get(`/${id}?fields=id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink`, token);
  const ins = {};
  try { (await get(`/${id}/insights?metric=reach,views,saved,shares,total_interactions`, token)).data.forEach((x) => { ins[x.name] = x.values?.[0]?.value ?? x.total_value?.value ?? 0; }); } catch {}
  return { ...m, insights: ins };
}
