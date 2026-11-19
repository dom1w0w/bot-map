(function(){
const F = {};
F.ago = function(ms){
  if (ms == null) return "never";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return Math.round(s) + "s ago";
  if (s < 3600) return Math.round(s/60) + "m ago";
  if (s < 86400) return Math.round(s/3600) + "h ago";
  return Math.round(s/86400) + "d ago";
};
F.state = function(b){
  if (b.lastActive == null) return "dim";
  const a = Date.now() - b.lastActive;
  if (a < 600000) return "pulse";
  if (a < 86400000) return "glow";
  return "dim";
};
F.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
F.fetchFeed = async function(){
  // Cache-bust per minute; raw.githubusercontent.com may still serve copies up to ~5 min old.
  const u = window.BOTMAP_FEED + "?t=" + Math.floor(Date.now() / 60000);
  const r = await fetch(u, {cache: "no-store"});
  if (!r.ok) throw new Error("feed " + r.status);
  return r.json();
};
F.live = function(el, data, err){
  if (!el) return;
  if (!data){ el.className = "live bad"; el.innerHTML = "<i></i>OFFLINE"; return; }
  const age = Date.now() - data.generatedAt;
  const cls = age < 7*60000 ? "ok" : age < 15*60000 ? "warn" : "bad";
  el.className = "live " + cls + (err ? " stale" : "");
  el.innerHTML = "<i></i>" + (cls === "bad" ? "STALE" : "LIVE") + " · feed " + F.ago(data.generatedAt).replace(" ago", " old");
  el.title = "Feed generated " + new Date(data.generatedAt).toLocaleString() + (err ? " (last fetch failed, showing previous data)" : "") + ". The feed is published from Dom's box every 90s–10min; GitHub's raw CDN can add up to ~5 min of caching.";
};
F.stats = function(data){
  const b = data.bots;
  return {
    total: b.length,
    now: b.filter(x => F.state(x) === "pulse").length,
    day: b.filter(x => F.state(x) !== "dim").length,
    events: b.reduce((s, x) => s + (x.events24h || 0), 0),
  };
};
F.renderStats = function(el, data){
  const s = F.stats(data);
  el.innerHTML = [["Bots", s.total], ["Active now", s.now], ["Active 24h", s.day], ["Events 24h", s.events]]
    .map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join("");
};
F.renderTicker = function(el, data){
  const byId = Object.fromEntries(data.bots.map(b => [b.id, b]));
  const items = (data.recent || []).slice(0, 25).map(e => {
    const b = byId[e.bot]; if (!b) return "";
    const c = (data.clusters.find(c => c.key === b.cluster) || {}).color || "#94a3b8";
    return `<span class="tk"><i style="background:${c}"></i>${F.esc(b.name)} ${e.kind === "reply" ? "replied" : "got a message"} · ${F.ago(e.t)}</span>`;
  }).join("");
  const html = items || `<span class="tk">No activity in the last 24h</span>`;
  el.innerHTML = `<div class="tk-track">${html}${html}</div>`;
};
window.BM = F;
})();
