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
- **📅 Planner** – add many accounts (e.g. 5 Instagram + TikTok, Facebook, YouTube, LinkedIn, X, Threads, Pinterest), write once, pick accounts, post all at the same time or staggered every N minutes. Types: Reel, Trial Reel, Post, Carousel, Story. ✨ button writes caption + SEO keywords + hashtags with Claude. Due posts trigger an alert/notification and copy the caption for one-tap posting.

### Auto-publishing (not included yet)
This is a static page, so it reminds you and copies the caption rather than posting by itself. Fully automatic posting needs a small backend with each platform's official API (e.g. Instagram Graph API — Business/Creator accounts, Meta app review) or a scheduler service such as Metricool's API.
