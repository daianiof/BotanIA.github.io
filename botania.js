(function(){
'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// One seed per visit, fixed for the life of the page. The copy claims no
// two vein patterns are alike, so no two visitors get the same network.
// Holding it steady across resizes keeps the pattern from reshuffling
// under the reader mid-scroll.
const SESSION_SEED = (Math.random() * 2147483647) | 0;

/* ============================================================
   1. VENATION NETWORK
   Space colonization (Runions et al.), open-venation variant.
   Chosen over recursive branching because recursion yields
   self-similar shapes that read as fractal decoration. Space
   colonization produces a dominant midrib, irregular secondary
   spacing, and capillaries that fill interstitial gaps.
   ============================================================ */

// --- deterministic RNG so a resize does not reshuffle the whole field
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// --- spatial hash, keeps nearest-neighbour queries off O(n^2)
function SpatialGrid(cell, w, h){
  this.cell = cell;
  this.cols = Math.max(1, Math.ceil(w / cell));
  this.rows = Math.max(1, Math.ceil(h / cell));
  this.buckets = new Array(this.cols * this.rows);
}
SpatialGrid.prototype.key = function(x, y){
  const cx = Math.min(this.cols - 1, Math.max(0, (x / this.cell) | 0));
  const cy = Math.min(this.rows - 1, Math.max(0, (y / this.cell) | 0));
  return cy * this.cols + cx;
};
SpatialGrid.prototype.add = function(idx, x, y){
  const k = this.key(x, y);
  (this.buckets[k] || (this.buckets[k] = [])).push(idx);
};
SpatialGrid.prototype.near = function(x, y, out){
  out.length = 0;
  const cx = Math.min(this.cols - 1, Math.max(0, (x / this.cell) | 0));
  const cy = Math.min(this.rows - 1, Math.max(0, (y / this.cell) | 0));
  for(let yy = Math.max(0, cy - 1); yy <= Math.min(this.rows - 1, cy + 1); yy++){
    for(let xx = Math.max(0, cx - 1); xx <= Math.min(this.cols - 1, cx + 1); xx++){
      const b = this.buckets[yy * this.cols + xx];
      if(b) for(let i = 0; i < b.length; i++) out.push(b[i]);
    }
  }
  return out;
};

// --- Bridson Poisson-disk. Blue noise, not uniform random:
//     prevents clumping so vein density reads grown, not scattered.
function poissonDisk(w, h, r, rng, inDomain, cap){
  const k = 12, cell = r / Math.SQRT2;
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const grid = new Int32Array(gw * gh).fill(-1);
  const pts = [], active = [];
  function insert(px, py){
    const gx = (px / cell) | 0, gy = (py / cell) | 0;
    grid[gy * gw + gx] = pts.length;
    pts.push([px, py]);
    active.push(pts.length - 1);
  }
  let tries = 0;
  while(pts.length === 0 && tries++ < 4000){
    const px = rng() * w, py = rng() * h;
    if(inDomain(px, py)) insert(px, py);
  }
  while(active.length && pts.length < cap){
    const ai = (rng() * active.length) | 0;
    const p = pts[active[ai]];
    let placed = false;
    for(let i = 0; i < k; i++){
      const ang = rng() * Math.PI * 2, rad = r * (1 + rng());
      const qx = p[0] + Math.cos(ang) * rad, qy = p[1] + Math.sin(ang) * rad;
      if(qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
      if(!inDomain(qx, qy)) continue;
      const gx = (qx / cell) | 0, gy = (qy / cell) | 0;
      let ok = true;
      for(let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2) && ok; yy++){
        for(let xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2) && ok; xx++){
          const id = grid[yy * gw + xx];
          if(id >= 0){
            const dx = pts[id][0] - qx, dy = pts[id][1] - qy;
            if(dx * dx + dy * dy < r * r) ok = false;
          }
        }
      }
      if(ok){ insert(qx, qy); placed = true; break; }
    }
    if(!placed) active.splice(ai, 1);
  }
  return pts;
}

function generateVenation(w, h, cfg){
  const rng = mulberry32(cfg.seed);

  // Elongated elliptical domain, bled off two edges so the field
  // reads as a fragment of something larger than the viewport.
  const ox = w * cfg.originX, oy = h * cfg.originY;
  const rx = w * cfg.spreadX, ry = h * cfg.spreadY;
  function inDomain(x, y){
    const nx = (x - ox) / rx, ny = (y - oy) / ry;
    return nx * nx + ny * ny <= 1;
  }

  const attractors = poissonDisk(w, h, cfg.attractorSpacing, rng, inDomain, cfg.attractorCap);
  if(attractors.length < 8) return null;

  // The conceptual origin sits off-canvas so the field reads as a
  // fragment of something larger, but attractors only exist on-canvas.
  // Anchor the root to the nearest real attractor so growth can never
  // starve on iteration zero regardless of where the origin lands.
  let rootX = ox, rootY = oy, bestD = Infinity;
  for(let i = 0; i < attractors.length; i++){
    const dx = attractors[i][0] - ox, dy = attractors[i][1] - oy;
    const d = dx * dx + dy * dy;
    if(d < bestD){ bestD = d; rootX = attractors[i][0]; rootY = attractors[i][1]; }
  }

  const nodes = [{ x: rootX, y: rootY, parent: -1 }];
  const grid = new SpatialGrid(cfg.influence, w, h);
  grid.add(0, rootX, rootY);

  // Pre-seed a midrib. Pure space colonization from a single point
  // radiates evenly and reads as a starburst; a leaf has one dominant
  // axis with secondaries hanging off it. Laying the primary vein down
  // first is what makes the result read as venation rather than a shrub.
  {
    const ribLen = w * cfg.midribSpan;
    const steps = Math.max(2, Math.round(ribLen / cfg.step));
    let px = rootX, py = rootY, parent = 0;
    for(let i = 0; i < steps; i++){
      // gentle arc, so the midrib is not a ruled line
      const t = i / steps;
      const drift = Math.sin(t * Math.PI) * cfg.midribArc;
      px += cfg.step * cfg.biasX;
      py += cfg.step * cfg.biasY + drift;
      if(px < 0 || px >= w || py < 0 || py >= h) break;
      nodes.push({ x: px, y: py, parent: parent });
      parent = nodes.length - 1;
      grid.add(parent, px, py);
    }
  }

  const live = attractors.slice();
  const scratch = [];
  const influence2 = cfg.influence * cfg.influence;
  const kill2 = cfg.kill * cfg.kill;
  const tStart = performance.now();
  let fresh = [0];

  for(let iter = 0; iter < cfg.maxIter && live.length; iter++){
    // Hard guarantees. Space colonization densifies superlinearly,
    // so without a node cap and a wall-clock budget the growth loop
    // can block the main thread on a slow device.
    if(nodes.length > cfg.nodeCap) break;
    if(performance.now() - tStart > cfg.timeBudget) break;

    const dirX = new Map(), dirY = new Map();

    for(let a = 0; a < live.length; a++){
      const ax = live[a][0], ay = live[a][1];
      grid.near(ax, ay, scratch);
      let best = -1, bestD = influence2;
      for(let i = 0; i < scratch.length; i++){
        const n = nodes[scratch[i]];
        const dx = ax - n.x, dy = ay - n.y;
        const d = dx * dx + dy * dy;
        if(d < bestD){ bestD = d; best = scratch[i]; }
      }
      if(best < 0) continue;
      const n = nodes[best];
      let dx = ax - n.x, dy = ay - n.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      dirX.set(best, (dirX.get(best) || 0) + dx);
      dirY.set(best, (dirY.get(best) || 0) + dy);
    }

    if(dirX.size === 0) break;

    fresh = [];
    dirX.forEach(function(sx, idx){
      const sy = dirY.get(idx);
      // Normalize the attractor sum FIRST. Its magnitude scales with how
      // many attractors pull on this node, so adding a fixed-magnitude
      // bias to the raw sum lets busy nodes ignore the bias entirely,
      // which is what turns secondaries into a perpendicular comb.
      const sLen = Math.hypot(sx, sy);
      if(sLen < 1e-6) return;
      let vx = sx / sLen + cfg.biasX * cfg.biasStrength;
      let vy = sy / sLen + cfg.biasY * cfg.biasStrength;
      const len = Math.hypot(vx, vy);
      if(len < 1e-6) return;
      vx /= len; vy /= len;
      // slight jitter keeps runs from going geometrically straight
      const j = (rng() - 0.5) * cfg.jitter;
      const cos = Math.cos(j), sin = Math.sin(j);
      const rxv = vx * cos - vy * sin, ryv = vx * sin + vy * cos;
      const p = nodes[idx];
      const nx = p.x + rxv * cfg.step, ny = p.y + ryv * cfg.step;
      nodes.push({ x: nx, y: ny, parent: idx });
      const ni = nodes.length - 1;
      grid.add(ni, nx, ny);
      fresh.push(ni);
    });

    // Only nodes added this iteration can newly consume an attractor,
    // so this is exact and avoids re-querying the whole grid.
    if(fresh.length){
      for(let a = live.length - 1; a >= 0; a--){
        const ax = live[a][0], ay = live[a][1];
        for(let i = 0; i < fresh.length; i++){
          const n = nodes[fresh[i]];
          const dx = ax - n.x, dy = ay - n.y;
          if(dx * dx + dy * dy < kill2){ live.splice(a, 1); break; }
        }
      }
    }
  }

  // ---- children, depth, flow accumulation, Strahler order
  const N = nodes.length;
  const children = new Array(N);
  for(let i = 0; i < N; i++) children[i] = [];
  for(let i = 1; i < N; i++) children[nodes[i].parent].push(i);

  const depth = new Int32Array(N);
  const order = [];
  const queue = [0];
  while(queue.length){
    const i = queue.shift();
    order.push(i);
    for(const c of children[i]){ depth[c] = depth[i] + 1; queue.push(c); }
  }
  let maxDepth = 1;
  for(let i = 0; i < N; i++) if(depth[i] > maxDepth) maxDepth = depth[i];

  // flow = subtree size. Hydraulically correct taper, smoother
  // than Strahler for stroke width.
  const flow = new Float32Array(N).fill(1);
  const strahler = new Int32Array(N).fill(1);
  for(let i = order.length - 1; i >= 0; i--){
    const n = order[i];
    const ch = children[n];
    if(!ch.length) continue;
    let sum = 1, maxO = 0, countMax = 0;
    for(const c of ch){
      sum += flow[c];
      if(strahler[c] > maxO){ maxO = strahler[c]; countMax = 1; }
      else if(strahler[c] === maxO) countMax++;
    }
    flow[n] = sum;
    strahler[n] = countMax >= 2 ? maxO + 1 : maxO;
  }
  let maxFlow = 1;
  for(let i = 0; i < N; i++) if(flow[i] > maxFlow) maxFlow = flow[i];

  // ---- segments
  // Width follows Murray's law: conducting radius scales with the cube
  // root of the flow the vessel carries, the proportion that minimizes
  // the energy cost of transport. Confirmed for plant xylem in
  // McCulloh, Sperry & Adler, Nature 421 (2003).
  const segs = [];
  for(let i = 1; i < N; i++){
    const p = nodes[nodes[i].parent];
    segs.push({
      x1: p.x, y1: p.y, x2: nodes[i].x, y2: nodes[i].y,
      w: cfg.minWidth + Math.cbrt(flow[i] / maxFlow) * (cfg.maxWidth - cfg.minWidth),
      g: depth[i] / maxDepth,
      node: i
    });
  }

  // ---- reticulation
  // Angiosperm leaves close their minor veins into loops (areoles).
  // This is not ornament: a purely branching tree has a single point of
  // failure at every node, whereas a looped network reroutes around a
  // severed vein instead of starving the tissue behind it.
  // See Katifori et al., PRL 104 (2010) and Corson, PRL 104 (2010) on
  // damage resilience and fluctuating load in reticulate venation.
  {
    const lg = new SpatialGrid(cfg.loopRadius, w, h);
    for(let i = 0; i < N; i++) lg.add(i, nodes[i].x, nodes[i].y);
    const probe = [];
    const lr2 = cfg.loopRadius * cfg.loopRadius;
    let made = 0;
    for(let i = 0; i < N && made < cfg.maxLoops; i++){
      if(strahler[i] > cfg.loopMaxOrder) continue;   // minor veins only
      lg.near(nodes[i].x, nodes[i].y, probe);
      for(let k = 0; k < probe.length; k++){
        const j = probe[k];
        if(j <= i) continue;
        if(strahler[j] > cfg.loopMaxOrder) continue;
        if(nodes[j].parent === i || nodes[i].parent === j) continue;
        if(nodes[j].parent === nodes[i].parent) continue; // trivial triangle
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
        const d2 = dx * dx + dy * dy;
        if(d2 > lr2 || d2 < 36) continue;
        segs.push({
          x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y,
          w: cfg.minWidth * 1.15,
          g: Math.max(depth[i], depth[j]) / maxDepth,
          loop: true
        });
        if(++made >= cfg.maxLoops) break;
      }
    }
  }

  // sorted by growth order so the scroll reveal can bail early
  segs.sort(function(a, b){ return a.g - b.g; });

  // junction nodes, emergent from the biology rather than pasted on
  const junctions = [];
  for(let i = 0; i < N; i++){
    if(children[i].length >= 2 && strahler[i] >= cfg.junctionOrder){
      junctions.push({ x: nodes[i].x, y: nodes[i].y, g: depth[i] / maxDepth,
                       r: 1.1 + Math.min(2.1, strahler[i] * 0.42) });
    }
  }

  // ---- pulse chains, root to tip, with cumulative length
  const leaves = [];
  for(let i = 0; i < N; i++) if(!children[i].length && depth[i] > maxDepth * 0.35) leaves.push(i);
  const chains = [];
  const chainCount = Math.min(cfg.chainSamples, leaves.length);
  for(let c = 0; c < chainCount; c++){
    const leaf = leaves[(rng() * leaves.length) | 0];
    const path = [];
    let cur = leaf;
    while(cur !== -1){ path.push(nodes[cur]); cur = nodes[cur].parent; }
    path.reverse();
    if(path.length < 6) continue;
    const cum = [0];
    for(let i = 1; i < path.length; i++){
      cum.push(cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
    }
    const gEnd = depth[leaf] / maxDepth;
    chains.push({ pts: path, cum: cum, total: cum[cum.length - 1], g: gEnd });
  }

  return { segs: segs, junctions: junctions, chains: chains };
}

/* ---------- renderer ---------- */
const VeinField = (function(){
  const field = document.getElementById('veinField');
  const cvStruct = document.getElementById('veinStructure');
  const cvSignal = document.getElementById('veinSignal');
  if(!field || !cvStruct || !cvSignal) return { init: function(){} };

  const ctxS = cvStruct.getContext('2d');
  const ctxP = cvSignal.getContext('2d');

  let model = null, W = 0, H = 0, dpr = 1;
  let growth = reduceMotion ? 1 : 0;
  let drawnGrowth = -1;
  let pulses = [], lastSpawn = 0;
  let rafId = null, running = false, visible = true;
  let pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
  let segGrid = null;
  const scratch = [];

  const SAGE = '125,148,105';
  const VERD = '47,107,94';

  function config(){
    const mobile = W < 760;
    return {
      seed: SESSION_SEED,
      originX: mobile ? -0.05 : -0.03,
      originY: mobile ? 0.1 : 0.08,
      spreadX: mobile ? 1.15 : 1.25,
      spreadY: mobile ? 1.05 : 1.15,
      midribSpan: mobile ? 0.62 : 0.95,
      midribArc: mobile ? 0.34 : 0.2,
      // mobile is genuinely different parameters, not a scale-down:
      // wider spacing yields fewer, chunkier branches that survive
      // a small viewport instead of collapsing into mush.
      attractorSpacing: mobile ? 44 : 29,
      attractorCap: mobile ? 320 : 1500,
      influence: mobile ? 120 : 96,
      kill: mobile ? 26 : 17,
      step: mobile ? 13 : 10,
      // diagonal descent: a long horizontal run reads as a strikethrough
      // when it crosses a line of body copy
      biasX: mobile ? 0.55 : 0.72, biasY: mobile ? 0.84 : 0.7,
      biasStrength: mobile ? 0.5 : 0.7,
      jitter: 0.26,
      maxIter: mobile ? 150 : 260,
      nodeCap: mobile ? 2600 : 7200,
      timeBudget: 110,
      minWidth: 0.35,
      maxWidth: mobile ? 2.4 : 2.9,
      junctionOrder: 2,
      loopRadius: mobile ? 34 : 26,
      loopMaxOrder: 2,
      maxLoops: mobile ? 90 : 340,
      chainSamples: mobile ? 14 : 34,
      baseAlpha: mobile ? 0.24 : 0.3
    };
  }

  function buildSegGrid(cfg){
    segGrid = new SpatialGrid(90, W, H);
    for(let i = 0; i < model.segs.length; i++){
      const s = model.segs[i];
      segGrid.add(i, (s.x1 + s.x2) * 0.5, (s.y1 + s.y2) * 0.5);
    }
  }

  function resize(){
    // clientWidth, not innerWidth: innerWidth includes the scrollbar,
    // which would stretch the backing store against its CSS box
    const w = document.documentElement.clientWidth || window.innerWidth;
    const h = document.documentElement.clientHeight || window.innerHeight;
    if(w === W && h === H && model) return;
    W = w; H = h;
    // DPR capped: 3x on a phone triples fill cost for no visible gain
    dpr = Math.min(window.devicePixelRatio || 1, W < 760 ? 1.5 : 2);
    [cvStruct, cvSignal].forEach(function(c){
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    });
    ctxS.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxP.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cfg = config();
    const t0 = performance.now();
    model = generateVenation(W, H, cfg);
    if(model) buildSegGrid(cfg);
    drawnGrowth = -1;
    drawStructure();
  }

  function drawStructure(){
    if(!model) return;
    const cfg = config();
    ctxS.clearRect(0, 0, W, H);
    ctxS.lineCap = 'round';
    const segs = model.segs;
    for(let i = 0; i < segs.length; i++){
      const s = segs[i];
      if(s.g > growth) break; // sorted by growth order, so we can bail
      // capillaries sit fainter than the midrib
      const a = cfg.baseAlpha * (0.42 + 0.58 * (s.w / cfg.maxWidth));
      ctxS.strokeStyle = 'rgba(' + SAGE + ',' + a.toFixed(3) + ')';
      ctxS.lineWidth = s.w;
      ctxS.beginPath();
      ctxS.moveTo(s.x1, s.y1);
      ctxS.lineTo(s.x2, s.y2);
      ctxS.stroke();
    }
    for(let i = 0; i < model.junctions.length; i++){
      const j = model.junctions[i];
      if(j.g > growth) continue;
      ctxS.fillStyle = 'rgba(' + SAGE + ',' + (cfg.baseAlpha * 0.95).toFixed(3) + ')';
      ctxS.beginPath();
      ctxS.arc(j.x, j.y, j.r, 0, Math.PI * 2);
      ctxS.fill();
    }
    drawnGrowth = growth;
  }

  function spawnPulse(now){
    if(!model || !model.chains.length) return;
    const avail = model.chains.filter(function(c){ return c.g <= growth; });
    if(!avail.length) return;
    const c = avail[(Math.random() * avail.length) | 0];
    pulses.push({ chain: c, d: 0, speed: 34 + Math.random() * 30, len: 46 + Math.random() * 34 });
    lastSpawn = now;
  }

  function pointAt(chain, dist){
    const cum = chain.cum, pts = chain.pts;
    if(dist <= 0) return pts[0];
    if(dist >= chain.total) return pts[pts.length - 1];
    let lo = 0, hi = cum.length - 1;
    while(lo < hi - 1){
      const mid = (lo + hi) >> 1;
      if(cum[mid] <= dist) lo = mid; else hi = mid;
    }
    const t = (dist - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * t,
             y: pts[lo].y + (pts[hi].y - pts[lo].y) * t };
  }

  function drawSignal(dt, now){
    ctxP.clearRect(0, 0, W, H);
    if(reduceMotion) return;

    // --- travelling pulses. On a light ground signal reads as
    //     increased density, never as luminance.
    if(now - lastSpawn > 620) spawnPulse(now);
    ctxP.lineCap = 'round';
    for(let i = pulses.length - 1; i >= 0; i--){
      const p = pulses[i];
      p.d += p.speed * dt;
      if(p.d - p.len > p.chain.total){ pulses.splice(i, 1); continue; }
      const head = Math.min(p.d, p.chain.total);
      const tail = Math.max(0, p.d - p.len);
      const steps = 7;
      for(let s = 0; s < steps; s++){
        const d0 = tail + (head - tail) * (s / steps);
        const d1 = tail + (head - tail) * ((s + 1) / steps);
        const a = (s / steps);
        const pa = pointAt(p.chain, d0), pb = pointAt(p.chain, d1);
        // fade in at the tip of the leading edge, out at the tail
        const edgeFade = Math.min(1, (p.chain.total - head) / 90);
        ctxP.strokeStyle = 'rgba(' + VERD + ',' + (a * 0.5 * edgeFade).toFixed(3) + ')';
        ctxP.lineWidth = 0.9 + a * 1.5;
        ctxP.beginPath();
        ctxP.moveTo(pa.x, pa.y);
        ctxP.lineTo(pb.x, pb.y);
        ctxP.stroke();
      }
    }
    if(pulses.length > 8) pulses.splice(0, pulses.length - 8);

    // --- cursor deepens veins locally. Spatial hash keeps this to
    //     a small subset of segments per frame.
    if(pointer.active && segGrid && model){
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 7);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 7);
      const R = 132, R2 = R * R;
      segGrid.near(pointer.x, pointer.y, scratch);
      ctxP.lineCap = 'round';
      for(let i = 0; i < scratch.length; i++){
        const s = model.segs[scratch[i]];
        if(s.g > growth) continue;
        const mx = (s.x1 + s.x2) * 0.5, my = (s.y1 + s.y2) * 0.5;
        const d2 = (mx - pointer.x) * (mx - pointer.x) + (my - pointer.y) * (my - pointer.y);
        if(d2 > R2) continue;
        const f = 1 - Math.sqrt(d2) / R;
        ctxP.strokeStyle = 'rgba(' + VERD + ',' + (f * f * 0.32).toFixed(3) + ')';
        ctxP.lineWidth = s.w * (1 + f * 0.5);
        ctxP.beginPath();
        ctxP.moveTo(s.x1, s.y1);
        ctxP.lineTo(s.x2, s.y2);
        ctxP.stroke();
      }
    }
  }

  let lastT = 0;
  function frame(now){
    if(!running){ rafId = null; return; }
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    // structure repaints only when growth crosses a quantised step,
    // so the expensive many-segment stroke happens ~100x per page,
    // not 60x per second
    if(Math.abs(growth - drawnGrowth) > 0.01) drawStructure();
    drawSignal(dt, now);
    rafId = requestAnimationFrame(frame);
  }

  function start(){
    if(running || reduceMotion) return;
    running = true; lastT = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop(){
    running = false;
    if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
  }

  function onScroll(){
    if(reduceMotion) return;
    const doc = document.documentElement;
    const max = (doc.scrollHeight - doc.clientHeight) || 1;
    const pct = Math.min(1, Math.max(0, doc.scrollTop / max));
    // ease so the field is already partly grown at the top,
    // then completes well before the footer
    growth = Math.min(1, 0.26 + pct * 1.05);
  }

  function init(){
    resize();
    if(reduceMotion){
      growth = 1;
      drawStructure();
      return;
    }
    onScroll();
    drawStructure();

    let rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(resize, 250);
    });
    window.addEventListener('scroll', onScroll, { passive: true });

    if(window.matchMedia('(hover: hover) and (pointer: fine)').matches){
      window.addEventListener('pointermove', function(e){
        pointer.tx = e.clientX; pointer.ty = e.clientY;
        if(!pointer.active){ pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; }
      }, { passive: true });
      window.addEventListener('pointerleave', function(){ pointer.active = false; });
    }

    document.addEventListener('visibilitychange', function(){
      if(document.hidden) stop(); else if(visible) start();
    });

    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        visible = entries[0].isIntersecting;
        if(visible && !document.hidden) start(); else stop();
      }, { threshold: 0 }).observe(field);
    } else {
      start();
    }
    start();
  }

  return { init: init };
})();

/* ============================================================
   2. reveals
   ============================================================ */
function initReveals(){
  const targets = document.querySelectorAll('.reveal');
  if(reduceMotion || !('IntersectionObserver' in window)){
    targets.forEach(function(t){ t.classList.add('in'); });
    return;
  }
  const io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      const sibs = Array.prototype.slice.call(e.target.parentNode.children).filter(function(n){
        return n.classList && n.classList.contains('reveal');
      });
      const i = Math.max(0, sibs.indexOf(e.target));
      e.target.style.transitionDelay = Math.min(i * 70, 420) + 'ms';
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(function(t){ io.observe(t); });
}

/* ============================================================
   3. magnetic buttons, one variable-axis wordmark moment
   ============================================================ */
function initMagnetic(){
  if(reduceMotion) return;
  if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.magnetic').forEach(function(btn){
    btn.addEventListener('pointermove', function(e){
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      btn.style.transform = 'translate(' + (dx * 7).toFixed(2) + 'px,' + (dy * 5).toFixed(2) + 'px)';
    });
    btn.addEventListener('pointerleave', function(){ btn.style.transform = ''; });
  });
}

function initWordmark(){
  const el = document.getElementById('heroWord');
  if(!el) return;
  if(reduceMotion){ el.style.fontVariationSettings = "'wdth' 100,'wght' 330"; return; }
  // single deliberate use of the width axis
  requestAnimationFrame(function(){
    el.style.transition = 'font-variation-settings 1.5s cubic-bezier(.16,1,.3,1) .15s';
    el.style.fontVariationSettings = "'wdth' 100,'wght' 330";
  });
}

/* ---------- boot ----------
   The vein field is decorative. It is isolated so that a failure
   there can never take down the content layer with it. */
function boot(){
  try{
    VeinField.init();
  }catch(err){
    console.error('[BOTANIA] vein field disabled:', err);
    const f = document.getElementById('veinField');
    if(f) f.style.display = 'none';
  }
  initReveals();
  initMagnetic();
  initWordmark();
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
})();

/* ============================================================
   MOBILE NAVIGATION
   Appended as its own isolated block. Nothing above this line
   was modified when the single-page build became multi-page.
   ============================================================ */
(function(){
'use strict';
const toggle = document.getElementById('navToggle');
const panel  = document.getElementById('primaryNav');
if(!toggle || !panel) return;

function close(){
  panel.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
}
function open(){
  panel.classList.add('open');
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Close menu');
}

toggle.addEventListener('click', function(){
  if(panel.classList.contains('open')) close(); else open();
});

// following a link should not leave the panel hanging open
panel.addEventListener('click', function(e){
  if(e.target.closest('a')) close();
});

document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && panel.classList.contains('open')){
    close();
    toggle.focus();
  }
});

// returning to desktop width must not strand the panel in its open state
let rt;
window.addEventListener('resize', function(){
  clearTimeout(rt);
  rt = setTimeout(function(){
    if(window.innerWidth > 800) close();
  }, 200);
});
})();
