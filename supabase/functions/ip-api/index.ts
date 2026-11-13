// InstaPulse server: schedules Instagram posts and publishes them even when no browser is open.
// Clients authenticate with their own Instagram token; pg_cron calls {action:"cron"} every minute.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const G = "https://graph.instagram.com/v23.0";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-ig-token, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function ig(path: string, token: string, body?: unknown) {
  const r = await fetch(`${G}${path}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }
    : { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  if (j.error) throw new Error(j.error.error_user_msg || j.error.message);
  return j;
}

function containerParams(type: string, url: string, caption: string) {
  const isImg = /\.(jpe?g|png)(\?|$)/i.test(url);
  if (type === "Story") return { media_type: "STORIES", [isImg ? "image_url" : "video_url"]: url };
  if (type === "Reel" || type === "Trial Reel") {
    const p: Record<string, unknown> = { media_type: "REELS", video_url: url, caption, share_to_feed: true };
    if (type === "Trial Reel") p.trial_params = { graduation_strategy: "SS_PERFORMANCE" };
    return p;
  }
  return isImg ? { image_url: url, caption } : { media_type: "REELS", video_url: url, caption };
}

// deno-lint-ignore no-explicit-any
async function step(job: any) {
  const upd = (o: Record<string, unknown>) => db.from("scheduled_posts").update({ ...o, updated_at: new Date().toISOString() }).eq("id", job.id);
  try {
    let container = job.container_id;
    if (!container) {
      container = (await ig(`/${job.ig_user_id}/media`, job.token, containerParams(job.type, job.media_url, job.caption))).id;
      await upd({ status: "processing", container_id: container });
    }
    const s = await ig(`/${container}?fields=status_code,status`, job.token);
    if (s.status_code === "FINISHED") {
      const p = await ig(`/${job.ig_user_id}/media_publish`, job.token, { creation_id: container });
      let permalink = "";
      try { permalink = (await ig(`/${p.id}?fields=permalink`, job.token)).permalink; } catch { /* optional */ }
      await upd({ status: "posted", permalink, error: null });
    } else if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
      await upd({ status: "failed", error: "Instagram could not process the media: " + (s.status || s.status_code) });
    } else {
      const attempts = job.attempts + 1;
      await upd(attempts > 30 ? { status: "failed", error: "Timed out waiting for Instagram to process the media", attempts } : { attempts });
    }
  } catch (e) {
    await upd({ status: "failed", error: (e as Error).message });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const b = await req.json().catch(() => ({}));

  if (b.action === "cron") {
    const { data: sec } = await db.from("app_secrets").select("value").eq("name", "cron").single();
    if (!sec || req.headers.get("x-cron-secret") !== sec.value) return json({ error: "forbidden" }, 403);
    const { data: jobs } = await db.from("scheduled_posts").select("*")
      .or(`and(status.eq.scheduled,run_at.lte.${new Date().toISOString()}),status.eq.processing`).order("run_at").limit(25);
    await Promise.all((jobs || []).map(step));
    return json({ processed: jobs?.length || 0 });
  }

  const token = (req.headers.get("x-ig-token") || "").trim();
  if (!token) return json({ error: "Not logged in" }, 401);
  let me: { user_id: string; username?: string };
  try { me = await ig("/me?fields=user_id,username", token); } catch (e) { return json({ error: (e as Error).message }, 401); }

  if (b.action === "schedule") {
    const rows = (b.posts || []).map((p: Record<string, string>) => ({
      ig_user_id: me.user_id, token, type: p.type, media_url: p.mediaUrl, caption: p.caption || "", run_at: p.runAt,
    }));
    if (!rows.length || rows.some((r: Record<string, string>) => !r.media_url || !r.run_at)) return json({ error: "mediaUrl and runAt are required" }, 400);
    const { data, error } = await db.from("scheduled_posts").insert(rows).select("id,run_at,status");
    return error ? json({ error: error.message }, 400) : json({ jobs: data });
  }
  if (b.action === "list") {
    const { data } = await db.from("scheduled_posts").select("id,type,caption,media_url,run_at,status,error,permalink")
      .eq("ig_user_id", me.user_id).order("run_at", { ascending: false }).limit(200);
    return json({ jobs: data || [] });
  }
  if (b.action === "cancel") {
    await db.from("scheduled_posts").update({ status: "cancelled" }).eq("id", b.id).eq("ig_user_id", me.user_id).eq("status", "scheduled");
    return json({ ok: true });
  }
  return json({ error: "Unknown action" }, 400);
});
