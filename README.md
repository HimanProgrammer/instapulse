# InstaPulse – Instagram analytics + Claude

Single-file web app (`index.html`): Instagram evolution dashboard (followers, reach, impressions, engagement, profile views), content-type and best-day charts, sortable posts table, CSV/JSON import & export, and a Claude chat panel that answers questions using the dashboard data.

## Run
```bash
python3 -m http.server 8080
```
Open http://localhost:8080, click **⚙ Claude key**, paste your Anthropic API key.

## Your data
Starts with demo data. Import a CSV with columns `date,followers,reach,impressions,engagement,profileViews` (daily) or `date,type,caption,reach,likes,comments,saves,shares` (posts), or a JSON `{ "daily": [...], "posts": [...] }`.

## What makes it different
- **🩺 Reel Doctor** – upload a Reel insights screenshot; Claude reads it (vision), finds why it underperformed (e.g. high skip rate) and gives a fix list for the next Reel.
- **🎣 Hook Lab** – one-line idea → 5 hooks, on-screen text, 7–15s shot list, caption, hashtags, CTA.
- **✅ Pre-post Score** – instant 0–100 checklist score before you post (no AI, no wait).
- **🔮 Growth Forecast** – follower projection for 30/90 days and ETA to your next milestone.
- **Dashboard layout** – top nav (Analytics / Planning / Creator Lab), platform sidebar, Community / Account / Posts / Reels tabs. Posts list with search, star, CSV download, and delete (single via ⋮ menu or bulk via checkboxes). Deletes affect InstaPulse only; Instagram does not allow third-party apps to delete posts.
- **Multiple Instagram accounts** – ＋ Add Instagram account in the sidebar; each account keeps its own analytics, posts and imports. Summary compares all accounts side by side. Accounts are shared with the Planner.
- **📅 Planner** – add many accounts (e.g. 5 Instagram + TikTok, Facebook, YouTube, LinkedIn, X, Threads, Pinterest), write once, pick accounts, post all at the same time or staggered every N minutes. Types: Reel, Trial Reel, Post, Carousel, Story. ✨ button writes caption + SEO keywords + hashtags with Claude. Due posts trigger an alert/notification and copy the caption for one-tap posting.

### Auto-publishing (not included yet)
This is a static page, so it reminds you and copies the caption rather than posting by itself. Fully automatic posting needs a small backend with each platform's official API (e.g. Instagram Graph API — Business/Creator accounts, Meta app review) or a scheduler service such as Metricool's API.

## Login with Instagram (real data)
InstaPulse uses the official **Instagram API with Instagram Login**. It works with **Business or Creator** accounts (switch in the Instagram app: Settings → Account type). Each login adds one account; log in again to add the next (up to as many as you like).

One-time setup:
1. Go to https://developers.facebook.com/apps → **Create app** → use case **"Manage messaging & content on Instagram"**.
2. In **Instagram → API setup with Instagram login**, copy the **Instagram app ID** and **Instagram app secret**.
3. Under **Set up Instagram business login → Business login settings**, add the redirect URL: `https://instapulse-lime.vercel.app/api/auth/callback`.
4. While the app is in development, add each of your Instagram accounts under **App roles → Roles → Instagram testers**, then accept the invite in Instagram (Settings → Website permissions → Apps and websites).
5. In Vercel → instapulse → **Settings → Environment Variables** add:
   - `IG_APP_ID` = Instagram app ID
   - `IG_APP_SECRET` = Instagram app secret
   - `IG_REDIRECT_URI` = `https://instapulse-lime.vercel.app/api/auth/callback`
   Then redeploy.

Tokens last 60 days and are kept in your browser only. Instagram's API cannot delete posts, so Delete only removes them from InstaPulse.

## MCP server (use InstaPulse from Claude)
`/api/mcp` is an MCP server so Claude can read your Instagram analytics directly.

Tools: `list_accounts`, `get_account_overview`, `get_daily_insights`, `list_posts`, `get_post_insights`, `compare_accounts`.

Setup:
1. Log in to each account in InstaPulse, open it, and click **🔑 Copy MCP token** (copies `name=TOKEN`).
2. In Vercel → instapulse → Settings → Environment Variables add:
   - `IG_TOKENS` = the copied values joined with commas, e.g. `brand_main=IGAA...,brand_shop=IGAA...`
   - `MCP_KEY` = a long random password you make up
   Then redeploy.
3. In Claude → **Settings → Connectors → Add custom connector**, URL:
   `https://instapulse-lime.vercel.app/api/mcp?key=YOUR_MCP_KEY`

Keep the URL private: anyone with it can read your analytics. Tokens expire after 60 days; copy fresh ones then.

## Posting & scheduling to Instagram (Graph API)
Instagram accounts logged in through **Login with Instagram** can publish directly from the Planner:
- Types: Reel, **Trial Reel** (shown to non-followers first), Post (image or video), Story.
- **Post now** publishes immediately; scheduled posts auto-publish at their time **while InstaPulse is open in a browser tab** (or the next time you open it). Other platforms still get a reminder + copied caption.
- Instagram needs the media at a **public URL**: paste one, or connect a **Vercel Blob** store (Vercel → Storage → Create → Blob → connect to instapulse) so file uploads work.
- Meta app: the login now also asks for `instagram_business_content_publish`. Log in again after updating so tokens carry it. Limits: 100 API-published posts per account per 24 h; Reels 3–90 s, MP4/MOV.

## Inbox, calendar, hashtag tracker, PDF report
- **💬 Inbox**: comments on your recent posts for the open (logged-in) account; reply, ✨ draft a reply with Claude, hide/unhide. Needs `instagram_business_manage_comments` (requested at login — log in again). DMs are not included (they need Meta's messaging permission and App Review).
- **📆 Content calendar** (Planning tab): month view of every scheduled/posted item.
- **#️⃣ Hashtag tracker** (Analytics → Account): average reach, interactions and engagement rate per hashtag used in your captions.
- **📄 PDF report**: prints the dashboard for the current account and period; choose "Save as PDF".

## Server scheduling (posts go out even when your browser is closed)
Scheduling for logged-in Instagram accounts is handled by a Supabase project (`instapulse`, region ap-south-1):
- Edge Function `ip-api` (`supabase/functions/ip-api/index.ts`): `schedule`, `list`, `cancel` (authenticated by the caller's Instagram token) and `cron`.
- Table `scheduled_posts` (RLS on, no public policies: tokens are only readable by the function).
- `pg_cron` job `instapulse-publish` calls the function every minute; it creates the media container, waits for processing and publishes.
Queue items scheduled this way show ☁. If the server can't be reached, the browser falls back to publishing while the page is open.

## Direct messages
Inbox → ✉️ Direct messages lists recent Instagram conversations; send replies or ✨ draft one with Claude. Requires `instagram_business_manage_messages` (requested at login). Instagram only allows replies within 24 h of the customer's last message. For other people's accounts (selling InstaPulse), Meta App Review for messaging is required.

## Facebook, YouTube, LinkedIn, TikTok + hashtag research & competitor analysis
Planning → **🔗 Connect platforms**. Each needs a free developer app; register the redirect URI
`https://instapulse-lime.vercel.app/api/oauth?p=<facebook|google|linkedin|tiktok>` and add its keys in Vercel:

| Platform | Vercel env vars | Where | Notes |
|---|---|---|---|
| Facebook Pages + IG research | `FB_APP_ID`, `FB_APP_SECRET` | developers.facebook.com (same Meta app, add **Facebook Login for Business**) | Posts to Pages; unlocks 🔎 Research. Instagram must be Business/Creator and linked to a Page. Hashtag search needs the *Instagram Public Content Access* feature. |
| YouTube | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | console.cloud.google.com → enable YouTube Data API v3 → OAuth client (Web) | Uploads from the media URL. Unverified apps upload as private until Google audits the app. |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | linkedin.com/developers → products “Sign In with LinkedIn (OpenID)” + “Share on LinkedIn” | Text post, with the media URL attached as a link. |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | developers.tiktok.com → Content Posting API | Until TikTok audits the app, posts are private (SELF_ONLY). |

These platforms auto-post while InstaPulse is open in a tab (Instagram also posts from the server when the browser is closed).
🔎 **Research**: hashtag top/recent posts (30 hashtags per 7 days) and competitor stats via Business Discovery, with “Ask Claude how to beat them”.

## Legal pages (needed for Meta App Review)
- Privacy Policy: `/legal/privacy.html`
- Terms of Service: `/legal/terms.html`
- Data Deletion instructions: `/legal/data-deletion.html`

Set your business name, city/state and contact e-mail in `legal/site.js` (as on your Udyam certificate). Paste the three URLs into the Meta app → App settings → Basic.
