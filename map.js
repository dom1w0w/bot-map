(function(){
const NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("map");
const tip = document.getElementById("tip");
const q = document.getElementById("q"), sel = document.getElementById("cluster");
let data = null, portrait = null, view = null, anim = null, prevLast = {}, tipFor = null;

// Fixed hub anchors (fractions of the view) — deterministic, stable between refreshes.
const LAND = {w:1600,h:1000,hubs:{leadership:[.5,.27],operations:[.2,.42],brand:[.8,.42],build:[.3,.78],projects:[.7,.78],other:[.5,.6]}};
const PORT = {w:420,h:1000,hubs:{}};

function el(tag, attrs, parent){ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function radius(b){ return 11 + Math.min(16, Math.log2(1 + (b.events24h || 0)) * 3.2); }

function layout(){
  const pos = {}, hubs = {};
  const keys = data.clusters.map(c => c.key);
  const members = k => data.bots.filter(b => b.cluster === k).sort((a, b) => a.id < b.id ? -1 : 1);
  if (portrait){
    // Phones: one column of clusters, bots in a small grid under each hub.
    const W = 420; let y = 40;
    for (const k of keys){
      const m = members(k); if (!m.length && k === "other") continue;
      hubs[k] = [W/2, y];
      const cols = m.length === 3 || m.length >= 5 ? 3 : Math.min(2, m.length) || 1, gap = cols === 3 ? 135 : 200;
      m.forEach((b, i) => { const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, m.length - r*cols);
        pos[b.id] = [W/2 + (c - (inRow - 1)/2) * gap, y + 70 + r*80]; });
      y += 70 + Math.ceil(m.length / cols) * 80 + 60;
    }
    PORT.w = W; PORT.h = y - 20; PORT.hubs = {};
    return {L: PORT, pos, hubs};
  }
  const L = LAND, extra = keys.filter(k => !L.hubs[k]);
  keys.forEach(k => {
    let f = L.hubs[k];
    if (!f){ const i = extra.indexOf(k), a = i / Math.max(1, extra.length) * 6.283; f = [.5 + .42*Math.cos(a), .5 + .4*Math.sin(a)]; }
    hubs[k] = [f[0]*L.w, f[1]*L.h];
  });
  for (const k of keys){
    const m = members(k), n = m.length, R = 125 + n*8;
    // fan bots below/beside the hub so the hub label above stays clear
    m.forEach((b, i) => { const a = (-15 + (i + .5) / n * 210) * Math.PI / 180; pos[b.id] = [hubs[k][0] + R*Math.cos(a), hubs[k][1] + R*Math.sin(a)*.9]; });
  }
  return {L, pos, hubs};
}

let geo = null;
function draw(){
  fitArea();
  const isP = innerWidth / innerHeight < 0.9;
  const rebuild = isP !== portrait || !svg.querySelector(".node") || svg.dataset.sig !== sig();
  portrait = isP;
  if (rebuild){
    geo = layout();
    svg.innerHTML = "";
    const d = el("defs", {}, svg);
    d.innerHTML = `<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="glow2" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="hg"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
    const ge = el("g", {}, svg), gh = el("g", {}, svg), gn = el("g", {}, svg);
    for (const c of data.clusters){
      const members = data.bots.filter(b => b.cluster === c.key);
      if (!members.length && c.key === "other") continue;
      const [x, y] = geo.hubs[c.key];
      const h = el("g", {class: "hub", "data-k": c.key}, gh);
      el("circle", {class: "halo", cx: x, cy: y, r: 70, fill: c.color}, h).style.filter = "blur(30px)";
      el("circle", {class: "core", cx: x, cy: y, r: 9, stroke: c.color}, h);
      el("circle", {cx: x, cy: y, r: 3, fill: c.color}, h);
      const t = el("text", {x, y: y - 20}, h); t.textContent = c.name;
      for (const b of members){
        const [bx, by] = geo.pos[b.id];
        const mx = (x + bx)/2 + (by - y)*.15, my = (y + by)/2 - (bx - x)*.15;
        el("path", {class: "edge", "data-id": b.id, d: `M${x},${y} Q${mx},${my} ${bx},${by}`, stroke: c.color}, ge);
        const g = el("g", {class: "node", "data-id": b.id, tabindex: 0}, gn);
        el("circle", {class: "ring", cx: bx, cy: by, r: 14, stroke: c.color}, g);
        el("circle", {class: "flash", cx: bx, cy: by, r: 14}, g);
        el("circle", {class: "dot", cx: bx, cy: by, r: 12, fill: c.color}, g);
        const tx = el("text", {x: bx, y: by + 32}, g); tx.textContent = b.name;
        g.addEventListener("mouseenter", e => showTip(b.id, e));
        g.addEventListener("mousemove", e => moveTip(e));
        g.addEventListener("mouseleave", hideTip);
        g.addEventListener("click", e => { e.stopPropagation(); tipFor === b.id ? hideTip() : showTip(b.id, e); });
      }
    }
    svg.dataset.sig = sig(); svg.classList.toggle("portrait", portrait);
    if (!view) view = full();
    applyFilter(false);
  }
  update();
}
function sig(){ return (portrait ? "p" : "l") + data.bots.map(b => b.id + b.cluster + b.name).join("|") + data.clusters.map(c => c.key + c.color + c.name).join(); }

function update(){
  for (const b of data.bots){
    const g = svg.querySelector(`.node[data-id="${b.id}"]`); if (!g) continue;
    const st = BM.state(b);
    g.classList.remove("pulse", "glow", "dim"); g.classList.add(st);
    const r = radius(b);
    g.querySelector(".dot").setAttribute("r", r);
    g.querySelector(".ring").setAttribute("r", r); g.querySelector(".flash").setAttribute("r", r);
    const e = svg.querySelector(`.edge[data-id="${b.id}"]`);
    if (e){ e.classList.toggle("on", st === "pulse"); e.classList.toggle("glow", st === "glow"); }
    if (prevLast[b.id] !== undefined && b.lastActive && b.lastActive !== prevLast[b.id]){
      g.classList.remove("bump"); void g.getBBox(); g.classList.add("bump"); setTimeout(() => g.classList.remove("bump"), 2600);
    }
    prevLast[b.id] = b.lastActive;
  }
  if (tipFor) fillTip(tipFor);
}

function fillTip(id){
  const b = data.bots.find(x => x.id === id); if (!b) return hideTip();
  const c = data.clusters.find(c => c.key === b.cluster) || {};
  tip.innerHTML = `<div class="cl" style="color:${c.color}">${BM.esc(c.name)}</div><h3>${BM.esc(b.name)}</h3><p>${BM.esc(b.role)}</p>
   <dl><dt>Doing now</dt><dd>${BM.esc(b.doing)}</dd><dt>Last active</dt><dd>${b.lastActive ? BM.ago(b.lastActive) + " · " + new Date(b.lastActive).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "No activity yet"}</dd><dt>Events 24h</dt><dd>${b.events24h}</dd></dl>`;
}
function showTip(id, e){ tipFor = id; fillTip(id); tip.classList.add("show"); moveTip(e); }
function moveTip(e){
  const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 16, y = e.clientY + 16;
  if (x + w > innerWidth - 8) x = e.clientX - w - 16; if (x < 8) x = 8;
  if (y + h > innerHeight - 40) y = e.clientY - h - 16; if (y < 8) y = 8;
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
function hideTip(){ tipFor = null; tip.classList.remove("show"); }
document.addEventListener("click", hideTip);

// viewBox zooming
function fitArea(){ const h = document.querySelector("header").offsetHeight; svg.style.top = h + "px"; svg.style.height = (innerHeight - h - 34) + "px"; }
function full(){ const L = portrait ? PORT : LAND; return portrait ? [0, -10, L.w, L.h + 20] : [0, 40, L.w, L.h - 20]; }
function setView(v, animate){
  cancelAnimationFrame(anim);
  if (!animate){ view = v; svg.setAttribute("viewBox", v.join(" ")); return; }
  const from = view.slice(), t0 = performance.now(), D = 750;
  const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    view = from.map((f, i) => f + (v[i] - f) * e); svg.setAttribute("viewBox", view.join(" ")); if (k < 1) anim = requestAnimationFrame(step); };
  anim = requestAnimationFrame(step);
}
function fitPoints(pts){
  if (!pts.length) return full();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts){ x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pad = portrait ? 70 : 170, w = Math.max(x1 - x0 + pad*2, portrait ? 420 : 820), h = Math.max(y1 - y0 + pad*2, portrait ? 420 : 520), cx = (x0 + x1)/2, cy = (y0 + y1)/2;
  const ar = svg.clientWidth / svg.clientHeight; let W = w, H = h; if (W / H < ar) W = H * ar; else H = W / ar;
  return [cx - W/2, cy - H/2, W, H];
}
function applyFilter(animate = true){
  if (!data || !geo) return;
  const term = q.value.trim().toLowerCase(), ck = sel.value;
  const match = b => (!ck || b.cluster === ck) && (!term || (b.name + " " + b.role + " " + b.doing).toLowerCase().includes(term));
  const hits = data.bots.filter(match), filtering = !!(term || ck);
  svg.querySelectorAll(".node,.edge").forEach(n => { const b = data.bots.find(x => x.id === n.dataset.id); n.classList.toggle("faded", filtering && !match(b)); });
  svg.querySelectorAll(".hub").forEach(h => h.classList.toggle("faded", filtering && !hits.some(b => b.cluster === h.dataset.k)));
  const pts = hits.map(b => geo.pos[b.id]); if (ck && geo.hubs[ck]) pts.push(geo.hubs[ck]);
  setView(filtering ? (hits.length ? fitPoints(pts) : view) : full(), animate);
  const p = new URLSearchParams(); if (term) p.set("q", q.value.trim()); if (ck) p.set("c", ck);
  history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  document.querySelectorAll("a[data-keep]").forEach(a => a.search = p.toString() ? "?" + p : "");
}
q.addEventListener("input", () => applyFilter());
sel.addEventListener("change", () => applyFilter());
addEventListener("resize", () => { if (!data) return; fitArea(); const was = portrait; portrait = innerWidth / innerHeight < 0.9; if (was !== portrait){ portrait = was; view = null; draw(); } applyFilter(false); });

const init = new URLSearchParams(location.search); q.value = init.get("q") || "";
let last = null;
async function tick(){
  let err = false;
  try { const d = await BM.fetchFeed(); if (!last || d.generatedAt >= last.generatedAt) data = last = d; }
  catch (e) { err = true; }
  if (!data){ BM.live(document.getElementById("live"), null); document.getElementById("msg").textContent = "Waiting for the live feed…"; return; }
  document.getElementById("msg").textContent = "";
  if (sel.options.length <= 1 || sel.dataset.sig !== data.clusters.map(c => c.key).join()){
    sel.innerHTML = `<option value="">All clusters</option>` + data.clusters.map(c => `<option value="${c.key}">${BM.esc(c.name)}</option>`).join("");
    sel.dataset.sig = data.clusters.map(c => c.key).join(); sel.value = init.get("c") || "";
  }
  BM.renderStats(document.getElementById("stats"), data);
  BM.renderTicker(document.getElementById("ticker"), data);
  BM.live(document.getElementById("live"), data, err);
  draw();
}
tick(); setInterval(tick, window.BOTMAP_REFETCH_MS || 60000);
setInterval(() => { if (data){ BM.live(document.getElementById("live"), data); update(); } }, 15000);
})();
