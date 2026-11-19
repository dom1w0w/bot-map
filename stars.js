(function(){
const c = document.getElementById("stars"); if (!c) return;
const x = c.getContext("2d"); let W, H, S = [];
function rs(){ W = c.width = innerWidth * devicePixelRatio; H = c.height = innerHeight * devicePixelRatio;
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  S = Array.from({length: Math.round(W * H / 9000)}, () => ({x: r()*W, y: r()*H, z: r()*1.4 + .2, p: r()*6.28}));
}
function f(t){ x.clearRect(0,0,W,H);
  const g = x.createRadialGradient(W*.5,H*.45,0,W*.5,H*.45,Math.max(W,H)*.7);
  g.addColorStop(0,"#0b1430"); g.addColorStop(.5,"#060a18"); g.addColorStop(1,"#03040a");
  x.fillStyle = g; x.fillRect(0,0,W,H);
  for (const s of S){ const a = .35 + .4*Math.sin(t/1400 + s.p); x.fillStyle = `rgba(190,215,255,${a*s.z/1.6})`;
    const yy = (s.y + t*0.004*s.z) % H; x.fillRect(s.x, yy, s.z*devicePixelRatio, s.z*devicePixelRatio); }
  requestAnimationFrame(f);
}
addEventListener("resize", rs); rs(); requestAnimationFrame(f);
})();
