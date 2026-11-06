// InstaPulse MCP server (Streamable HTTP, stateless JSON responses).
// Lets Claude read your Instagram analytics. Configure in Vercel:
//   MCP_KEY    – a long random secret; clients connect to /api/mcp?key=MCP_KEY
//   IG_TOKENS  – accounts as "name=TOKEN,name2=TOKEN2" (copy tokens from InstaPulse → 🔑 Copy MCP token)
import { fetchAccount, fetchMediaInsights } from '../lib/instagram.js';

const accounts = () => Object.fromEntries((process.env.IG_TOKENS || '').split(',').map((p) => p.trim()).filter(Boolean)
  .map((p) => { const i = p.indexOf('='); return [p.slice(0, i).replace(/^@/, ''), p.slice(i + 1)]; }));
const tokenFor = (name) => {
  const a = accounts(), key = String(name || '').replace(/^@/, '');
  const t = a[key] ?? (Object.keys(a).length === 1 ? Object.values(a)[0] : undefined);
  if (!t) throw new Error(`Unknown account "${name}". Known: ${Object.keys(a).join(', ') || 'none (set IG_TOKENS)'}`);
  return t;
};
const er = (posts) => posts.length ? posts.reduce((s, p) => s + (p.likes + p.comments + p.saves + p.shares) / (p.reach || 1), 0) / posts.length * 100 : 0;
const acct = { type: 'object', properties: { account: { type: 'string', description: 'Account name from list_accounts (optional if only one)' } } };

const TOOLS = [
  { name: 'list_accounts', description: 'List the Instagram accounts connected to InstaPulse.', inputSchema: { type: 'object', properties: {} },
    run: async () => Object.keys(accounts()) },
  { name: 'get_account_overview', description: 'Followers, 30-day follower growth and reach, post count and average engagement rate for one account.', inputSchema: acct,
    run: async ({ account }) => {
      const { profile, daily, posts } = await fetchAccount(tokenFor(account));
      return { username: profile.username, followers: profile.followers_count, media_count: profile.media_count,
        followers_gained_30d: daily.at(-1).followers - daily[0].followers, reach_30d: daily.reduce((s, d) => s + d.reach, 0),
        recent_posts: posts.length, avg_engagement_rate_pct: +er(posts).toFixed(2) };
    } },
  { name: 'get_daily_insights', description: 'Daily followers, reach, views and engagement for the last 30 days.', inputSchema: acct,
    run: async ({ account }) => (await fetchAccount(tokenFor(account))).daily },
  { name: 'list_posts', description: 'Recent posts/reels with reach, views, likes, comments, saves, shares. Sort by any metric.',
    inputSchema: { type: 'object', properties: { ...acct.properties, type: { type: 'string', enum: ['Reel', 'Image', 'Carousel', 'Story'] },
      sort_by: { type: 'string', enum: ['date', 'reach', 'views', 'likes', 'comments', 'saves', 'shares'] }, limit: { type: 'number' } } },
    run: async ({ account, type, sort_by = 'date', limit = 20 }) => {
      let p = (await fetchAccount(tokenFor(account))).posts;
      if (type) p = p.filter((x) => x.type === type);
      p.sort((a, b) => sort_by === 'date' ? (b.date + b.time).localeCompare(a.date + a.time) : b[sort_by] - a[sort_by]);
      return p.slice(0, limit);
    } },
  { name: 'get_post_insights', description: 'Full insights for one post or reel by its media id.',
    inputSchema: { type: 'object', properties: { ...acct.properties, media_id: { type: 'string' } }, required: ['media_id'] },
    run: async ({ account, media_id }) => fetchMediaInsights(tokenFor(account), media_id) },
  { name: 'compare_accounts', description: 'Side-by-side followers, growth, reach and engagement for every connected account.', inputSchema: { type: 'object', properties: {} },
    run: async () => Promise.all(Object.keys(accounts()).map(async (n) => {
      try { return { account: n, ...(await TOOLS[1].run({ account: n })) }; } catch (e) { return { account: n, error: e.message }; }
    })) },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, mcp-session-id, mcp-protocol-version');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const key = req.query.key || (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!process.env.MCP_KEY || key !== process.env.MCP_KEY) return res.status(401).json({ error: 'Invalid or missing MCP key' });
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').end();

  const msgs = Array.isArray(req.body) ? req.body : [req.body];
  const out = [];
  for (const m of msgs) {
    if (!m || m.id === undefined) continue; // notifications need no reply
    const ok = (result) => out.push({ jsonrpc: '2.0', id: m.id, result });
    try {
      if (m.method === 'initialize') ok({ protocolVersion: m.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} },
        serverInfo: { name: 'instapulse', version: '1.0.0' }, instructions: 'Instagram analytics from InstaPulse. Start with list_accounts.' });
      else if (m.method === 'ping') ok({});
      else if (m.method === 'tools/list') ok({ tools: TOOLS.map(({ run, ...t }) => t) });
      else if (m.method === 'tools/call') {
        const t = TOOLS.find((x) => x.name === m.params?.name);
        if (!t) throw Object.assign(new Error('Unknown tool'), { code: -32602 });
        try { ok({ content: [{ type: 'text', text: JSON.stringify(await t.run(m.params.arguments || {}), null, 1) }] }); }
        catch (e) { ok({ content: [{ type: 'text', text: 'Error: ' + e.message }], isError: true }); }
      } else throw Object.assign(new Error('Method not found'), { code: -32601 });
    } catch (e) { out.push({ jsonrpc: '2.0', id: m.id, error: { code: e.code || -32603, message: e.message } }); }
  }
  if (!out.length) return res.status(202).end();
  res.json(Array.isArray(req.body) ? out : out[0]);
}
