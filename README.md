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
