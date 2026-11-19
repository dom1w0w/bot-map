(function(){
const q = document.getElementById("q"), sel = document.getElementById("cluster"), main = document.getElementById("list");
const init = new URLSearchParams(location.search); q.value = init.get("q") || "";
let data = null, prev = {};
function render(){
  if (!data) return;
  const term = q.value.trim().toLowerCase(), ck = sel.value;
  const match = b => (!ck || b.cluster === ck) && (!term || (b.name + " " + b.role + " " + b.doing).toLowerCase().includes(term));
  const rank = b => b.lastActive || 0;
  let html = "";
  for (const c of data.clusters){
    const bots = data.bots.filter(b => b.cluster === c.key && match(b)).sort((a, b) => rank(b) - rank(a));
    if (!bots.length) continue;
    html += `<section class="group"><h2><i style="background:${c.color}"></i>${BM.esc(c.name)} · ${bots.length}</h2><div class="cards">` +
      bots.map(b => `<article class="card ${BM.state(b)}${prev[b.id] !== undefined && prev[b.id] !== b.lastActive ? " bump" : ""}" style="--c:${c.color}">
        <h3><i></i>${BM.esc(b.name)}</h3><p>${BM.esc(b.role)}</p>
        <div class="meta"><span>Doing: <b>${BM.esc(b.doing)}</b></span><span>Last: <b>${BM.ago(b.lastActive)}</b></span><span>24h: <b>${b.events24h}</b></span></div></article>`).join("") +
      `</div></section>`;
  }
  main.innerHTML = html || `<p class="err" style="position:static;transform:none;text-align:center;margin-top:60px">No bots match.</p>`;
  const p = new URLSearchParams(); if (term) p.set("q", q.value.trim()); if (ck) p.set("c", ck);
  history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  document.querySelectorAll("a[data-keep]").forEach(a => a.search = p.toString() ? "?" + p : "");
}
q.addEventListener("input", render); sel.addEventListener("change", render);
async function tick(){
  let err = false;
  try { const d = await BM.fetchFeed(); if (!data || d.generatedAt >= data.generatedAt){ if (data) data.bots.forEach(b => prev[b.id] = b.lastActive); data = d; } } catch (e) { err = true; }
  if (!data){ BM.live(document.getElementById("live"), null); main.innerHTML = `<p class="err">Waiting for the live feed…</p>`; return; }
  if (sel.dataset.sig !== data.clusters.map(c => c.key).join()){
    sel.innerHTML = `<option value="">All clusters</option>` + data.clusters.map(c => `<option value="${c.key}">${BM.esc(c.name)}</option>`).join("");
    sel.dataset.sig = data.clusters.map(c => c.key).join(); sel.value = init.get("c") || "";
  }
  BM.renderStats(document.getElementById("stats"), data);
  BM.renderTicker(document.getElementById("ticker"), data);
  BM.live(document.getElementById("live"), data, err);
  render();
}
tick(); setInterval(tick, window.BOTMAP_REFETCH_MS || 60000);
setInterval(() => { if (data) BM.live(document.getElementById("live"), data); }, 15000);
})();
