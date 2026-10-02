/* ============================================================
   BOTAN.IA v5
   Carried forward from BOTANIA v4.

   Two rendering layers, chosen deliberately:

   1. SVG, the labelled systems. Real selectable text, focusable
      nodes, crisp at any pixel density, ~40 elements per canvas.
   2. CSS, the ambient structure: the hero planes, the process
      line, the light. Transforms and opacity only.

   No animation library. Growth is stroke-dashoffset transitions
   driven by a cancellable timeline, as in v4.

   What changed from v4: the palette (cool ground, muted blue for
   movement), the node silhouette (a precise rounded rectangle in
   place of the leaf corner), the node vocabulary (assistants
   rather than "AI"), a slider calculator with eased numbers, and
   the removal of the organic venation substrate, which no page
   used and which no longer fits the brand.
   ============================================================ */
(function(){
'use strict';

var NS = 'http://www.w3.org/2000/svg';
var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var EASE = 'cubic-bezier(.22,1,.36,1)';
/* Motion tokens come from the stylesheet (--motion-*), so the diagrams
   and the interface move on one timing scale. These are only fallbacks. */
var MOTION = { fast:180, normal:320, slow:600, travel:800 };
(function(){
  var cs = getComputedStyle(document.documentElement);
  Object.keys(MOTION).forEach(function(k){
    var v = parseFloat(cs.getPropertyValue('--motion-' + k));
    if(v > 0) MOTION[k] = v;
  });
})();
var NODE_H = 40;

/* Semantic palette. Each hue has exactly one job. */
var DEEP = '#13243A', BLUE = '#4F72D8', HUMAN = '#A0763C';
var EDGE = { trigger:DEEP,  std:'#A3B1C6', ai:BLUE, human:HUMAN, output:'#A3B1C6' };
var GLYPH= { trigger:'#FFFFFF', std:'#3E4C60', ai:BLUE, human:'#83602C', output:'#3E4C60' };
var LINE = '#B9C5D8', PULSE = '#5D7FE8', PATH = '#97ABD8';
/* Diagram labels take their face from the stylesheet (.n-label), so the
   typography tokens stay the single source. These are only a fallback. */
var LABEL_FONT = '"IBM Plex Sans", sans-serif';
var MARK_FONT  = 'Jost, sans-serif';

function el(name, attrs){
  var n = document.createElementNS(NS, name);
  if(attrs) for(var k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

/* A node is a precise rounded rectangle. The v4 signature kept its
   `flip` argument for the alternating leaf corner; it is accepted and
   ignored so callers do not change. */
function nodePath(x, y, w, h){
  var r = 9;
  return 'M' + (x + r) + ' ' + y +
    'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) +
    'V' + (y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) +
    'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) +
    'V' + (y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z';
}

/* Cubic Bézier with handles along the flow axis. Branches always
   leave a shared stem first (see hubs below). */
function linkPath(a, b, vertical){
  var dx = b[0] - a[0], dy = b[1] - a[1];
  var axial = Math.abs(vertical ? dy : dx);
  var cross = Math.abs(vertical ? dx : dy);
  /* Handle length grows with the run and, more gently, with the offset,
     then is capped so it can never reach past the target. */
  var c = Math.max(30, axial * 0.55 + cross * 0.18);
  c = Math.min(c, axial * 0.9 + 40);
  if(vertical) return 'M' + a[0] + ' ' + a[1] + 'C' + a[0] + ' ' + (a[1] + c) + ',' + b[0] + ' ' + (b[1] - c) + ',' + b[0] + ' ' + b[1];
  return 'M' + a[0] + ' ' + a[1] + 'C' + (a[0] + c) + ' ' + a[1] + ',' + (b[0] - c) + ' ' + b[1] + ',' + b[0] + ' ' + b[1];
}

/* 14×14 line glyphs. `seed` is the brand mark and is used only on the
   BOTAN.IA node. Everything else is geometric. */
var ICONS = {
  seed:  ['M7 12.4V3.4','M7 5.6C4.6 5.6 3 7.2 2 8.6C4.4 9 6 8 7 5.6Z','M7 5.6C9.4 5.6 11 7.2 12 8.6C9.6 9 8 8 7 5.6Z'],
  event: ['M7 2.2a4.8 4.8 0 1 1 0 9.6a4.8 4.8 0 1 1 0-9.6Z','M7 5.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3Z'],
  ai:    ['M1.6 3.4L5.6 6.6','M1.6 10.6L5.6 7.4','M12.4 7H9.4','M7.5 5.4a1.7 1.7 0 1 1 0 3.4a1.7 1.7 0 1 1 0-3.4Z'],
  db:    ['M2 3.2h10v7.6H2Z','M2 5.9h10','M2 8.3h10'],
  cal:   ['M2 3.4h10v8.4H2Z','M2 6h10','M4.6 2v2.6','M9.4 2v2.6'],
  mail:  ['M2 3.6h10v7.2H2Z','M2 3.6l5 3.8l5-3.8'],
  chart: ['M1.4 12h11.2','M3.4 12V7.6','M7 12V3.6','M10.6 12V8.8'],
  human: ['M7 2.6a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 1 1 0-4.2Z','M2.7 12.2c0-2.5 1.9-4 4.3-4s4.3 1.5 4.3 4'],
  users: ['M5.2 3a1.9 1.9 0 1 1 0 3.8a1.9 1.9 0 1 1 0-3.8Z','M1.4 11.6c0-2.2 1.7-3.5 3.8-3.5s3.8 1.3 3.8 3.5','M9.6 3.6a1.7 1.7 0 1 1 0 3.4','M10.2 8.3c1.5.3 2.4 1.5 2.4 3.3'],
  doc:   ['M3.2 1.9h4.6l3 3v7.2H3.2Z','M7.8 1.9v3h3','M5.2 8.2h3.6','M5.2 10.2h3.6'],
  card:  ['M1.5 3.4h11v7.2h-11Z','M1.5 5.9h11','M3.6 8.6h2.6'],
  task:  ['M2 2.6h10v8.8H2Z','M4.4 7.1l1.9 1.9l3.4-3.6'],
  clock: ['M7 1.9a5.1 5.1 0 1 1 0 10.2a5.1 5.1 0 1 1 0-10.2Z','M7 4.3V7l2 1.4'],
  sheet: ['M2 2.6h10v8.8H2Z','M2 5.6h10','M2 8.5h10','M5.6 2.6v8.8'],
  layers:['M7 2L12.4 4.8L7 7.6L1.6 4.8Z','M1.6 7.4L7 10.2L12.4 7.4','M1.6 9.8L7 12.6L12.4 9.8']
};

/* ============================================================
   SystemCanvas
   Builds one labelled system from a spec, then grows it.
   ============================================================ */
function SystemCanvas(svg, spec){
  var vertical = !!spec.vertical;
  var byId = {}, ports = {}, nodeEls = {}, linkEls = {}, hubEls = {};
  var timers = [], chainTimer = null, grown = false;

  svg.setAttribute('viewBox', '0 0 ' + spec.viewBox[0] + ' ' + spec.viewBox[1]);
  svg.setAttribute('width', spec.viewBox[0]);
  svg.setAttribute('height', spec.viewBox[1]);
  svg.setAttribute('role', 'img');
  svg.classList.toggle('is-vertical', vertical);
  while(svg.firstChild) svg.removeChild(svg.firstChild);

  spec.nodes.forEach(function(n){ byId[n.id] = n; });
  (spec.hubs || []).forEach(function(h){ byId[h.id] = h; });

  function outPort(id){
    var n = byId[id];
    if(n.w === undefined) return [n.x, n.y];                       // hub
    return vertical ? [n.x + n.w / 2, n.cy + NODE_H / 2] : [n.x + n.w, n.cy];
  }
  function inPort(id){
    var n = byId[id];
    if(n.w === undefined) return [n.x, n.y];
    return vertical ? [n.x + n.w / 2, n.cy - NODE_H / 2] : [n.x, n.cy];
  }

  var gLink = el('g', {'class':'links'}),  gPulse = el('g', {'class':'pulses'}),
      gPort = el('g', {'class':'ports'}),  gNode  = el('g', {'class':'nodes'});
  svg.appendChild(gLink); svg.appendChild(gPulse); svg.appendChild(gPort); svg.appendChild(gNode);

  /* ---- links ---- */
  spec.links.forEach(function(l, i){
    l.id = l.id || ('l' + i);
    var a = outPort(l.from), b = inPort(l.to);
    var p = el('path', { d: linkPath(a, b, vertical), fill:'none', stroke:LINE,
                         'stroke-linecap':'round', 'stroke-width': l.w || 1.2 });
    p.dataset.w = l.w || 1.2;
    gLink.appendChild(p);
    linkEls[l.id] = p;
    var pt = el('circle', { cx:b[0], cy:b[1], r:2.4, fill:LINE });
    pt.style.opacity = 0; gPort.appendChild(pt); ports[l.id] = pt;
  });

  /* ---- hubs: the branch point where a stem divides ---- */
  (spec.hubs || []).forEach(function(h){
    var c = el('circle', { cx:h.x, cy:h.y, r:3.2, fill:'#fff', stroke:BLUE, 'stroke-width':1.2 });
    c.style.opacity = 0; gPort.appendChild(c); hubEls[h.id] = c;
  });

  /* ---- nodes ---- */
  spec.nodes.forEach(function(n){
    var y = n.cy - NODE_H / 2;
    var g = el('g', { 'class':'sysnode', tabindex:'0', role:'group',
                      'aria-label': tr(n.label) + (n.role ? '. ' + tr(n.role) : '') });
    g.dataset.role = n.role ? tr(n.role) : '';
    g.dataset.label = n.label;

    g.appendChild(el('path', { 'class':'n-halo', d: nodePath(n.x - 5, y - 5, n.w + 10, NODE_H + 10),
                               fill:'none', stroke: EDGE[n.kind], 'stroke-width':1, opacity:'.3' }));
    if(n.kind !== 'trigger'){
      g.appendChild(el('path', { d: nodePath(n.x, y + 3, n.w, NODE_H),
                                 fill:'rgba(19,36,58,.05)', stroke:'none' }));
    }
    g.appendChild(el('path', { 'class':'n-body', d: nodePath(n.x, y, n.w, NODE_H),
                               fill: n.kind === 'trigger' ? DEEP : '#FFFFFF',
                               stroke: EDGE[n.kind], 'stroke-width': n.kind === 'ai' ? 1.2 : 1 }));
    /* human checkpoints carry a second, warmer edge on the entry side */
    if(n.kind === 'human'){
      var hx = vertical ? null : n.x + 1;
      if(hx !== null){
        g.appendChild(el('path', { d:'M' + hx + ' ' + (y + 11) + 'V' + (y + NODE_H - 11),
                                   stroke:HUMAN, 'stroke-width':2, 'stroke-linecap':'round' }));
      } else {
        g.appendChild(el('path', { d:'M' + (n.x + 12) + ' ' + (y + 1) + 'H' + (n.x + n.w - 12),
                                   stroke:HUMAN, 'stroke-width':2, 'stroke-linecap':'round' }));
      }
    }
    var ic = el('g', { 'class':'n-icon', transform:'translate(' + (n.x + 12) + ',' + (n.cy - 7) + ')',
                       stroke: GLYPH[n.kind], 'stroke-width':1.2, fill:'none',
                       'stroke-linecap':'round', 'stroke-linejoin':'round' });
    (ICONS[n.icon] || ICONS.db).forEach(function(d){ ic.appendChild(el('path', { d:d })); });
    g.appendChild(ic);

    var t = el('text', { 'class': n.mark ? 'n-label n-mark' : 'n-label', x: n.x + 34, y: n.cy, 'dominant-baseline':'central',
                         'font-family': n.mark ? MARK_FONT : LABEL_FONT,
                         'font-size': n.mark ? 12.5 : 12.75,
                         'font-weight': 600,
                         'letter-spacing': n.mark ? '2.4' : '-0.1',
                         fill: n.kind === 'trigger' ? '#FFFFFF' : '#142033' });
    t.textContent = tr(n.label);
    g.appendChild(t);

    g.appendChild(el('circle', { 'class':'n-status', cx:n.x + n.w - 12, cy:n.cy - 11, r:2.2,
                                 fill: n.kind === 'trigger' ? 'rgba(220,231,247,.8)' :
                                       n.kind === 'ai' ? 'rgba(79,114,216,.7)' : 'rgba(163,177,198,.8)' }));
    gNode.appendChild(g);
    nodeEls[n.id] = g;
  });

  /* ---- growth order, derived rather than authored ----
     Sources are the nodes nothing points at. Deriving them from the graph
     rather than from the trigger styling matters: the closing canvas
     converges several branches INTO a BOTAN.IA node, so the trigger-styled
     node there is the destination, not the origin. */
  var pointedAt = {};
  spec.links.forEach(function(l){ pointedAt[l.to] = 1; });
  var roots = spec.nodes.filter(function(n){ return !pointedAt[n.id]; }).map(function(n){ return n.id; });
  if(!roots.length) roots = [spec.nodes[0].id];

  function buildSequence(){
    var seen = {}, queue = roots.slice(), steps = [];
    roots.forEach(function(id){ seen[id] = 1; steps.push({ t:'node', id:id }); });
    while(queue.length){
      var cur = queue.shift();
      spec.links.forEach(function(l){
        if(l.from !== cur) return;
        steps.push({ t:'link', id:l.id });
        if(!seen[l.to]){
          seen[l.to] = 1;
          steps.push({ t: hubEls[l.to] ? 'hub' : 'node', id:l.to });
          queue.push(l.to);
        }
      });
    }
    return steps;
  }
  var SEQ = buildSequence();

  /* ---- root-to-leaf chains, for pulses ---- */
  function buildChains(){
    var out = [];
    function walk(id, path, depth){
      if(depth > 24) return;                       // cycle guard
      var next = spec.links.filter(function(l){ return l.from === id; });
      if(!next.length){ if(path.length) out.push(path.slice()); return; }
      next.forEach(function(l){ path.push(l.id); walk(l.to, path, depth + 1); path.pop(); });
    }
    roots.forEach(function(id){ walk(id, [], 0); });
    return out;
  }
  var CHAINS = buildChains();

  function clearTimers(){
    timers.forEach(clearTimeout); timers = [];
    if(chainTimer){ clearTimeout(chainTimer); chainTimer = null; }
    while(gPulse.firstChild) gPulse.removeChild(gPulse.firstChild);
  }
  function at(ms, fn){ timers.push(setTimeout(fn, ms)); }

  function seed(){
    clearTimers(); grown = false;
    spec.links.forEach(function(l){
      var p = linkEls[l.id], len = p.getTotalLength();
      p.style.transition = 'none';
      p.style.stroke = '';
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.style.strokeWidth = 0.5;
      ports[l.id].style.transition = 'none';
      ports[l.id].style.opacity = 0;
    });
    Object.keys(hubEls).forEach(function(k){
      hubEls[k].style.transition = 'none'; hubEls[k].style.opacity = 0;
    });
    spec.nodes.forEach(function(n){
      var g = nodeEls[n.id];
      g.style.transition = 'none';
      g.style.opacity = 0;
      g.style.transform = vertical ? 'translateY(6px)' : 'translateY(4px)';
    });
    svg.getBoundingClientRect();
  }

  /* The tools before they are connected: present, nothing linking them. */
  function seedNodesOnly(){
    seed();
    svg.classList.add('state-manual');
    spec.nodes.forEach(function(n, i){
      at(80 + i * 70, function(){
        var g = nodeEls[n.id];
        g.style.transition = 'opacity ' + MOTION.normal + 'ms ' + EASE + ', transform ' + MOTION.normal + 'ms ' + EASE;
        g.style.opacity = 1; g.style.transform = 'none';
      });
    });
  }

  function settle(){
    clearTimers(); grown = true;
    svg.classList.remove('state-manual');
    spec.links.forEach(function(l){
      var p = linkEls[l.id];
      p.style.transition = 'none';
      p.style.strokeDasharray = 'none';
      p.style.strokeDashoffset = 0;
      p.style.strokeWidth = l.w || 1.2;
      ports[l.id].style.transition = 'none';
      ports[l.id].style.opacity = 1;
    });
    Object.keys(hubEls).forEach(function(k){ hubEls[k].style.opacity = 1; });
    spec.nodes.forEach(function(n){
      var g = nodeEls[n.id];
      g.style.transition = 'none'; g.style.opacity = 1; g.style.transform = 'none';
    });
    highlightPath(true);
  }

  /* Reduced motion still gets the "information travels here" idea,
     as a fixed segment on the trunk rather than a moving one. */
  function staticSignal(){
    if(!CHAINS.length) return;
    var chain = CHAINS[0];
    chain.slice(0, 3).forEach(function(id, i){
      var src = linkEls[id], len = src.getTotalLength();
      var p = el('path', { d: src.getAttribute('d'), fill:'none', stroke:PULSE,
                           'stroke-linecap':'round',
                           'stroke-width': Math.max(1.2, src.dataset.w * 0.95) });
      p.setAttribute('stroke-dasharray', Math.min(40, len) + ' ' + (len + 80));
      p.setAttribute('stroke-dashoffset', -len * 0.35);
      p.style.opacity = 0.8 - i * 0.16;
      gPulse.appendChild(p);
    });
  }

  function growLink(id, dur){
    var p = linkEls[id];
    p.style.transition = 'stroke-dashoffset ' + dur + 'ms ' + EASE +
                         ', stroke-width ' + MOTION.fast + 'ms ' + EASE + ' ' + Math.max(0, dur - 140) + 'ms';
    p.style.strokeDashoffset = 0;
    p.style.strokeWidth = p.dataset.w;
    at(Math.max(0, dur - 200), function(){
      ports[id].style.transition = 'opacity ' + MOTION.normal + 'ms ' + EASE;
      ports[id].style.opacity = 1;
    });
  }
  function activate(id){
    var g = nodeEls[id];
    g.style.transition = 'opacity ' + MOTION.normal + 'ms ' + EASE + ', transform ' + MOTION.normal + 'ms ' + EASE;
    g.style.opacity = 1; g.style.transform = 'none';
  }

  /* A pulse is a short bright segment with a faint wider trail under
     it, so it reads as light moving rather than a line redrawing. */
  function firePulse(id){
    var src = linkEls[id];
    if(!src) return 0;
    var len = src.getTotalLength();
    var w = Math.max(1.3, src.dataset.w * 1.05);
    var glow = el('path', { d: src.getAttribute('d'), fill:'none', stroke:PULSE,
                            'stroke-linecap':'round', 'stroke-width': w * 3.2 });
    var p = el('path', { d: src.getAttribute('d'), fill:'none', stroke:PULSE,
                         'stroke-linecap':'round', 'stroke-width': w });
    [glow, p].forEach(function(s, i){
      s.style.strokeDasharray = '28 ' + (len + 60);
      s.style.strokeDashoffset = 28;
      s.style.opacity = i ? 0.9 : 0.12;
      gPulse.appendChild(s);
    });
    var dur = Math.max(320, len / 190 * 1000);
    requestAnimationFrame(function(){
      [glow, p].forEach(function(s){
        s.style.transition = 'stroke-dashoffset ' + dur + 'ms linear';
        s.style.strokeDashoffset = -len;
      });
    });
    at(dur + 160, function(){
      [glow, p].forEach(function(s){ if(s.parentNode) s.parentNode.removeChild(s); });
    });
    return dur;
  }

  /* Once the system has assembled, its main route is drawn a shade
     stronger and carries one pulse. After that the system mostly rests:
     one pulse along one route every few seconds, and none at all while
     the canvas is off screen. */
  var chainIdx = 0, AMBIENT_REST = 6500, onScreen = true, waiting = false;
  function highlightPath(instant){
    if(!CHAINS.length) return;
    CHAINS[0].forEach(function(id){
      var p = linkEls[id];
      p.style.transition = instant ? 'none' : 'stroke ' + MOTION.travel + 'ms ' + EASE;
      p.style.stroke = PATH;
    });
  }
  if(svg._io) svg._io.disconnect();
  if('IntersectionObserver' in window){
    svg._io = new IntersectionObserver(function(entries){
      onScreen = entries[0].isIntersecting;
      if(onScreen && waiting) runChains();
    });
    svg._io.observe(svg);
  }
  function runChains(){
    if(!CHAINS.length || REDUCED) return;
    if(!onScreen){ waiting = true; return; }
    waiting = false;
    var chain = CHAINS[chainIdx % CHAINS.length]; chainIdx++;
    var acc = 0;
    chain.forEach(function(id){
      at(acc, function(){ firePulse(id); });
      var l = linkEls[id];
      acc += Math.max(320, l.getTotalLength() / 190 * 1000) * 0.82;
      /* a human checkpoint holds the signal for a beat: a decision happened */
      var link = spec.links.filter(function(x){ return x.id === id; })[0];
      if(link && byId[link.to] && byId[link.to].kind === 'human') acc += 420;
    });
    chainTimer = setTimeout(runChains, acc + AMBIENT_REST);
    timers.push(chainTimer);
  }

  var NODE_MS = MOTION.normal, LINK_MS = spec.linkMs || 640, GAP = 80;
  function grow(opts){
    opts = opts || {};
    seed();
    var t = opts.delay || 120;
    SEQ.forEach(function(s){
      if(s.t === 'link'){
        at(t, function(){ growLink(s.id, LINK_MS); });
        t += LINK_MS + 40;
      } else if(s.t === 'hub'){
        at(t, function(){
          hubEls[s.id].style.transition = 'opacity ' + MOTION.normal + 'ms ' + EASE;
          hubEls[s.id].style.opacity = 1;
        });
        t += 180;
      } else {
        at(t, (function(id){ return function(){ activate(id); }; })(s.id));
        t += NODE_MS + GAP;
      }
    });
    at(t, function(){ grown = true; highlightPath(); });
    if(opts.pulse !== false) at(t + 600, runChains);
    return t;
  }

  /* Grow the connections onto nodes that are already standing. */
  function connect(){
    clearTimers();
    svg.classList.remove('state-manual');
    var t = 60;
    SEQ.forEach(function(s){
      if(s.t === 'link'){ at(t, function(){ growLink(s.id, LINK_MS); }); t += LINK_MS * 0.55; }
      else if(s.t === 'hub'){
        at(t, function(){ hubEls[s.id].style.transition = 'opacity ' + MOTION.normal + 'ms ' + EASE; hubEls[s.id].style.opacity = 1; });
      }
    });
    return t;
  }

  return {
    svg: svg,
    grow: grow,
    connect: connect,
    seed: seed,
    seedNodesOnly: seedNodesOnly,
    settle: settle,
    staticSignal: staticSignal,
    flow: runChains,
    stop: clearTimers,
    isGrown: function(){ return grown; },
    nodes: nodeEls
  };
}

/* ============================================================
   node role tooltips. Hovering a node reveals what it does
   ============================================================ */
function initNodeRoles(plate){
  var tip = document.createElement('div');
  tip.className = 'node-role';
  tip.setAttribute('role', 'status');
  plate.appendChild(tip);

  function show(g){
    var role = g.dataset.role;
    if(!role) return;
    tip.textContent = role;
    tip.classList.add('show');
    var pr = plate.getBoundingClientRect();
    var gr = g.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = gr.left - pr.left + gr.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, pr.width - tw - 8));
    var top = gr.top - pr.top - th - 10;
    if(top < 6) top = gr.top - pr.top + gr.height + 10;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hide(){ tip.classList.remove('show'); }

  plate.addEventListener('pointerover', function(e){
    var g = e.target.closest && e.target.closest('.sysnode');
    if(g) show(g); else hide();
  });
  plate.addEventListener('pointerleave', hide);
  plate.addEventListener('focusin', function(e){
    var g = e.target.closest && e.target.closest('.sysnode');
    if(g) show(g);
  });
  plate.addEventListener('focusout', hide);
}

/* ============================================================
   start a canvas when it enters the viewport
   ============================================================ */
function whenVisible(node, fn){
  if(!('IntersectionObserver' in window)){ fn(); return; }
  var vh = window.innerHeight || document.documentElement.clientHeight;
  if(node.getBoundingClientRect().top < vh){ fn(); return; }
  var done = false;
  var io = new IntersectionObserver(function(entries){
    if(entries[0].isIntersecting && !done){ done = true; io.disconnect(); fn(); }
  }, { threshold: 0.2 });
  io.observe(node);
}

/* ============================================================
   SYSTEM SPECS
   Node labels use the business owner's vocabulary. Never
   "webhook", "trigger", "payload", "endpoint". "Assistant" is
   preferred to "AI" wherever it reads naturally.
   ============================================================ */

var ROLES = {
  lead:   'A form submission, an email or a referral. Whatever starts the process.',
  qual:   'The assistant reads the inquiry, checks it against your criteria and routes it. Anything unclear goes to a person.',
  crm:    'The record is created and kept current without anyone typing it in twice.',
  sched:  'Offers real availability and books the time automatically.',
  reply:  'Drafts the reply using what the system already knows about this lead. You send it, or edit it first.',
  review: 'You approve anything unusual, or above a value you set. The system waits, then carries on.'
};

/* ---- Portuguese ----------------------------------------------------------
   Both languages share this file. Diagram labels, hover text, captions and
   calculator strings live here rather than in the markup, and are swapped at
   render time based on <html lang>. Anything missing falls through to
   English, which keeps a half-finished translation readable. */
var PT_ON = /^pt/i.test(document.documentElement.getAttribute('lang') || '');
var PT = {
  /* node labels */
  'New Lead':'Novo Lead',
  'Capture':'Captura',
  'CRM Update':'Atualiza CRM',
  'Qualification':'Qualificação',
  'Scheduling':'Agendamento',
  'Reply Assistant':'Assistente de Resposta',
  'Owner Review':'Sua Aprovação',
  'Follow-up':'Follow-up',
  'New Client':'Novo Cliente',
  'Intake':'Cadastro',
  'Documents':'Documentos',
  'Internal Tasks':'Tarefas Internas',
  'Document Check':'Conferência',
  'Approval':'Aprovação',
  'Client Update':'Aviso ao Cliente',
  'Referral':'Indicação',
  'Service':'Serviço',
  'Report Assistant':'Assistente de Relatório',
  'Invoice':'Nota Fiscal',
  'Client Delivery':'Entrega Final',
  'Context':'Contexto',
  'Judgment':'Critério',
  'Systems':'Sistemas',
  'Inbox':'Caixa de Entrada',
  'Follow-ups':'Follow-ups',
  'Data entry':'Entrada de dados',
  'Reporting':'Relatórios',
  'Assistant':'Assistente',
  'Capacity':'Capacidade',
  'Clients':'Clientes',
  'Sales':'Vendas',
  'Strategy':'Estratégia',
  'Delivery':'Entrega',
  'Spreadsheets':'Planilhas',
  'Calendar':'Agenda',
  'Invoicing':'Faturamento',

  /* shared hover text */
  'A form submission, an email or a referral. Whatever starts the process.':
    'Um formulário, um e-mail ou uma indicação. O que quer que comece o processo.',
  'The assistant reads the inquiry, checks it against your criteria and routes it. Anything unclear goes to a person.':
    'O assistente lê o contato, confere com os seus critérios e encaminha. O que ficar em dúvida vai para uma pessoa.',
  'The record is created and kept current without anyone typing it in twice.':
    'O registro é criado e mantido em dia sem ninguém digitar duas vezes.',
  'Offers real availability and books the time automatically.':
    'Oferece os horários que existem de verdade e agenda automaticamente.',
  'Drafts the reply using what the system already knows about this lead. You send it, or edit it first.':
    'Escreve a resposta com o que o sistema já sabe sobre esse lead. Você envia ou edita antes.',
  'You approve anything unusual, or above a value you set. The system waits, then carries on.':
    'Você aprova o que for fora do padrão, ou acima de um valor que definir. O sistema espera e depois segue.',
  'The details are recorded once, in a consistent shape, with nobody retyping them.':
    'Os dados são registrados uma vez, no mesmo formato, sem ninguém digitar de novo.',

  /* per-node hover text */
  'Chases the ones that go quiet, on a schedule you set once.':
    'Cobra quem some, no ritmo que você definir uma vez.',
  'A signed proposal or a closed deal. Onboarding starts itself.':
    'Uma proposta assinada ou um negócio fechado. O onboarding começa sozinho.',
  'One form, asked once, feeding everything after it.':
    'Um formulário, perguntado uma vez, alimentando tudo depois.',
  'Asks for what is missing and chases it until it arrives.':
    'Pede o que está faltando e cobra até chegar.',
  'Assigns the setup work to the right people with the right dates.':
    'Distribui o trabalho de setup para as pessoas certas com os prazos certos.',
  'Reads what came in, pulls out what matters and flags anything that looks wrong.':
    'Lê o que chegou, separa o que importa e sinaliza o que parece errado.',
  'A person confirms before anything reaches the client.':
    'Uma pessoa confirma antes de qualquer coisa chegar ao cliente.',
  'The client hears where things stand without having to ask.':
    'O cliente sabe como as coisas estão sem precisar perguntar.',
  'However the work arrives: a partner, a portal or a phone call.':
    'Como o trabalho chegar: um parceiro, um portal ou um telefonema.',
  'Captured once, organized, and sent to the right place.':
    'Registrado uma vez, organizado e encaminhado para o lugar certo.',
  'Booked against real availability and confirmed automatically.':
    'Agendado nos horários que existem de verdade e confirmado automaticamente.',
  'The work your team is there to do.':
    'O trabalho que a sua equipe está ali para fazer.',
  'Prepares the report from what the system already recorded.':
    'Prepara o relatório a partir do que o sistema já registrou.',
  'Raised from the work the system already recorded.':
    'Emitida a partir do trabalho que o sistema já registrou.',
  'You review the report before it goes to the client.':
    'Você revisa o relatório antes de ir para o cliente.',
  'Report and invoice reach the client together, on time.':
    'Relatório e nota chegam juntos ao cliente, no prazo.',
  'Requests arrive here and are routed to the right place.':
    'As solicitações chegam aqui e são encaminhadas para o lugar certo.',
  'Kept current by the system instead of by hand.':
    'Mantidas em dia pelo sistema, não à mão.',
  'Filed once, in the right place, and linked to the record.':
    'Arquivados uma vez, no lugar certo e ligados ao registro.',
  'The shared record every other tool reads from and updates.':
    'O registro central que as outras ferramentas consultam e atualizam.',

  /* capacity diagram */
  'Reminders and replies that someone has to remember to send.':
    'Lembretes e respostas que alguém precisa lembrar de enviar.',
  'The same details typed into more than one place.':
    'Os mesmos dados digitados em mais de um lugar.',
  'Back-and-forth to find a time that works.':
    'Idas e vindas para encontrar um horário que funcione.',
  'Numbers gathered by hand every week or month.':
    'Números reunidos à mão toda semana ou todo mês.',
  'Handles the recurring steps, with review points where a person should decide.':
    'Cuida das etapas recorrentes, com pontos de revisão onde uma pessoa deve decidir.',
  'Time and attention that no longer go to repetitive work.':
    'Tempo e atenção que deixam de ir para o trabalho repetitivo.',
  'More time for the clients you already serve.':
    'Mais tempo para os clientes que você já atende.',
  'Room to follow up on opportunities and new conversations.':
    'Espaço para acompanhar oportunidades e novas conversas.',
  'Time to plan ahead instead of reacting.':
    'Tempo para planejar em vez de apenas reagir.',
  'More attention for the quality of the work itself.':
    'Mais atenção para a qualidade do próprio trabalho.',

  /* scenario captions */
  'An inquiry is captured and recorded in your CRM. The system qualifies it, an assistant drafts the reply and scheduling is handled automatically. You review anything unusual before follow-up continues.':
    'O contato é registrado e vai para o CRM. O sistema qualifica, um assistente escreve a resposta e o agendamento acontece automaticamente. Você revisa o que for fora do padrão antes do follow-up seguir.',
  'Onboarding runs on its own. Details are collected once, documents are requested, setup tasks are assigned and the system checks what comes back. A person approves before anything reaches the client.':
    'O onboarding roda sozinho. Os dados são coletados uma vez, os documentos são solicitados, as tarefas de setup são distribuídas e o sistema confere o que chega. Uma pessoa aprova antes de qualquer coisa ir para o cliente.',
  'A referral moves through scheduling and delivery. An assistant prepares the report from what the system already recorded, you approve it, and the invoice goes out with it.':
    'Uma indicação passa pelo agendamento e segue até a entrega. Um assistente prepara o relatório com o que o sistema já registrou, você aprova e a nota sai junto.',

  /* tools captions */
  'Your tools, as they are today. A person moves information between them.':
    'Suas ferramentas, como estão hoje. Uma pessoa leva a informação de uma para outra.',
  'We map how information moves, then build the connections that carry it.':
    'Mapeamos como a informação circula e construímos as conexões que a levam.',
  'The same tools, working as one system. Information arrives where it is needed.':
    'As mesmas ferramentas, funcionando como um sistema. A informação chega onde é necessária.',
  'Replay':'Repetir',
  'Motion reduced':'Movimento reduzido',

  /* calculator */
  'under half a workweek':'menos de meia semana de trabalho',
  'about one workweek':'cerca de uma semana de trabalho',
  'about {n} workweeks':'cerca de {n} semanas de trabalho',
  'hour':'hora',
  'hours':'horas',
  'You could create {n} {u} of additional capacity per week.':'Você poderia criar {n} {u} de capacidade adicional por semana.',

  /* navigation */
  'Open menu':'Abrir menu',
  'Close menu':'Fechar menu'
};
function tr(str){ return (PT_ON && PT[str]) || str; }

/* Portuguese labels run longer than their English counterparts, so a few
   node boxes widen to keep the same breathing room around the text. Each
   widening fits inside an existing gap, so no downstream node has to move. */
var PT_LAYOUT = {
  scenarioLead:    { nodes:{ lead:{w:120}, cap:{x:154, w:112}, crm:{x:290, w:140}, qual:{x:452, w:152},
                             sched:{x:658, w:146}, resp:{x:648, w:212}, review:{x:904, w:148}, follow:{x:1072} },
                     hubs:{ h1:{x:630}, h2:{x:880} } },
  scenarioClient:  { nodes:{ client:{w:140}, intake:{w:114}, docs:{w:136}, tasks:{w:170}, upd:{w:170} } },
  scenarioService: { nodes:{ ref:{w:122}, intake:{w:114}, sched:{w:146}, inv:{w:134}, rep:{x:644, w:218}, appr:{x:882} },
                     hubs:{ h2:{x:1022} } },
  /* The longer Portuguese labels need the whole row on a phone, so these
     canvases are authored a little wider in Portuguese. */
  scenarioLeadMobile:    { viewBox:[380,600], nodes:{ sched:{x:6, w:144}, resp:{x:164, w:210} } },
  scenarioClientMobile:  { nodes:{ tasks:{x:188, w:170}, upd:{x:84, w:170} } },
  scenarioServiceMobile: { viewBox:[380,606], nodes:{ rep:{x:2, w:218}, inv:{x:238, w:134}, sched:{x:88, w:146} } },
  transform:       { nodes:{ inbox:{w:170}, inv:{w:138} } },
  transformMobile: { nodes:{ inbox:{x:96, w:168} } },
  cta:             { nodes:{ ctx:{x:97, w:118}, sys:{x:427, w:116} } },
  capacity:        { nodes:{ t2:{w:168}, t3:{w:148}, as:{w:128}, cp:{w:130}, o1:{w:132}, o2:{w:132}, o3:{w:132}, o4:{w:132} } },
  capacityMobile:  { nodes:{ t2:{x:186, w:170} } }
};
function localiseSpecs(){
  if(!PT_ON) return;
  Object.keys(PT_LAYOUT).forEach(function(key){
    var spec = SPECS[key], patch = PT_LAYOUT[key];
    if(!spec) return;
    if(patch.viewBox) spec.viewBox = patch.viewBox;
    (spec.nodes || []).forEach(function(n){
      var p = patch.nodes && patch.nodes[n.id];
      if(!p) return;
      if(p.x != null) n.x = p.x;
      if(p.w != null) n.w = p.w;
    });
    (spec.hubs || []).forEach(function(h){
      var p = patch.hubs && patch.hubs[h.id];
      if(!p) return;
      if(p.x != null) h.x = p.x;
      if(p.y != null) h.y = p.y;
    });
  });
}

var SPECS = {};

SPECS.scenarioLead = {
  viewBox:[1200,420],
  nodes:[
    {id:'lead',  label:'New Lead',        x:16,  cy:210, w:116, kind:'trigger', icon:'event', role:ROLES.lead},
    {id:'cap',   label:'Capture',         x:156, cy:210, w:112, kind:'std',     icon:'task',  role:'The details are recorded once, in a consistent shape, with nobody retyping them.'},
    {id:'crm',   label:'CRM Update',      x:296, cy:210, w:136, kind:'std',     icon:'db',    role:ROLES.crm},
    {id:'qual',  label:'Qualification',   x:460, cy:210, w:150, kind:'ai',      icon:'ai',    role:ROLES.qual},
    {id:'sched', label:'Scheduling',      x:678, cy:100, w:132, kind:'std',     icon:'cal',   role:ROLES.sched},
    {id:'resp',  label:'Reply Assistant', x:674, cy:320, w:166, kind:'ai',      icon:'mail',  role:ROLES.reply},
    {id:'review',label:'Owner Review',    x:894, cy:210, w:142, kind:'human',   icon:'human', role:ROLES.review},
    {id:'follow',label:'Follow-up',       x:1068,cy:210, w:122, kind:'std',     icon:'clock', role:'Chases the ones that go quiet, on a schedule you set once.'}
  ],
  hubs:[{id:'h1', x:644, y:210},{id:'h2', x:866, y:210}],
  links:[
    {from:'lead',to:'cap',w:2.1},{from:'cap',to:'crm',w:2.05},{from:'crm',to:'qual',w:2.0},
    {from:'qual',to:'h1',w:1.9},{from:'h1',to:'sched',w:1.3},{from:'h1',to:'resp',w:1.35},
    {from:'sched',to:'h2',w:1.25},{from:'resp',to:'h2',w:1.3},
    {from:'h2',to:'review',w:1.8},{from:'review',to:'follow',w:1.6}
  ]
};

SPECS.scenarioClient = {
  viewBox:[1200,420],
  nodes:[
    {id:'client',label:'New Client',    x:30,  cy:210, w:128, kind:'trigger', icon:'event', role:'A signed proposal or a closed deal. Onboarding starts itself.'},
    {id:'intake',label:'Intake',        x:200, cy:210, w:100, kind:'std',     icon:'task',  role:'One form, asked once, feeding everything after it.'},
    {id:'docs',  label:'Documents',     x:376, cy:92,  w:126, kind:'std',     icon:'doc',   role:'Asks for what is missing and chases it until it arrives.'},
    {id:'tasks', label:'Internal Tasks',x:376, cy:328, w:156, kind:'std',     icon:'task',  role:'Assigns the setup work to the right people with the right dates.'},
    {id:'proc',  label:'Document Check',x:600, cy:210, w:160, kind:'ai',      icon:'ai',    role:'Reads what came in, pulls out what matters and flags anything that looks wrong.'},
    {id:'appr',  label:'Approval',      x:806, cy:210, w:124, kind:'human',   icon:'human', role:'A person confirms before anything reaches the client.'},
    {id:'upd',   label:'Client Update', x:976, cy:210, w:150, kind:'std',     icon:'mail',  role:'The client hears where things stand without having to ask.'}
  ],
  hubs:[{id:'h1', x:338, y:210},{id:'h2', x:564, y:210}],
  links:[
    {from:'client',to:'intake',w:2.0},{from:'intake',to:'h1',w:1.9},
    {from:'h1',to:'docs',w:1.3},{from:'h1',to:'tasks',w:1.3},
    {from:'docs',to:'h2',w:1.3},{from:'tasks',to:'h2',w:1.3},
    {from:'h2',to:'proc',w:1.9},{from:'proc',to:'appr',w:1.8},{from:'appr',to:'upd',w:1.7}
  ]
};

SPECS.scenarioService = {
  viewBox:[1200,420],
  nodes:[
    {id:'ref',   label:'Referral',        x:20,   cy:210, w:116, kind:'trigger', icon:'event', role:'However the work arrives: a partner, a portal or a phone call.'},
    {id:'intake',label:'Intake',          x:168,  cy:210, w:100, kind:'std',     icon:'task',  role:'Captured once, organized, and sent to the right place.'},
    {id:'sched', label:'Scheduling',      x:302,  cy:210, w:132, kind:'std',     icon:'cal',   role:'Booked against real availability and confirmed automatically.'},
    {id:'svc',   label:'Service',         x:468,  cy:210, w:108, kind:'std',     icon:'users', role:'The work your team is there to do.'},
    {id:'rep',   label:'Report Assistant',x:652,  cy:96,  w:176, kind:'ai',      icon:'chart', role:'Prepares the report from what the system already recorded.'},
    {id:'inv',   label:'Invoice',         x:652,  cy:324, w:112, kind:'std',     icon:'card',  role:'Raised from the work the system already recorded.'},
    {id:'appr',  label:'Approval',        x:860,  cy:96,  w:124, kind:'human',   icon:'human', role:'You review the report before it goes to the client.'},
    {id:'deliv', label:'Client Delivery', x:1032, cy:210, w:164, kind:'std',     icon:'mail',  role:'Report and invoice reach the client together, on time.'}
  ],
  hubs:[{id:'h1', x:614, y:210},{id:'h2', x:1012, y:210}],
  links:[
    {from:'ref',to:'intake',w:2.0},{from:'intake',to:'sched',w:1.95},{from:'sched',to:'svc',w:1.9},
    {from:'svc',to:'h1',w:1.85},{from:'h1',to:'rep',w:1.3},{from:'h1',to:'inv',w:1.2},
    {from:'rep',to:'appr',w:1.25},{from:'appr',to:'h2',w:1.2},{from:'inv',to:'h2',w:1.15},
    {from:'h2',to:'deliv',w:1.8}
  ]
};

/* The tools a business already runs. First they stand alone; then the
   connections grow between them; then information moves. */
SPECS.transform = {
  viewBox:[950,340],
  nodes:[
    {id:'inbox', label:'Inbox',        x:40,  cy:160, w:110, kind:'std', icon:'mail',  role:'Requests arrive here and are routed to the right place.'},
    {id:'sheet', label:'Spreadsheets', x:268, cy:56,  w:146, kind:'std', icon:'sheet', role:'Kept current by the system instead of by hand.'},
    {id:'docs',  label:'Documents',    x:268, cy:264, w:136, kind:'std', icon:'doc',   role:'Filed once, in the right place, and linked to the record.'},
    {id:'crm',   label:'CRM',          x:560, cy:160, w:92,  kind:'std', icon:'db',    role:'The shared record every other tool reads from and updates.'},
    {id:'cal',   label:'Calendar',     x:770, cy:56,  w:124, kind:'std', icon:'cal',   role:'Booked against real availability and confirmed automatically.'},
    {id:'inv',   label:'Invoicing',    x:770, cy:264, w:124, kind:'std', icon:'card',  role:'Raised from the work the system already recorded.'}
  ],
  links:[
    {from:'inbox',to:'sheet',w:1.5},{from:'inbox',to:'docs',w:1.5},
    {from:'sheet',to:'crm',w:1.4},{from:'docs',to:'crm',w:1.4},
    {from:'crm',to:'cal',w:1.3},{from:'crm',to:'inv',w:1.3}
  ]
};

/* ---- the same systems, recomposed for a phone ----------------------
   Not the desktop layout scaled down: at 1200 units across, labels land
   under 9px on a phone. These run vertically, keep every node inside the
   viewport, and hold the branch points as real branches. */
SPECS.scenarioLeadMobile = {
  viewBox:[360,600], vertical:true, linkMs:520,
  nodes:[
    {id:'lead',  label:'New Lead',        x:84,  cy:34,  w:150, kind:'trigger', icon:'event', role:ROLES.lead},
    {id:'cap',   label:'Capture',         x:94,  cy:110, w:130, kind:'std',     icon:'task',  role:'The details are recorded once, in a consistent shape, with nobody retyping them.'},
    {id:'crm',   label:'CRM Update',      x:84,  cy:186, w:152, kind:'std',     icon:'db',    role:ROLES.crm},
    {id:'qual',  label:'Qualification',   x:84,  cy:262, w:160, kind:'ai',      icon:'ai',    role:ROLES.qual},
    {id:'sched', label:'Scheduling',      x:10,  cy:368, w:150, kind:'std',     icon:'cal',   role:ROLES.sched},
    {id:'resp',  label:'Reply Assistant', x:180, cy:368, w:172, kind:'ai',      icon:'mail',  role:ROLES.reply},
    {id:'review',label:'Owner Review',    x:90,  cy:490, w:155, kind:'human',   icon:'human', role:ROLES.review},
    {id:'follow',label:'Follow-up',       x:100, cy:566, w:135, kind:'std',     icon:'clock', role:'Chases the ones that go quiet, on a schedule you set once.'}
  ],
  hubs:[{id:'h1', x:180, y:318},{id:'h2', x:180, y:440}],
  links:[
    {from:'lead',to:'cap',w:2.0},{from:'cap',to:'crm',w:1.95},{from:'crm',to:'qual',w:1.9},
    {from:'qual',to:'h1',w:1.85},{from:'h1',to:'sched',w:1.3},{from:'h1',to:'resp',w:1.3},
    {from:'sched',to:'h2',w:1.3},{from:'resp',to:'h2',w:1.3},
    {from:'h2',to:'review',w:1.7},{from:'review',to:'follow',w:1.2}
  ]
};

SPECS.scenarioClientMobile = {
  viewBox:[360,534], vertical:true, linkMs:520,
  nodes:[
    {id:'client',label:'New Client',    x:84,  cy:34,  w:150, kind:'trigger', icon:'event', role:'A signed proposal or a closed deal. Onboarding starts itself.'},
    {id:'intake',label:'Intake',        x:94,  cy:114, w:130, kind:'std',     icon:'task',  role:'One form, asked once, feeding everything after it.'},
    {id:'docs',  label:'Documents',     x:10,  cy:216, w:150, kind:'std',     icon:'doc',   role:'Asks for what is missing and chases it until it arrives.'},
    {id:'tasks', label:'Internal Tasks',x:192, cy:216, w:158, kind:'std',     icon:'task',  role:'Assigns the setup work to the right people with the right dates.'},
    {id:'proc',  label:'Document Check',x:84,  cy:340, w:166, kind:'ai',      icon:'ai',    role:'Reads what came in, pulls out what matters and flags anything that looks wrong.'},
    {id:'appr',  label:'Approval',      x:100, cy:412, w:130, kind:'human',   icon:'human', role:'A person confirms before anything reaches the client.'},
    {id:'upd',   label:'Client Update', x:90,  cy:490, w:158, kind:'std',     icon:'mail',  role:'The client hears where things stand without having to ask.'}
  ],
  hubs:[{id:'h1', x:180, y:166},{id:'h2', x:180, y:288}],
  links:[
    {from:'client',to:'intake',w:2.0},{from:'intake',to:'h1',w:1.9},
    {from:'h1',to:'docs',w:1.3},{from:'h1',to:'tasks',w:1.3},
    {from:'docs',to:'h2',w:1.3},{from:'tasks',to:'h2',w:1.3},
    {from:'h2',to:'proc',w:1.9},{from:'proc',to:'appr',w:1.8},{from:'appr',to:'upd',w:1.7}
  ]
};

SPECS.scenarioServiceMobile = {
  viewBox:[360,606], vertical:true, linkMs:520,
  nodes:[
    {id:'ref',   label:'Referral',        x:84,  cy:34,  w:150, kind:'trigger', icon:'event', role:'However the work arrives: a partner, a portal or a phone call.'},
    {id:'intake',label:'Intake',          x:94,  cy:106, w:130, kind:'std',     icon:'task',  role:'Captured once, organized, and sent to the right place.'},
    {id:'sched', label:'Scheduling',      x:90,  cy:178, w:140, kind:'std',     icon:'cal',   role:'Booked against real availability and confirmed automatically.'},
    {id:'svc',   label:'Service',         x:100, cy:250, w:126, kind:'std',     icon:'users', role:'The work your team is there to do.'},
    {id:'rep',   label:'Report Assistant',x:6,   cy:352, w:178, kind:'ai',      icon:'chart', role:'Prepares the report from what the system already recorded.'},
    {id:'inv',   label:'Invoice',         x:220, cy:352, w:126, kind:'std',     icon:'card',  role:'Raised from the work the system already recorded.'},
    {id:'appr',  label:'Approval',        x:26,  cy:436, w:140, kind:'human',   icon:'human', role:'You review the report before it goes to the client.'},
    {id:'deliv', label:'Client Delivery', x:90,  cy:562, w:162, kind:'std',     icon:'mail',  role:'Report and invoice reach the client together, on time.'}
  ],
  hubs:[{id:'h1', x:180, y:302},{id:'h2', x:180, y:504}],
  links:[
    {from:'ref',to:'intake',w:2.0},{from:'intake',to:'sched',w:1.95},{from:'sched',to:'svc',w:1.9},
    {from:'svc',to:'h1',w:1.85},{from:'h1',to:'rep',w:1.3},{from:'h1',to:'inv',w:1.2},
    {from:'rep',to:'appr',w:1.25},{from:'appr',to:'h2',w:1.2},{from:'inv',to:'h2',w:1.15},
    {from:'h2',to:'deliv',w:1.8}
  ]
};

SPECS.transformMobile = {
  viewBox:[360,440], vertical:true, linkMs:520,
  nodes:[
    {id:'inbox', label:'Inbox',        x:120, cy:34,  w:120, kind:'std', icon:'mail',  role:'Requests arrive here and are routed to the right place.'},
    {id:'sheet', label:'Spreadsheets', x:10,  cy:150, w:156, kind:'std', icon:'sheet', role:'Kept current by the system instead of by hand.'},
    {id:'docs',  label:'Documents',    x:194, cy:150, w:156, kind:'std', icon:'doc',   role:'Filed once, in the right place, and linked to the record.'},
    {id:'crm',   label:'CRM',          x:125, cy:270, w:110, kind:'std', icon:'db',    role:'The shared record every other tool reads from and updates.'},
    {id:'cal',   label:'Calendar',     x:10,  cy:396, w:156, kind:'std', icon:'cal',   role:'Booked against real availability and confirmed automatically.'},
    {id:'inv',   label:'Invoicing',    x:194, cy:396, w:156, kind:'std', icon:'card',  role:'Raised from the work the system already recorded.'}
  ],
  links:[
    {from:'inbox',to:'sheet',w:1.5},{from:'inbox',to:'docs',w:1.5},
    {from:'sheet',to:'crm',w:1.4},{from:'docs',to:'crm',w:1.4},
    {from:'crm',to:'cal',w:1.3},{from:'crm',to:'inv',w:1.3}
  ]
};

/* Capacity. Several kinds of recurring work consolidate into one assisted
   route; what that releases is redirected to the work that moves the
   business. The outcome nodes are people's work, so they carry the warm
   human edge. Nothing here is money: it is time and attention. */
var CAP_ROLES = {
  follow:   'Reminders and replies that someone has to remember to send.',
  entry:    'The same details typed into more than one place.',
  sched:    'Back-and-forth to find a time that works.',
  report:   'Numbers gathered by hand every week or month.',
  assist:   'Handles the recurring steps, with review points where a person should decide.',
  capacity: 'Time and attention that no longer go to repetitive work.',
  clients:  'More time for the clients you already serve.',
  sales:    'Room to follow up on opportunities and new conversations.',
  strategy: 'Time to plan ahead instead of reacting.',
  delivery: 'More attention for the quality of the work itself.'
};
SPECS.capacity = {
  viewBox:[712,330], linkMs:540,
  nodes:[
    {id:'t1', label:'Follow-ups', x:8,   cy:45,  w:136, kind:'std',     icon:'mail',   role:CAP_ROLES.follow},
    {id:'t2', label:'Data entry', x:8,   cy:125, w:136, kind:'std',     icon:'sheet',  role:CAP_ROLES.entry},
    {id:'t3', label:'Scheduling', x:8,   cy:205, w:136, kind:'std',     icon:'cal',    role:CAP_ROLES.sched},
    {id:'t4', label:'Reporting',  x:8,   cy:285, w:136, kind:'std',     icon:'doc',    role:CAP_ROLES.report},
    {id:'as', label:'Assistant',  x:232, cy:165, w:122, kind:'ai',      icon:'ai',     role:CAP_ROLES.assist},
    {id:'cp', label:'Capacity',   x:384, cy:165, w:116, kind:'trigger', icon:'event',  role:CAP_ROLES.capacity},
    {id:'o1', label:'Clients',    x:572, cy:45,  w:116, kind:'human',   icon:'users',  role:CAP_ROLES.clients},
    {id:'o2', label:'Sales',      x:572, cy:125, w:116, kind:'human',   icon:'chart',  role:CAP_ROLES.sales},
    {id:'o3', label:'Strategy',   x:572, cy:205, w:116, kind:'human',   icon:'layers', role:CAP_ROLES.strategy},
    {id:'o4', label:'Delivery',   x:572, cy:285, w:116, kind:'human',   icon:'task',   role:CAP_ROLES.delivery}
  ],
  hubs:[{id:'h1', x:204, y:165},{id:'h2', x:540, y:165}],
  links:[
    {from:'t1',to:'h1',w:1.1},{from:'t2',to:'h1',w:1.1},{from:'t3',to:'h1',w:1.1},{from:'t4',to:'h1',w:1.1},
    {from:'h1',to:'as',w:2.0},{from:'as',to:'cp',w:2.0},{from:'cp',to:'h2',w:1.9},
    {from:'h2',to:'o1',w:1.3},{from:'h2',to:'o2',w:1.3},{from:'h2',to:'o3',w:1.3},{from:'h2',to:'o4',w:1.3}
  ]
};
/* On a phone the four tasks and four outcomes sit in pairs. Each pair
   above feeds a hub whose stem drops through the gap in the pair below,
   so no connection ever runs underneath a node. */
SPECS.capacityMobile = {
  viewBox:[360,532], vertical:true, linkMs:480,
  nodes:[
    {id:'t1', label:'Follow-ups', x:6,   cy:30,  w:166, kind:'std',     icon:'mail',   role:CAP_ROLES.follow},
    {id:'t2', label:'Data entry', x:188, cy:30,  w:166, kind:'std',     icon:'sheet',  role:CAP_ROLES.entry},
    {id:'t3', label:'Scheduling', x:6,   cy:130, w:166, kind:'std',     icon:'cal',    role:CAP_ROLES.sched},
    {id:'t4', label:'Reporting',  x:188, cy:130, w:166, kind:'std',     icon:'doc',    role:CAP_ROLES.report},
    {id:'as', label:'Assistant',  x:110, cy:226, w:140, kind:'ai',      icon:'ai',     role:CAP_ROLES.assist},
    {id:'cp', label:'Capacity',   x:110, cy:290, w:140, kind:'trigger', icon:'event',  role:CAP_ROLES.capacity},
    {id:'o1', label:'Clients',    x:6,   cy:400, w:166, kind:'human',   icon:'users',  role:CAP_ROLES.clients},
    {id:'o2', label:'Sales',      x:188, cy:400, w:166, kind:'human',   icon:'chart',  role:CAP_ROLES.sales},
    {id:'o3', label:'Strategy',   x:6,   cy:506, w:166, kind:'human',   icon:'layers', role:CAP_ROLES.strategy},
    {id:'o4', label:'Delivery',   x:188, cy:506, w:166, kind:'human',   icon:'task',   role:CAP_ROLES.delivery}
  ],
  hubs:[{id:'hA', x:180, y:84},{id:'h1', x:180, y:186},{id:'h2', x:180, y:346},{id:'hC', x:180, y:456}],
  links:[
    {from:'t1',to:'hA',w:1.1},{from:'t2',to:'hA',w:1.1},{from:'hA',to:'h1',w:1.4},
    {from:'t3',to:'h1',w:1.1},{from:'t4',to:'h1',w:1.1},
    {from:'h1',to:'as',w:2.0},{from:'as',to:'cp',w:2.0},{from:'cp',to:'h2',w:1.9},
    {from:'h2',to:'o1',w:1.3},{from:'h2',to:'o2',w:1.3},{from:'h2',to:'hC',w:1.4},
    {from:'hC',to:'o3',w:1.3},{from:'hC',to:'o4',w:1.3}
  ]
};

/* What good assistance brings together, converging into BOTAN.IA.
   Vertical routing: three across the top, the mark below them. */
SPECS.cta = {
  viewBox:[640,240], vertical:true, linkMs:700,
  nodes:[
    {id:'ctx',  label:'Context',  x:101, cy:44,  w:110, kind:'std',     icon:'doc'},
    {id:'judg', label:'Judgment', x:261, cy:44,  w:118, kind:'human',   icon:'human'},
    {id:'sys',  label:'Systems',  x:429, cy:44,  w:110, kind:'ai',      icon:'layers'},
    {id:'bot',  label:'BOTAN.IA', x:230, cy:196, w:180, kind:'trigger', icon:'seed', mark:true}
  ],
  hubs:[{id:'h', x:320, y:118}],
  links:[
    {from:'ctx',to:'h',w:1.2},{from:'judg',to:'h',w:1.2},{from:'sys',to:'h',w:1.2},
    {from:'h',to:'bot',w:2.1}
  ]
};

/* Same three ideas, packed tighter so the labels still read at phone
   width. Scaling the desktop layout down put them at under 8px. */
SPECS.ctaMobile = {
  viewBox:[443,230], vertical:true, linkMs:700,
  nodes:[
    {id:'ctx',  label:'Context',  x:18,  cy:44,  w:122, kind:'std',     icon:'doc'},
    {id:'judg', label:'Judgment', x:160, cy:44,  w:124, kind:'human',   icon:'human'},
    {id:'sys',  label:'Systems',  x:303, cy:44,  w:122, kind:'ai',      icon:'layers'},
    {id:'bot',  label:'BOTAN.IA', x:131, cy:186, w:180, kind:'trigger', icon:'seed', mark:true}
  ],
  hubs:[{id:'h', x:221, y:112}],
  links:[
    {from:'ctx',to:'h',w:1.2},{from:'judg',to:'h',w:1.2},{from:'sys',to:'h',w:1.2},
    {from:'h',to:'bot',w:2.1}
  ]
};

/* ============================================================
   header state and logo light
   ============================================================ */
function initHeader(){
  var header = document.querySelector('header');
  if(!header) return;
  var on = false;
  function check(){
    var s = window.scrollY > 6;
    if(s !== on){ on = s; header.classList.toggle('is-scrolled', s); }
  }
  check();
  window.addEventListener('scroll', check, { passive: true });
}

/* The logo receives one pass of light on the first page of a visit.
   "First page" is read from the referrer rather than stored: the privacy
   page states that the site keeps nothing in the browser, and that stays
   true. Moving between pages of the site does not repeat it. */
function initLogoLight(){
  if(REDUCED) return;
  try{
    if(document.referrer && new URL(document.referrer).origin === window.location.origin) return;
  }catch(err){ /* unparseable referrer: treat as an arrival */ }
  document.documentElement.classList.add('logo-pass');
}

/* ============================================================
   hero parallax
   Layers of the structural figure move at slightly different
   rates while the hero is on screen. Desktop only: on a phone it
   would compete with the scroll itself.
   ============================================================ */
function initParallax(){
  if(REDUCED) return;
  var hero = document.querySelector('.hero');
  if(!hero) return;
  var layers = Array.prototype.slice.call(hero.querySelectorAll('.hero-visual [data-depth]'));
  /* The symbol watermark settles slower than the page as it scrolls, so
     it reads as further back: a slow parallax, felt more than seen. It
     never moves on its own. */
  var mark = hero.querySelector('.hero-watermark svg');
  if(!layers.length && !mark) return;
  var mq = window.matchMedia('(min-width: 1024px)');
  var ticking = false;
  function update(){
    ticking = false;
    var y = window.scrollY;
    var limit = hero.getBoundingClientRect().bottom + y;
    if(!mq.matches){
      layers.forEach(function(l){ l.style.transform = ''; });
      if(mark) mark.style.transform = '';
      return;
    }
    if(y > limit) return;
    layers.forEach(function(l){
      var d = parseFloat(l.getAttribute('data-depth')) || 0;
      l.style.transform = 'translate3d(0,' + (y * d).toFixed(2) + 'px,0)';
    });
    if(mark) mark.style.transform = 'translate3d(0,' + (y * 0.05).toFixed(2) + 'px,0)';
  }
  function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

/* ============================================================
   section nav
   Measures the sticky chrome so anchors land in the right place,
   then marks the section the reader is currently in.
   ============================================================ */
function initSectionNav(){
  var header = document.querySelector('header');
  var nav = document.getElementById('sectionNav');
  var root = document.documentElement;

  function measure(){
    var h = header ? header.getBoundingClientRect().height : 0;
    var s = nav ? nav.getBoundingClientRect().height : 0;
    root.style.setProperty('--header-h', h + 'px');
    root.style.setProperty('--chrome-h', (h + s) + 'px');
  }
  measure();
  var rt;
  window.addEventListener('resize', function(){
    clearTimeout(rt); rt = setTimeout(measure, 200);
  });

  /* Arriving on a link such as /#calculator, the browser jumps before the
     diagrams above it have taken their height. Once the page has loaded,
     land the section again, unless the reader has already moved. */
  var moved = false;
  ['wheel', 'touchstart', 'keydown'].forEach(function(t){
    window.addEventListener(t, function(){ moved = true; }, { once: true, passive: true });
  });
  window.addEventListener('load', function(){
    var id = location.hash.slice(1);
    var t = id && document.getElementById(id);
    if(!t || moved) return;
    var sb = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    t.scrollIntoView();
    root.style.scrollBehavior = sb;
  });
  if(!nav) return;

  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  var targets = links.map(function(a){
    return document.querySelector(a.getAttribute('href'));
  });

  function current(){
    /* A clicked anchor lands its section exactly on its scroll-margin-top,
       which differs by section role. Sub-pixel layout can put it a
       fraction below; the tolerance covers it. */
    var found = -1;
    for(var i = 0; i < targets.length; i++){
      var t = targets[i];
      if(!t) continue;
      var line = (parseFloat(getComputedStyle(t).scrollMarginTop) || 0) + 3;
      if(t.getBoundingClientRect().top <= line) found = i;
    }
    return found;
  }

  var active = -2;
  function mark(i){
    if(i === active) return;
    active = i;
    links.forEach(function(a, n){
      if(n === i) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    /* keep the active item in view on a narrow strip */
    if(i >= 0){
      var a = links[i], box = nav.querySelector('.sectionnav-scroll');
      var ar = a.getBoundingClientRect(), br = box.getBoundingClientRect();
      if(ar.left < br.left || ar.right > br.right){
        box.scrollTo({ left: a.offsetLeft - box.clientWidth / 2 + a.offsetWidth / 2,
                       behavior: REDUCED ? 'auto' : 'smooth' });
      }
    }
  }

  function paint(){ mark(current()); }

  /* Clicking a link marks it at once rather than waiting for the smooth
     scroll to arrive, and the spy is held off until the scroll settles. */
  var holdUntil = 0;
  links.forEach(function(a, i){
    a.addEventListener('click', function(){
      mark(i);
      holdUntil = REDUCED ? 0 : Date.now() + 800;
    });
  });
  function release(){ holdUntil = 0; }
  window.addEventListener('wheel', release, { passive: true });
  window.addEventListener('touchstart', release, { passive: true });
  window.addEventListener('keydown', function(e){
    if(e.key === 'PageDown' || e.key === 'PageUp' || e.key === 'Home' || e.key === 'End' ||
       e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ') release();
  });

  /* Throttled on a timestamp rather than a requestAnimationFrame flag:
     rAF is paused in a background tab, and a guard set just before a
     paused frame never cleared, which killed the spy. */
  var last = 0, tail = null;
  function onScroll(){
    var now = Date.now();
    if(now - last >= 80){
      last = now;
      if(now >= holdUntil) paint();
    } else {
      clearTimeout(tail);
      tail = setTimeout(function(){
        last = Date.now();
        if(last >= holdUntil) paint();
      }, 90);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  paint();
}

/* ============================================================
   reveals
   Content rises a little and fades in as it arrives. Siblings
   arrive in a short sequence rather than all at once.
   ============================================================ */
function initReveals(){
  var targets = document.querySelectorAll('.reveal');
  if(REDUCED || !('IntersectionObserver' in window)){
    Array.prototype.forEach.call(targets, function(t){ t.classList.add('in'); });
    return;
  }
  /* Anything already on screen at load is shown at once. Meaningful
     content must never wait on an observer callback to become readable. */
  var vh = window.innerHeight || document.documentElement.clientHeight;
  var deferred = [];
  Array.prototype.forEach.call(targets, function(t){
    if(t.getBoundingClientRect().top < vh * 0.92) t.classList.add('in');
    else deferred.push(t);
  });
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var sibs = Array.prototype.filter.call(e.target.parentNode.children, function(n){
        return n.classList && n.classList.contains('reveal');
      });
      var i = Math.max(0, sibs.indexOf(e.target));
      e.target.style.transitionDelay = Math.min(i * 60, 240) + 'ms';
      e.target.classList.add('in');
      io.unobserve(e.target);
      /* The delay is for arrival only. Left in place it would also slow
         the hover response on cards. */
      setTimeout(function(){ e.target.style.transitionDelay = ''; }, 1400);
    });
  }, { threshold:0.14, rootMargin:'0px 0px -6% 0px' });
  deferred.forEach(function(t){ io.observe(t); });
}

/* ============================================================
   page wiring
   ============================================================ */
function mount(svgId, spec){
  var svg = document.getElementById(svgId);
  if(!svg) return null;
  var sc = SystemCanvas(svg, spec);
  var plate = svg.closest('.canvas-plate');
  if(plate && !plate.dataset.roles){ plate.dataset.roles = '1'; initNodeRoles(plate); }
  syncPanHint(svg);
  syncLegend(plate, spec);
  return sc;
}

/* The legend describes the canvas in front of the reader. */
function syncLegend(plate, spec){
  if(!plate) return;
  var legend = plate.querySelector('.canvas-legend');
  if(!legend) return;
  var present = {};
  spec.nodes.forEach(function(n){
    present[n.kind === 'output' ? 'std' : n.kind] = true;
  });
  var map = { 'k-trigger':'trigger', 'k-flow':'std', 'k-ai':'ai', 'k-human':'human' };
  Array.prototype.forEach.call(legend.children, function(item){
    for(var cls in map){
      if(item.classList.contains(cls)){
        item.hidden = !present[map[cls]];
        return;
      }
    }
  });
}

/* The pan affordance appears only where the canvas genuinely overflows. */
function syncPanHint(svg){
  var scroller = svg.parentElement;
  var plate = svg.closest('.canvas-plate');
  if(!scroller || !plate) return;
  var hint = plate.querySelector('.pan-hint');
  if(!hint) return;
  function check(){
    hint.classList.toggle('is-on', scroller.scrollWidth > scroller.clientWidth + 2);
  }
  check();
  if(!svg.dataset.panBound){
    svg.dataset.panBound = '1';
    var rt;
    window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(check, 300); });
  }
}

/* Tools, as they are → connections mapped → one working system.
   Plays once when it arrives; tabs, if present, let the reader choose,
   and a replay control runs the sequence again. */
function initTransform(){
  var svg = document.getElementById('transformCanvas');
  if(!svg) return;
  var NARROW = window.matchMedia('(max-width: 720px)');
  function specFor(){ return NARROW.matches ? SPECS.transformMobile : SPECS.transform; }
  var sc = mount('transformCanvas', specFor());
  var buttons = Array.prototype.slice.call(document.querySelectorAll('#transformTabs button'));
  var caption = document.getElementById('transformCaption');
  var replay = document.getElementById('transformReplay');
  var CAPTIONS = [
    'Your tools, as they are today. A person moves information between them.',
    'We map how information moves, then build the connections that carry it.',
    'The same tools, working as one system. Information arrives where it is needed.'
  ];
  var state = -1, autoTimers = [];

  function eachLink(fn){
    Array.prototype.forEach.call(svg.querySelectorAll('.links path, .ports circle'), fn);
  }
  function hideLinks(){ eachLink(function(p){ p.style.opacity = 0; }); }
  function restoreLinks(){ eachLink(function(p){ p.style.opacity = ''; }); }
  function standNodes(){
    Array.prototype.forEach.call(svg.querySelectorAll('.sysnode'), function(g){
      g.style.transition = 'none'; g.style.opacity = 1; g.style.transform = 'none';
    });
  }
  function clearAuto(){ autoTimers.forEach(clearTimeout); autoTimers = []; }

  function set(i, manual){
    if(i === state && !manual) return;
    state = i;
    buttons.forEach(function(b, bi){ b.setAttribute('aria-selected', bi === i ? 'true' : 'false'); });
    if(caption) caption.textContent = tr(CAPTIONS[i]);
    sc.stop();

    if(i === 0){
      restoreLinks();
      if(REDUCED){ sc.settle(); svg.classList.add('state-manual'); hideLinks(); }
      else sc.seedNodesOnly();
    } else if(i === 1){
      svg.classList.remove('state-manual');
      restoreLinks();
      if(REDUCED){ sc.settle(); }
      else { standNodes(); sc.connect(); }
    } else {
      svg.classList.remove('state-manual');
      restoreLinks(); sc.settle();
      if(REDUCED) sc.staticSignal(); else sc.flow();
    }
    if(manual) clearAuto();
  }

  function play(){
    clearAuto();
    set(0, true);
    autoTimers.push(setTimeout(function(){ set(1); }, 1900));
    autoTimers.push(setTimeout(function(){ set(2); }, 1900 + 2600));
  }

  buttons.forEach(function(b, i){ b.addEventListener('click', function(){ set(i, true); }); });
  if(replay){
    if(REDUCED){
      replay.hidden = true;
    } else {
      var label = replay.querySelector('span');
      if(label) label.textContent = tr('Replay');
      replay.addEventListener('click', play);
    }
  }

  /* With reduced motion there is no sequence to watch, so the reader
     is shown the finished, connected system. */
  if(REDUCED){ set(2); }
  else {
    sc.seed();
    whenVisible(svg, function(){ if(state === -1) play(); });
  }

  var wasNarrow = NARROW.matches;
  function onResize(){
    if(NARROW.matches === wasNarrow) return;
    wasNarrow = NARROW.matches;
    clearAuto(); sc.stop();
    sc = mount('transformCanvas', specFor());
    var s = state === -1 ? 2 : state; state = -1;
    set(REDUCED ? 2 : s, true);
  }
  if(NARROW.addEventListener) NARROW.addEventListener('change', onResize);
}

/* A canvas that names its own spec and has no tab strip. A second spec in
   data-spec-mobile is the phone recomposition; crossing the breakpoint
   rebuilds the system rather than scaling it. */
function initNamedCanvases(){
  Array.prototype.forEach.call(document.querySelectorAll('svg[data-spec]'), function(svg){
    if(!svg.id) return;
    var mobileKey = svg.dataset.specMobile;
    var NARROW = window.matchMedia('(max-width: 720px)');
    function specFor(){ return SPECS[(mobileKey && NARROW.matches) ? mobileKey : svg.dataset.spec]; }
    if(!specFor()) return;
    var sc = mount(svg.id, specFor());
    if(!sc) return;
    var started = false;
    function run(){
      started = true;
      if(REDUCED){ sc.settle(); sc.staticSignal(); } else sc.grow();
    }
    if(REDUCED) run();
    else { sc.seed(); whenVisible(svg, run); }
    if(mobileKey && NARROW.addEventListener){
      NARROW.addEventListener('change', function(){
        sc.stop();
        sc = mount(svg.id, specFor());
        if(started) run(); else sc.seed();
      });
    }
  });
}

function initScenarios(){
  var svg = document.getElementById('scenarioCanvas');
  if(!svg) return;
  var buttons = Array.prototype.slice.call(document.querySelectorAll('#scenarioTabs button'));
  var caption = document.getElementById('scenarioCaption');
  var LIST = [
    { key:'scenarioLead',    cap:'An inquiry is captured and recorded in your CRM. The system qualifies it, an assistant drafts the reply and scheduling is handled automatically. You review anything unusual before follow-up continues.' },
    { key:'scenarioClient',  cap:'Onboarding runs on its own. Details are collected once, documents are requested, setup tasks are assigned and the system checks what comes back. A person approves before anything reaches the client.' },
    { key:'scenarioService', cap:'A referral moves through scheduling and delivery. An assistant prepares the report from what the system already recorded, you approve it, and the invoice goes out with it.' }
  ];
  var sc = null, current = -1;

  /* Below this width the vertical recomposition is used. The wide layout
     is 1200 units across, so under roughly 900px its labels stop being
     readable and the reader would have to drag to reach the end. */
  var NARROW = window.matchMedia('(max-width: 900px)');
  function specFor(i){
    var key = LIST[i].key;
    return (NARROW.matches && SPECS[key + 'Mobile']) || SPECS[key];
  }

  function render(i){
    buttons.forEach(function(b, bi){ b.setAttribute('aria-selected', bi === i ? 'true' : 'false'); });
    if(caption) caption.textContent = tr(LIST[i].cap);
    if(sc) sc.stop();
    sc = mount('scenarioCanvas', specFor(i));
    if(REDUCED){ sc.settle(); sc.staticSignal(); return; }
    sc.grow();
  }
  function select(i){
    if(i === current) return;
    current = i;
    render(i);
  }
  buttons.forEach(function(b, i){ b.addEventListener('click', function(){ select(i); }); });
  /* Arrow keys move between tabs, as a tab list should. */
  buttons.forEach(function(b, i){
    b.addEventListener('keydown', function(e){
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if(!d) return;
      e.preventDefault();
      var n = (i + d + buttons.length) % buttons.length;
      buttons[n].focus(); select(n);
    });
  });
  /* Only auto-select if the visitor has not already chosen. */
  whenVisible(svg, function(){ if(current === -1) select(0); });

  var wasNarrow = NARROW.matches, rt;
  function onResize(){
    if(NARROW.matches === wasNarrow) return;
    wasNarrow = NARROW.matches;
    if(current !== -1) render(current);
  }
  if(NARROW.addEventListener) NARROW.addEventListener('change', onResize);
  window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(onResize, 200); });
}

/* ============================================================
   time calculator
   The formula is v4's, unchanged: people × minutes × times per
   week, over 46 working weeks, scaled by the share a system could
   handle. What is new is the interface: sliders paired with
   editable values, one plain-language result, and numbers that
   ease to their new value rather than jumping.
   ============================================================ */
var WORK_WEEKS = 46;   /* a year of the task, allowing for leave */
var WORK_WEEK  = 40;   /* hours, for the "workweeks" translation */

function initCalc(){
  var root = document.getElementById('calc-widget');
  if(!root) return;
  var people  = document.getElementById('calcPeople');
  var minutes = document.getElementById('calcMinutes');
  var times   = document.getElementById('calcTimes');
  var share   = document.getElementById('calcShare');
  var flow    = document.getElementById('calcFlow');
  var inputs  = document.getElementById('calcForm');
  var out     = document.getElementById('calcOut');
  if(!people || !minutes || !times || !share || !flow || !inputs || !out) return;

  var fields = {
    savedWeek: document.getElementById('calcSavedWeek'),
    unit:      document.getElementById('calcUnit'),
    month:     document.getElementById('calcMonth'),
    monthUnit: document.getElementById('calcMonthUnit'),
    week:      document.getElementById('calcWeek'),
    saved:     document.getElementById('calcSaved'),
    savedWeeks:document.getElementById('calcSavedWeeks'),
    shareOut:  document.getElementById('calcShareOut'),
    live:      document.getElementById('calcLive')
  };

  /* Each number field has a slider partner. The slider covers the
     common range; the number field still accepts the full v4 range,
     so a larger team is never capped by the control. */
  var pairs = [
    { num:people,  range:document.getElementById('calcPeopleRange'),  min:1, max:999 },
    { num:minutes, range:document.getElementById('calcMinutesRange'), min:1, max:480 },
    { num:times,   range:document.getElementById('calcTimesRange'),   min:1, max:500 }
  ];

  function fill(range){
    if(!range) return;
    var mn = parseFloat(range.min) || 0, mx = parseFloat(range.max) || 100;
    var v = Math.min(mx, Math.max(mn, parseFloat(range.value) || mn));
    range.style.setProperty('--fill', ((v - mn) / (mx - mn) * 100) + '%');
  }

  /* Clamp rather than reject. A silently wrong total is worse than a nudge. */
  function val(el, min, max, fallback){
    var n = parseFloat(el.value);
    if(!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
  var LOCALE = PT_ON ? 'pt-BR' : 'en-US';
  function fmt(n, dec){
    return n.toLocaleString(LOCALE, { minimumFractionDigits:0, maximumFractionDigits:dec || 0 });
  }
  /* Small weekly figures keep one decimal, so 0.4 hours never reads as 0. */
  function weekDec(n){ return n < 10 ? 1 : 0; }
  function roundTo(n, dec){ var f = Math.pow(10, dec); return Math.round(n * f) / f; }
  function weeksLabel(hours){
    var w = hours / WORK_WEEK;
    if(w < 0.5) return tr('under half a workweek');
    var n = Math.round(w);
    if(n <= 1) return tr('about one workweek');
    return tr('about {n} workweeks').replace('{n}', n);
  }

  /* ---- eased numbers ---- */
  function tween(node, to, dec){
    if(!node) return;
    /* Start from what is on screen, not the last target, so a fast
       drag on a slider stays continuous instead of snapping. */
    var from = node._cur == null ? to : node._cur;
    if(node._raf) cancelAnimationFrame(node._raf);
    clearTimeout(node._land);
    function land(){
      if(node._raf) cancelAnimationFrame(node._raf);
      node._cur = to; node.textContent = fmt(roundTo(to, dec), dec);
    }
    if(REDUCED || from === to){ land(); return; }
    var t0 = null, D = MOTION.slow;
    function step(ts){
      if(t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / D);
      var e = 1 - Math.pow(1 - k, 5);   /* the --ease curve, near enough */
      node._cur = from + (to - from) * e;
      node.textContent = fmt(roundTo(node._cur, dec), dec);
      if(k < 1) node._raf = requestAnimationFrame(step);
    }
    node._raf = requestAnimationFrame(step);
    /* Frames pause in a background tab. The figure must still be right
       when the reader comes back, so it lands on a timer regardless. */
    node._land = setTimeout(land, D + 120);
  }

  var liveTimer = null;
  function compute(){
    var p = val(people, 1, 999, 1);
    var m = val(minutes, 1, 480, 1);
    var t = val(times, 1, 500, 1);
    var sh = val(share, 0, 100, 0) / 100;

    var hoursWeek  = (p * m * t) / 60;
    var savedWeek  = hoursWeek * sh;
    var savedYear  = savedWeek * WORK_WEEKS;
    var savedMonth = savedYear / 12;

    var dw = weekDec(savedWeek);
    var shown = roundTo(savedWeek, dw);
    tween(fields.savedWeek, savedWeek, dw);
    if(fields.unit) fields.unit.textContent = tr(shown === 1 ? 'hour' : 'hours');
    var dm = savedMonth < 10 ? 1 : 0;
    tween(fields.month, savedMonth, dm);
    if(fields.monthUnit) fields.monthUnit.textContent = tr(roundTo(savedMonth, dm) === 1 ? 'hour' : 'hours');
    tween(fields.week, hoursWeek, weekDec(hoursWeek));
    tween(fields.saved, savedYear, 0);
    if(fields.savedWeeks) fields.savedWeeks.textContent = weeksLabel(savedYear);
    fields.shareOut.textContent = Math.round(sh * 100) + '%';

    /* The eased digits are hidden from assistive tech; one settled
       sentence is announced once the visitor pauses. */
    if(fields.live){
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function(){
        fields.live.textContent = tr('You could create {n} {u} of additional capacity per week.')
          .replace('{n}', fmt(shown, dw)).replace('{u}', tr(shown === 1 ? 'hour' : 'hours'));
      }, 600);
    }
  }

  /* ---- connectors ---------------------------------------------------
     The controls converging into one outcome, drawn with the same
     curve the system canvases use. Measured from the live layout, so
     it follows the controls when they wrap or stack. */
  var pulses = [];
  function centerX(elm, box){
    var r = elm.getBoundingClientRect();
    return Math.round(r.left - box.left + r.width / 2);
  }
  function geometry(){
    var box = flow.getBoundingClientRect();
    if(!box.width) return null;
    var fieldEls = Array.prototype.slice.call(inputs.querySelectorAll('.calc-field'));
    var lead = out.querySelector('.calc-result.is-lead') || out.querySelector('.calc-result');
    if(!fieldEls.length || !lead) return null;
    var w = Math.round(box.width);
    var xs = fieldEls.map(function(e){ return centerX(e, box); });
    /* When the controls stack, every stem would start from one point and
       the drawing would collapse into a single line. Fan them instead. */
    var distinct = xs.filter(function(v, i){ return xs.indexOf(v) === i; }).length;
    if(distinct < xs.length && xs.length > 1){
      var pad = Math.round(w * 0.14);
      xs = xs.map(function(_, i){
        return Math.round(pad + (w - pad * 2) * (i / (xs.length - 1)));
      });
    }
    return {
      w: w, h: Math.round(box.height),
      xs: xs,
      outX: centerX(lead, box),
      junction: Math.round(box.height * 0.62)
    };
  }
  function draw(){
    var g = geometry();
    if(!g) return;
    flow.setAttribute('viewBox', '0 0 ' + g.w + ' ' + g.h);
    flow.innerHTML = '';

    var d = g.xs.map(function(x){
      return linkPath([x, 0], [g.outX, g.junction], true);
    }).join(' ');
    d += ' M' + g.outX + ' ' + g.junction + 'V' + g.h;
    flow.appendChild(el('path', { d:d.trim() }));
    flow.appendChild(el('circle', { cx:g.outX, cy:g.junction, r:3.2, fill:'#fff', stroke:BLUE, 'stroke-width':1.2 }));

    pulses = g.xs.map(function(x){
      var p = el('path', { 'class':'calc-pulse',
        d: linkPath([x, 0], [g.outX, g.junction], true) + 'V' + g.h });
      flow.appendChild(p);
      return p;
    });
  }

  function pulse(){
    if(REDUCED) return;
    pulses.forEach(function(p, i){
      var len = p.getTotalLength();
      if(!len) return;
      p.style.transition = 'none';
      p.style.strokeDasharray = (len * 0.16) + ' ' + len;
      p.style.strokeDashoffset = len * 0.16;
      p.style.opacity = '.9';
      void p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset ' + MOTION.travel + 'ms ' + EASE + ' ' + (i * 60) + 'ms, ' +
                           'opacity ' + MOTION.slow + 'ms ' + EASE + ' ' + (360 + i * 60) + 'ms';
      p.style.strokeDashoffset = -len;
      p.style.opacity = '0';
    });
  }

  var rafId = null, lastPulse = 0;
  function update(){
    compute();
    /* A slider fires many events per second; one pulse per gesture is
       enough to show the connection, more reads as noise. */
    var now = Date.now();
    if(now - lastPulse < 650) return;
    lastPulse = now;
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function(){ pulse(); });
  }

  pairs.forEach(function(pr){
    if(!pr.range) return;
    pr.range.addEventListener('input', function(){
      pr.num.value = pr.range.value; fill(pr.range); update();
    });
    pr.num.addEventListener('input', function(){
      var v = parseFloat(pr.num.value);
      if(isFinite(v)){ pr.range.value = Math.min(parseFloat(pr.range.max), Math.max(parseFloat(pr.range.min), v)); fill(pr.range); }
      update();
    });
    /* On leaving the field, show the value that was actually used. */
    pr.num.addEventListener('change', function(){
      pr.num.value = val(pr.num, pr.min, pr.max, pr.min);
      update();
    });
    fill(pr.range);
  });
  share.addEventListener('input', function(){ fill(share); update(); });
  fill(share);
  inputs.addEventListener('submit', function(e){ e.preventDefault(); });

  compute();
  draw();
  /* Fonts land after first paint and change the field widths, so measure
     again once they have settled rather than drawing against a guess. */
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

  var rt;
  window.addEventListener('resize', function(){
    clearTimeout(rt); rt = setTimeout(draw, 180);
  });
  whenVisible(root, function(){ draw(); if(!REDUCED) pulse(); });
}

/* Branches leaning toward the button they converge on. */
function initCta(){
  var svg = document.getElementById('ctaCanvas');
  if(!svg) return;
  var narrow = window.matchMedia('(max-width: 620px)').matches;
  var sc = mount('ctaCanvas', narrow ? SPECS.ctaMobile : SPECS.cta);
  if(REDUCED){ sc.settle(); sc.staticSignal(); }
  else { sc.seed(); whenVisible(svg, function(){ sc.grow(); }); }

  var wasNarrow = narrow, rt;
  window.addEventListener('resize', function(){
    clearTimeout(rt);
    rt = setTimeout(function(){
      var isNarrow = window.matchMedia('(max-width: 620px)').matches;
      if(isNarrow === wasNarrow) return;
      wasNarrow = isNarrow;
      sc.stop();
      sc = mount('ctaCanvas', isNarrow ? SPECS.ctaMobile : SPECS.cta);
      if(REDUCED){ sc.settle(); sc.staticSignal(); } else { sc.grow(); }
    }, 320);
  });

  if(REDUCED) return;
  var btn = document.querySelector('.final-cta .btn-solid');
  if(!btn) return;
  btn.addEventListener('pointerenter', function(){ svg.classList.add('lean'); });
  btn.addEventListener('pointerleave', function(){ svg.classList.remove('lean'); });
  btn.addEventListener('focus', function(){ svg.classList.add('lean'); });
  btn.addEventListener('blur', function(){ svg.classList.remove('lean'); });
}

/* ============================================================
   process lines
   How it works and Oversight share one behaviour. When the line is
   on screen the first point lights, a short segment of light travels
   the line to the next point, that point lights, and so on to the
   end; then the line rests in a quiet active state. Once per page
   view: leaving and coming back does not replay it. The light's path
   is measured from the points themselves, so the same code runs the
   line across (desktop) and down (phones).
   ============================================================ */
function initProcessLines(){
  var lines = Array.prototype.slice.call(document.querySelectorAll('.pline'));
  if(!lines.length) return;
  var PAUSE = 150;

  lines.forEach(function(line){
    var nodes = Array.prototype.slice.call(line.querySelectorAll('li'));
    if(nodes.length < 2) return;
    var fill = document.createElement('span');
    fill.className = 'pl-fill';
    fill.setAttribute('aria-hidden', 'true');
    line.appendChild(fill);
    var state = 'idle', reached = 0, timers = [];

    function centres(){
      var box = line.getBoundingClientRect();
      return nodes.map(function(li){
        var r = li.getBoundingClientRect(), d = getComputedStyle(li, '::before');
        return {
          x: r.left - box.left + parseFloat(d.left) + (parseFloat(d.marginLeft) || 0) + parseFloat(d.width) / 2,
          y: r.top - box.top + parseFloat(d.top) + (parseFloat(d.marginTop) || 0) + parseFloat(d.height) / 2
        };
      });
    }
    /* The lit trail runs from the first point to point i. */
    function place(i, animate){
      var c = centres(), a = c[0], z = c[c.length - 1];
      var down = Math.abs(z.y - a.y) > Math.abs(z.x - a.x);
      if(!animate) fill.style.transition = 'none';
      line.classList.toggle('is-y', down);
      if(down){
        fill.style.left = (a.x - 4.5) + 'px'; fill.style.top = a.y + 'px';
        fill.style.width = ''; fill.style.height = Math.max(0, c[i].y - a.y) + 'px';
      } else {
        fill.style.left = a.x + 'px'; fill.style.top = (a.y - 4.5) + 'px';
        fill.style.height = ''; fill.style.width = Math.max(0, c[i].x - a.x) + 'px';
      }
      if(!animate){ void fill.offsetWidth; fill.style.transition = ''; }
    }
    function at(ms, fn){ timers.push(setTimeout(fn, ms)); }
    function finish(){
      timers.forEach(clearTimeout); timers = [];
      nodes.forEach(function(n){ n.classList.add('is-lit'); });
      line.classList.remove('is-moving', 'from-human');
      line.classList.add('is-done');
      reached = nodes.length - 1; state = 'done';
      place(reached, false);
    }
    function run(){
      if(state !== 'idle') return;
      state = 'running';
      place(0, false);
      nodes[0].classList.add('is-lit');
      var t = MOTION.normal + PAUSE;
      nodes.slice(1).forEach(function(node, k){
        var i = k + 1;
        at(t, function(){
          line.classList.toggle('from-human', nodes[i - 1].classList.contains('pl-human'));
          line.classList.add('is-moving');
          place(i, true);
        });
        at(t + MOTION.travel, function(){
          line.classList.remove('is-moving');
          node.classList.add('is-lit');
          reached = i;
        });
        t += MOTION.travel + MOTION.normal + PAUSE;
      });
      at(t - PAUSE, finish);
    }

    var rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(function(){
        if(state === 'running') finish();
        else place(state === 'done' ? reached : 0, false);
      }, 150);
    });

    if(REDUCED || !('IntersectionObserver' in window)){ finish(); return; }
    place(0, false);
    var io = new IntersectionObserver(function(entries){
      if(!entries.some(function(e){ return e.isIntersecting; })) return;
      io.disconnect();
      /* begin once the block has started to arrive */
      at(240, run);
    }, { threshold: 0.5, rootMargin: '0px 0px -8% 0px' });
    io.observe(line);
  });
}

/* ============================================================
   boot
   The canvases are enhancement. A failure in any of them must
   never take the content layer down with it.
   ============================================================ */
function boot(){
  localiseSpecs();
  initReveals();
  [initSectionNav, initHeader, initLogoLight, initParallax, initProcessLines].forEach(function(fn){
    try{ fn(); }catch(err){ console.error('[BOTAN.IA] interface enhancement disabled:', err); }
  });
  [initTransform, initScenarios, initNamedCanvases, initCta, initCalc].forEach(function(fn){
    try{ fn(); }catch(err){ console.error('[BOTAN.IA] canvas disabled:', err); }
  });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();

/* ============================================================
   MOBILE NAVIGATION
   Carried over from v4. Labels follow the page language.
   ============================================================ */
(function(){
'use strict';
var toggle = document.getElementById('navToggle');
var panel  = document.getElementById('primaryNav');
if(!toggle || !panel) return;
var PT = /^pt/i.test(document.documentElement.getAttribute('lang') || '');
var OPEN = PT ? 'Abrir menu' : 'Open menu', CLOSE = PT ? 'Fechar menu' : 'Close menu';

function close(){
  panel.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', OPEN);
}
function open(){
  panel.classList.add('open');
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', CLOSE);
}
/* pointerdown, not click. Waiting for release puts the whole press
   interval between the tap and any feedback */
toggle.addEventListener('pointerdown', function(e){
  e.preventDefault();
  if(panel.classList.contains('open')) close(); else open();
});
toggle.addEventListener('click', function(e){ e.preventDefault(); });
toggle.addEventListener('keydown', function(e){
  if(e.key === 'Enter' || e.key === ' '){
    e.preventDefault();
    if(panel.classList.contains('open')) close(); else open();
  }
});
panel.addEventListener('click', function(e){ if(e.target.closest('a')) close(); });
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && panel.classList.contains('open')){ close(); toggle.focus(); }
});
var rt;
window.addEventListener('resize', function(){
  clearTimeout(rt);
  rt = setTimeout(function(){ if(window.innerWidth > 800) close(); }, 200);
});
})();
