/* ============================================================
   BOTANIA v4

   Two rendering layers, chosen deliberately:

   1. SVG, the labelled system. Real selectable text, focusable
      nodes, crisp at any pixel density, ~40 elements per canvas.
   2. Canvas, the ambient venation substrate behind the hero,
      where there are thousands of strokes and no text. Ported
      from the previous BOTANIA build (space colonisation after
      Runions et al.), because it is the visual bridge between
      the old identity and this one.

   No animation library. Growth is stroke-dashoffset transitions
   driven by a cancellable timeline.
   ============================================================ */
(function(){
'use strict';

var NS = 'http://www.w3.org/2000/svg';
var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var EASE = 'cubic-bezier(.16,1,.3,1)';
var NODE_H = 40;

/* Semantic palette. Each hue has exactly one job. */
var EDGE = { trigger:'#2F4F35', std:'#7D9469', ai:'#46585E', human:'#8F4826', output:'#7D9469' };
var GLYPH= { trigger:'#FAF8F1', std:'#2F4F35', ai:'#46585E', human:'#8F4826', output:'#2F4F35' };
var SAGE = '#7D9469', PULSE = '#2F6B5E';

function el(name, attrs){
  var n = document.createElementNS(NS, name);
  if(attrs) for(var k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

/* The BOTANIA corner at node scale. The page uses 2px/30px on cards
   and buttons; a node is the same silhouette at roughly 1/8 the size,
   alternating direction so a column never reads as stacked boxes. */
function nodePath(x, y, w, h, flip){
  var S = 3, B = 15;
  var tl = flip ? B : S, tr = flip ? S : B, br = flip ? B : S, bl = flip ? S : B;
  return 'M' + (x + tl) + ' ' + y +
    'H' + (x + w - tr) + 'A' + tr + ' ' + tr + ' 0 0 1 ' + (x + w) + ' ' + (y + tr) +
    'V' + (y + h - br) + 'A' + br + ' ' + br + ' 0 0 1 ' + (x + w - br) + ' ' + (y + h) +
    'H' + (x + bl) + 'A' + bl + ' ' + bl + ' 0 0 1 ' + x + ' ' + (y + h - bl) +
    'V' + (y + tl) + 'A' + tl + ' ' + tl + ' 0 0 1 ' + (x + tl) + ' ' + y + 'Z';
}

/* Cubic Bézier with handles along the flow axis. Branches always
   leave a shared stem first (see hubs below). That shared stem is
   what makes the network read as grown rather than drawn. */
function linkPath(a, b, vertical){
  var dx = b[0] - a[0], dy = b[1] - a[1];
  var axial = Math.abs(vertical ? dy : dx);
  var cross = Math.abs(vertical ? dx : dy);
  /* Handle length grows with the run and, more gently, with the offset,
     then is capped so it can never reach past the target, which is what
     produces the little hook where a branch meets a node. */
  var c = Math.max(30, axial * 0.55 + cross * 0.18);
  c = Math.min(c, axial * 0.9 + 40);
  if(vertical) return 'M' + a[0] + ' ' + a[1] + 'C' + a[0] + ' ' + (a[1] + c) + ',' + b[0] + ' ' + (b[1] - c) + ',' + b[0] + ' ' + b[1];
  return 'M' + a[0] + ' ' + a[1] + 'C' + (a[0] + c) + ' ' + a[1] + ',' + (b[0] - c) + ' ' + b[1] + ',' + b[0] + ' ' + b[1];
}

/* 14×14 line glyphs. The trigger glyph is the BOTANIA mark itself. */
var ICONS = {
  seed:  ['M7 12.4V3.4','M7 5.6C4.6 5.6 3 7.2 2 8.6C4.4 9 6 8 7 5.6Z','M7 5.6C9.4 5.6 11 7.2 12 8.6C9.6 9 8 8 7 5.6Z'],
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
  clock: ['M7 1.9a5.1 5.1 0 1 1 0 10.2a5.1 5.1 0 1 1 0-10.2Z','M7 4.3V7l2 1.4']
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
  /* Lets the stylesheet hold a measure for the vertical layouts without
     having to know which spec is mounted. */
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
    var p = el('path', { d: linkPath(a, b, vertical), fill:'none', stroke:SAGE,
                         'stroke-linecap':'round', 'stroke-width': l.w || 1.3 });
    p.dataset.w = l.w || 1.3;
    gLink.appendChild(p);
    linkEls[l.id] = p;
    var pt = el('circle', { cx:b[0], cy:b[1], r:2.6, fill:SAGE });
    pt.style.opacity = 0; gPort.appendChild(pt); ports[l.id] = pt;
  });

  /* ---- hubs: the branch point where a stem divides ---- */
  (spec.hubs || []).forEach(function(h){
    var c = el('circle', { cx:h.x, cy:h.y, r:3.4, fill:SAGE });
    c.style.opacity = 0; gPort.appendChild(c); hubEls[h.id] = c;
  });

  /* ---- nodes ---- */
  spec.nodes.forEach(function(n, i){
    var y = n.cy - NODE_H / 2, flip = (i % 2) === 1;
    var g = el('g', { 'class':'sysnode', tabindex:'0', role:'group',
                      'aria-label': tr(n.label) + (n.role ? '. ' + tr(n.role) : '') });
    g.dataset.role = n.role ? tr(n.role) : '';
    g.dataset.label = n.label;

    g.appendChild(el('path', { 'class':'n-halo', d: nodePath(n.x - 5, y - 5, n.w + 10, NODE_H + 10, flip),
                               fill:'none', stroke: EDGE[n.kind], 'stroke-width':1, opacity:'.28' }));
    if(n.kind !== 'trigger'){
      g.appendChild(el('path', { d: nodePath(n.x, y + 2, n.w, NODE_H, flip),
                                 fill:'rgba(31,25,19,.055)', stroke:'none' }));
    }
    g.appendChild(el('path', { 'class':'n-body', d: nodePath(n.x, y, n.w, NODE_H, flip),
                               fill: n.kind === 'trigger' ? '#2F4F35' : '#FAF8F1',
                               stroke: EDGE[n.kind], 'stroke-width':1 }));
    /* human checkpoints carry a second, warmer edge on the entry side */
    if(n.kind === 'human'){
      g.appendChild(el('path', { d:'M' + (n.x + 1) + ' ' + (y + 11) + 'V' + (y + NODE_H - 11),
                                 stroke:'#8F4826', 'stroke-width':2, 'stroke-linecap':'round' }));
    }
    var ic = el('g', { 'class':'n-icon', transform:'translate(' + (n.x + 12) + ',' + (n.cy - 7) + ')',
                       stroke: GLYPH[n.kind], 'stroke-width':1.2, fill:'none',
                       'stroke-linecap':'round', 'stroke-linejoin':'round' });
    (ICONS[n.icon] || ICONS.db).forEach(function(d){ ic.appendChild(el('path', { d:d })); });
    g.appendChild(ic);

    var t = el('text', { 'class':'n-label', x: n.x + 34, y: n.cy, 'dominant-baseline':'central',
                         'font-family':'Archivo, sans-serif', 'font-size':13,
                         'font-variation-settings':"'wdth' 100,'wght' 550",
                         fill: n.kind === 'trigger' ? '#FAF8F1' : '#1F1913' });
    t.textContent = tr(n.label);
    g.appendChild(t);

    g.appendChild(el('circle', { 'class':'n-status', cx:n.x + n.w - 12, cy:n.cy - 12, r:2.4,
                                 fill: n.kind === 'trigger' ? 'rgba(250,248,241,.55)' : 'rgba(125,148,105,.6)' }));
    gNode.appendChild(g);
    nodeEls[n.id] = g;
  });

  /* ---- growth order, derived rather than authored ----
     Sources are the nodes nothing points at. Deriving them from the graph
     rather than from the trigger styling matters: the closing canvas
     converges several branches INTO a BOTANIA node, so the trigger-styled
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

  /* State 1 of the homepage transformation: the functions exist,
     nothing connects them. */
  function seedNodesOnly(){
    seed();
    svg.classList.add('state-manual');
    spec.nodes.forEach(function(n, i){
      at(80 + i * 70, function(){
        var g = nodeEls[n.id];
        g.style.transition = 'opacity 340ms ' + EASE + ', transform 340ms ' + EASE;
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
      p.style.strokeWidth = l.w || 1.3;
      ports[l.id].style.transition = 'none';
      ports[l.id].style.opacity = 1;
    });
    Object.keys(hubEls).forEach(function(k){ hubEls[k].style.opacity = 1; });
    spec.nodes.forEach(function(n){
      var g = nodeEls[n.id];
      g.style.transition = 'none'; g.style.opacity = 1; g.style.transform = 'none';
    });
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
                           'stroke-width': Math.max(1.1, src.dataset.w * 0.85) });
      p.setAttribute('stroke-dasharray', Math.min(44, len) + ' ' + (len + 80));
      p.setAttribute('stroke-dashoffset', -len * 0.35);
      p.style.opacity = 0.75 - i * 0.16;
      gPulse.appendChild(p);
    });
  }

  function growLink(id, dur){
    var p = linkEls[id];
    p.style.transition = 'stroke-dashoffset ' + dur + 'ms ' + EASE +
                         ', stroke-width 220ms ease ' + Math.max(0, dur - 140) + 'ms';
    p.style.strokeDashoffset = 0;
    p.style.strokeWidth = p.dataset.w;
    at(Math.max(0, dur - 200), function(){
      ports[id].style.transition = 'opacity 260ms ease';
      ports[id].style.opacity = 1;
    });
  }
  function activate(id){
    var g = nodeEls[id];
    g.style.transition = 'opacity 300ms ' + EASE + ', transform 300ms ' + EASE;
    g.style.opacity = 1; g.style.transform = 'none';
  }

  function firePulse(id){
    var src = linkEls[id];
    if(!src) return 0;
    var len = src.getTotalLength();
    var p = el('path', { d: src.getAttribute('d'), fill:'none', stroke:PULSE,
                         'stroke-linecap':'round',
                         'stroke-width': Math.max(1.1, src.dataset.w * 0.85) });
    p.style.strokeDasharray = '30 ' + (len + 60);
    p.style.strokeDashoffset = 30;
    p.style.opacity = 0.82;
    gPulse.appendChild(p);
    var dur = Math.max(320, len / 190 * 1000);
    requestAnimationFrame(function(){
      p.style.transition = 'stroke-dashoffset ' + dur + 'ms linear';
      p.style.strokeDashoffset = -len;
    });
    at(dur + 160, function(){ if(p.parentNode) p.parentNode.removeChild(p); });
    return dur;
  }

  var chainIdx = 0;
  function runChains(){
    if(!CHAINS.length || REDUCED) return;
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
    chainTimer = setTimeout(runChains, acc + 1500);
    timers.push(chainTimer);
  }

  var NODE_MS = 300, LINK_MS = spec.linkMs || 640, GAP = 80;
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
          hubEls[s.id].style.transition = 'opacity 240ms ease';
          hubEls[s.id].style.opacity = 1;
        });
        t += 180;
      } else {
        at(t, (function(id){ return function(){ activate(id); }; })(s.id));
        t += NODE_MS + GAP;
      }
    });
    if(opts.pulse !== false) at(t + 600, runChains);
    return t;
  }

  /* Grow the connections onto nodes that are already standing.
     state 2 of the homepage transformation. */
  function connect(){
    clearTimers();
    svg.classList.remove('state-manual');
    var t = 60;
    SEQ.forEach(function(s){
      if(s.t === 'link'){ at(t, function(){ growLink(s.id, LINK_MS); }); t += LINK_MS * 0.55; }
      else if(s.t === 'hub'){
        at(t, function(){ hubEls[s.id].style.transition = 'opacity 240ms ease'; hubEls[s.id].style.opacity = 1; });
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
   start a canvas when it enters the viewport, pause when hidden
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
   "webhook", "trigger", "payload", "endpoint".
   ============================================================ */

var ROLES = {
  lead:   'A form submission, an email or a referral. Whatever starts the process.',
  qual:   'AI reads the enquiry, checks it against your criteria and routes it. Anything unclear goes to a person.',
  crm:    'The record is created and kept current without anyone typing it in twice.',
  sched:  'Offers real availability and books the time automatically.',
  follow: 'Writes a reply in your voice, using what the system already knows about this lead.',
  pipe:   'Stage, value and next action stay accurate because the system updates them.',
  review: 'You approve anything unusual, or above a value you set. The system waits, then carries on.'
};

/* ---- Portuguese ----------------------------------------------------------
   Both languages share this file. The diagram labels, hover text and captions
   live here rather than in the markup, so they are swapped at render time
   based on <html lang>. Anything missing from the table falls through to
   English, which keeps a half-finished translation readable. */
var PT_ON = /^pt/i.test(document.documentElement.getAttribute('lang') || '');
var PT = {
  /* node labels */
  'New Lead':'Novo Lead',
  'Capture':'Captura',
  'Response Agent':'Agente de Resposta',
  'Reporting Agent':'Agente de Relatório',
  'CRM Update':'Atualiza CRM',
  'AI Qualification':'Qualificação IA',
  'Scheduling':'Agendamento',
  'Owner Review':'Sua Aprovação',
  'New Client':'Novo Cliente',
  'Intake':'Cadastro',
  'Documents':'Documentos',
  'Internal Tasks':'Tarefas Internas',
  'AI Processing':'Leitura por IA',
  'Approval':'Aprovação',
  'Client Update':'Aviso ao Cliente',
  'Referral':'Indicação',
  'Service':'Serviço',
  'Invoice':'Nota Fiscal',
  'Client Delivery':'Entrega Final',
  'Growth':'Crescimento',
  'Structure':'Estrutura',
  'Intelligence':'Inteligência',
  'Inbox':'Caixa de Entrada',
  'Spreadsheets':'Planilhas',
  'Calendar':'Agenda',
  'Invoicing':'Faturamento',

  /* shared hover text */
  'The details are recorded once, in a consistent shape, with nobody retyping them.':
    'Os dados são registrados uma vez, no mesmo formato, sem ninguém digitar de novo.',
  'An agent that writes the reply, using what the system already knows about this lead. You send it, or edit it first.':
    'Um agente que escreve a resposta com o que o sistema já sabe sobre esse lead. Você envia ou edita antes.',
  'AI reads the enquiry, checks it against your criteria and routes it. Anything unclear goes to a person.':
    'A IA lê o contato, confere com os seus critérios e encaminha. O que ficar em dúvida vai para uma pessoa.',
  'You approve anything unusual, or above a value you set. The system waits, then carries on.':
    'Você aprova o que for fora do padrão, ou acima de um valor que definir. O sistema espera e depois segue.',
  'A form submission, an email or a referral. Whatever starts the process.':
    'Um formulário, um e-mail ou uma indicação. O que quer que comece o processo.',
  'Reads the inquiry, checks it against your criteria, and routes it. Anything unclear goes to a person.':
    'Lê o contato, confere com os seus critérios e encaminha. O que ficar em dúvida vai para uma pessoa.',
  'The record is created and kept current without anyone typing it in twice.':
    'O registro é criado e mantido em dia sem ninguém digitar duas vezes.',
  'Offers real availability and books the time automatically.':
    'Oferece os horários que existem de verdade e agenda automaticamente.',
  'Writes a reply in your voice, using what the system already knows about this lead.':
    'Escreve uma resposta no seu tom, usando o que o sistema já sabe sobre esse lead.',
  'You approve anything above an amount you set. The system waits, then carries on.':
    'Você aprova tudo acima de um valor que definir. O sistema espera e depois segue.',

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
  'Reads what came in, pulls out what matters, and flags anything that looks wrong.':
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
  'An agent that pulls together the report from what the system already recorded.':
    'Um agente que monta o relatório a partir do que o sistema já registrou.',
  'Raised from the work the system already recorded.':
    'Emitida a partir do trabalho que o sistema já registrou.',
  'You review the finding before it goes to the client.':
    'Você revisa o resultado antes de ir para o cliente.',
  'Report and invoice reach the client together, on time.':
    'Relatório e nota chegam juntos ao cliente, no prazo.',
  'Where most of the real information still lives.':
    'Onde a maior parte da informação de verdade ainda mora.',
  'Accurate only as long as someone keeps updating it.':
    'Só está correto enquanto alguém continua atualizando.',
  'Booked by hand, one email thread at a time.':
    'Agendado na mão, um e-mail por vez.',
  'Attached, downloaded, re-uploaded and misfiled.':
    'Anexado, baixado, reenviado e salvo no lugar errado.',
  'Raised from memory at the end of the month.':
    'Emitida de memória no fim do mês.',
  'Where the real numbers often end up.':
    'Onde os números de verdade costumam parar.',

  /* calculator */
  'under half a workweek':'menos de meia semana de trabalho',
  'about one workweek':'cerca de uma semana de trabalho',
  'about {n} workweeks':'cerca de {n} semanas de trabalho',

  /* scenario captions */
  'An enquiry is captured and recorded in your CRM. AI works out what it needs, a response agent writes the reply, and scheduling is handled automatically. You review anything unusual before follow-up continues.':
    'O contato é registrado e vai para o CRM. A IA identifica o que ele precisa, um agente de resposta escreve o retorno e o agendamento acontece automaticamente. Você revisa o que for fora do padrão antes do follow-up seguir.',
  'Onboarding runs on its own. Details are collected once, documents are requested, setup tasks are assigned, and AI checks what comes back. A person approves before anything reaches the client.':
    'O onboarding roda sozinho. Os dados são coletados uma vez, os documentos são solicitados, as tarefas de setup são distribuídas e a IA confere o que chega. Uma pessoa aprova antes de qualquer coisa ir para o cliente.',
  'A referral moves through scheduling and delivery. A reporting agent builds the report from what the system already recorded, you approve the result, and the invoice goes out with it.':
    'Uma indicação passa pelo agendamento e segue até a entrega. Um agente de relatório monta o documento com o que o sistema já registrou, você aprova o resultado e a nota sai junto.'
};
function tr(str){ return (PT_ON && PT[str]) || str; }

/* Portuguese labels run longer than their English counterparts, so a few
   node boxes need widening to keep the same breathing room around the text
   (the English set never drops below 17px of slack, which is the floor these
   figures are chosen against). Each widening here fits inside an existing
   gap, so no downstream node has to move. The closing canvas is the one
   exception: Crescimento is wide enough that the whole row is re-centred. */
var PT_LAYOUT = {
  scenarioLead:    { nodes:{ lead:{w:118}, cap:{w:118}, crm:{w:144}, sched:{w:136},
                             resp:{x:668, w:182}, review:{w:144} } },
  scenarioClient:  { nodes:{ client:{w:130}, intake:{w:106}, tasks:{w:148}, upd:{w:150} } },
  scenarioService: { nodes:{ intake:{w:104}, sched:{w:134}, inv:{w:118}, rep:{w:184} } },
  cta:       { viewBox:[640,240], nodes:{ growth:{x:69,w:132}, structure:{x:257}, intel:{x:431} } },
  ctaMobile: { viewBox:[470,230], nodes:{ growth:{x:14,w:132}, structure:{x:172}, intel:{x:316},
                                          bot:{x:150} }, hubs:{ h:{x:235} } }
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

SPECS.heroDesktop = {
  viewBox:[1000,400],
  nodes:[
    {id:'lead',  label:'New Lead',        x:40,  cy:210, w:110, kind:'trigger', icon:'seed',  role:ROLES.lead},
    {id:'qual',  label:'AI Qualification',x:222, cy:210, w:168, kind:'ai',      icon:'ai',    role:ROLES.qual},
    {id:'crm',   label:'CRM',             x:460, cy:210, w:88,  kind:'std',     icon:'db',    role:ROLES.crm},
    {id:'sched', label:'Scheduling',      x:664, cy:90,  w:124, kind:'std',     icon:'cal',   role:ROLES.sched},
    {id:'follow',label:'Follow-up',       x:664, cy:210, w:118, kind:'ai',      icon:'mail',  role:ROLES.follow},
    {id:'pipe',  label:'Sales Pipeline',  x:664, cy:330, w:142, kind:'std',     icon:'chart', role:ROLES.pipe},
    {id:'review',label:'Owner Review',    x:846, cy:330, w:134, kind:'human',   icon:'human', role:ROLES.review}
  ],
  hubs:[{id:'h1', x:600, y:210}],
  links:[
    {from:'lead',to:'qual',w:2.2},{from:'qual',to:'crm',w:2.1},{from:'crm',to:'h1',w:2.0},
    {from:'h1',to:'follow',w:1.2},{from:'h1',to:'sched',w:1.15},{from:'h1',to:'pipe',w:1.5},
    {from:'pipe',to:'review',w:1.05}
  ]
};

/* Not the desktop layout scaled down. A vertical trunk, five nodes, and
   the branch resolved as a symmetric fan so no connection ever has to
   route underneath a node. */
SPECS.heroMobile = {
  viewBox:[360,520], vertical:true, linkMs:520,
  nodes:[
    {id:'lead',  label:'New Lead',        x:30,  cy:44,  w:150, kind:'trigger', icon:'seed',  role:ROLES.lead},
    {id:'qual',  label:'AI Qualification',x:30,  cy:164, w:180, kind:'ai',      icon:'ai',    role:ROLES.qual},
    {id:'crm',   label:'CRM',             x:30,  cy:284, w:120, kind:'std',     icon:'db',    role:ROLES.crm},
    {id:'follow',label:'Follow-up',       x:14,  cy:470, w:150, kind:'ai',      icon:'mail',  role:ROLES.follow},
    {id:'sched', label:'Scheduling',      x:196, cy:470, w:150, kind:'std',     icon:'cal',   role:ROLES.sched}
  ],
  hubs:[{id:'h1', x:90, y:362}],
  links:[
    {from:'lead',to:'qual',w:2.2},{from:'qual',to:'crm',w:2.1},{from:'crm',to:'h1',w:2.0},
    {from:'h1',to:'follow',w:1.4},{from:'h1',to:'sched',w:1.2}
  ]
};

SPECS.scenarioLead = {
  viewBox:[1200,420],
  nodes:[
    {id:'lead',  label:'New Lead',        x:16,  cy:210, w:112, kind:'trigger', icon:'seed',  role:ROLES.lead},
    {id:'cap',   label:'Capture',         x:152, cy:210, w:112, kind:'std',     icon:'task',  role:'The details are recorded once, in a consistent shape, with nobody retyping them.'},
    {id:'crm',   label:'CRM Update',      x:296, cy:210, w:136, kind:'std',     icon:'db',    role:ROLES.crm},
    {id:'qual',  label:'AI Qualification',x:464, cy:210, w:160, kind:'ai',      icon:'ai',    role:ROLES.qual},
    {id:'sched', label:'Scheduling',      x:692, cy:100, w:124, kind:'std',     icon:'cal',   role:ROLES.sched},
    {id:'resp',  label:'Response Agent',  x:684, cy:320, w:150, kind:'ai',      icon:'mail',  role:'An agent that writes the reply, using what the system already knows about this lead. You send it, or edit it first.'},
    {id:'review',label:'Owner Review',    x:908, cy:210, w:136, kind:'human',   icon:'human', role:ROLES.review},
    {id:'follow',label:'Follow-up',       x:1076,cy:210, w:116, kind:'std',     icon:'clock', role:'Chases the ones that go quiet, on a schedule you set once.'}
  ],
  hubs:[{id:'h1', x:658, y:210},{id:'h2', x:876, y:210}],
  links:[
    {from:'lead',to:'cap',w:2.2},{from:'cap',to:'crm',w:2.15},{from:'crm',to:'qual',w:2.1},
    {from:'qual',to:'h1',w:2.0},{from:'h1',to:'sched',w:1.35},{from:'h1',to:'resp',w:1.4},
    {from:'sched',to:'h2',w:1.3},{from:'resp',to:'h2',w:1.35},
    {from:'h2',to:'review',w:1.9},{from:'review',to:'follow',w:1.7}
  ]
};

SPECS.scenarioClient = {
  viewBox:[1200,420],
  nodes:[
    {id:'client',label:'New Client',    x:30,  cy:210, w:124, kind:'trigger', icon:'seed',  role:'A signed proposal or a closed deal. Onboarding starts itself.'},
    {id:'intake',label:'Intake',        x:200, cy:210, w:96,  kind:'std',     icon:'task',  role:'One form, asked once, feeding everything after it.'},
    {id:'docs',  label:'Documents',     x:376, cy:92,  w:126, kind:'std',     icon:'doc',   role:'Asks for what is missing and chases it until it arrives.'},
    {id:'tasks', label:'Internal Tasks',x:376, cy:328, w:142, kind:'std',     icon:'task',  role:'Assigns the setup work to the right people with the right dates.'},
    {id:'proc',  label:'AI Processing', x:606, cy:210, w:152, kind:'ai',      icon:'ai',    role:'Reads what came in, pulls out what matters, and flags anything that looks wrong.'},
    {id:'appr',  label:'Approval',      x:804, cy:210, w:124, kind:'human',   icon:'human', role:'A person confirms before anything reaches the client.'},
    {id:'upd',   label:'Client Update', x:974, cy:210, w:142, kind:'std',     icon:'mail',  role:'The client hears where things stand without having to ask.'}
  ],
  hubs:[{id:'h1', x:334, y:210},{id:'h2', x:566, y:210}],
  links:[
    {from:'client',to:'intake',w:2.1},{from:'intake',to:'h1',w:2.0},
    {from:'h1',to:'docs',w:1.4},{from:'h1',to:'tasks',w:1.4},
    {from:'docs',to:'h2',w:1.4},{from:'tasks',to:'h2',w:1.4},
    {from:'h2',to:'proc',w:2.0},{from:'proc',to:'appr',w:1.9},{from:'appr',to:'upd',w:1.8}
  ]
};

SPECS.scenarioService = {
  viewBox:[1200,420],
  nodes:[
    {id:'ref',   label:'Referral',        x:20,   cy:210, w:112, kind:'trigger', icon:'seed',  role:'However the work arrives: a partner, a portal or a phone call.'},
    {id:'intake',label:'Intake',          x:172,  cy:210, w:94,  kind:'std',     icon:'task',  role:'Captured once, organized, and sent to the right place.'},
    {id:'sched', label:'Scheduling',      x:306,  cy:210, w:124, kind:'std',     icon:'cal',   role:'Booked against real availability and confirmed automatically.'},
    {id:'svc',   label:'Service',         x:470,  cy:210, w:108, kind:'std',     icon:'users', role:'The work your team is there to do.'},
    {id:'rep',   label:'Reporting Agent', x:658,  cy:96,  w:162, kind:'ai',      icon:'chart', role:'An agent that pulls together the report from what the system already recorded.'},
    {id:'inv',   label:'Invoice',         x:658,  cy:324, w:110, kind:'std',     icon:'card',  role:'Raised from the work the system already recorded.'},
    {id:'appr',  label:'Approval',        x:856,  cy:96,  w:124, kind:'human',   icon:'human', role:'You review the finding before it goes to the client.'},
    {id:'deliv', label:'Client Delivery', x:1052, cy:210, w:142, kind:'std',     icon:'mail',  role:'Report and invoice reach the client together, on time.'}
  ],
  hubs:[{id:'h1', x:618, y:210},{id:'h2', x:1020, y:210}],
  links:[
    {from:'ref',to:'intake',w:2.1},{from:'intake',to:'sched',w:2.05},{from:'sched',to:'svc',w:2.0},
    {from:'svc',to:'h1',w:1.95},{from:'h1',to:'rep',w:1.4},{from:'h1',to:'inv',w:1.3},
    {from:'rep',to:'appr',w:1.35},{from:'appr',to:'h2',w:1.3},{from:'inv',to:'h2',w:1.25},
    {from:'h2',to:'deliv',w:1.9}
  ]
};

/* The applications a business already runs. State 1 shows them
   standing alone; state 2 grows the connections between them. */
SPECS.transform = {
  viewBox:[950,340],
  nodes:[
    {id:'inbox', label:'Inbox',        x:40,  cy:160, w:110, kind:'std', icon:'mail', role:'Where most of the real information still lives.'},
    {id:'sheet', label:'Spreadsheets', x:268, cy:56,  w:142, kind:'std', icon:'db',   role:'Where the real numbers often end up.'},
    {id:'docs',  label:'Documents',    x:268, cy:264, w:136, kind:'std', icon:'doc',  role:'Attached, downloaded, re-uploaded and misfiled.'},
    {id:'crm',   label:'CRM',          x:560, cy:160, w:88,  kind:'std', icon:'db',   role:'Accurate only as long as someone keeps updating it.'},
    {id:'cal',   label:'Calendar',     x:770, cy:56,  w:118, kind:'std', icon:'cal',  role:'Booked by hand, one email thread at a time.'},
    {id:'inv',   label:'Invoicing',    x:770, cy:264, w:118, kind:'std', icon:'card', role:'Raised from memory at the end of the month.'}
  ],
  links:[
    {from:'inbox',to:'sheet',w:1.6},{from:'inbox',to:'docs',w:1.6},
    {from:'sheet',to:'crm',w:1.5},{from:'docs',to:'crm',w:1.5},
    {from:'crm',to:'cal',w:1.4},{from:'crm',to:'inv',w:1.4}
  ]
};


/* ---- the same three systems, recomposed for a phone ----------------
   Not the desktop layout scaled down: at 1200 units across, its labels
   land under 9px on a phone and the reader has to drag to see the end
   of their own process. These run vertically, keep every node inside
   the viewport, and hold the branch points as real branches rather
   than flattening the system into a list. Meaning is identical. */
SPECS.scenarioLeadMobile = {
  viewBox:[360,600], vertical:true, linkMs:520,
  nodes:[
    {id:'lead',  label:'New Lead',        x:84,  cy:34,  w:150, kind:'trigger', icon:'seed',  role:ROLES.lead},
    {id:'cap',   label:'Capture',         x:94,  cy:110, w:130, kind:'std',     icon:'task',  role:'The details are recorded once, in a consistent shape, with nobody retyping them.'},
    {id:'crm',   label:'CRM Update',      x:84,  cy:186, w:152, kind:'std',     icon:'db',    role:ROLES.crm},
    {id:'qual',  label:'AI Qualification',x:74,  cy:262, w:180, kind:'ai',      icon:'ai',    role:ROLES.qual},
    {id:'sched', label:'Scheduling',      x:14,  cy:368, w:150, kind:'std',     icon:'cal',   role:ROLES.sched},
    {id:'resp',  label:'Response Agent',  x:190, cy:368, w:156, kind:'ai',      icon:'mail',  role:'An agent that writes the reply, using what the system already knows about this lead. You send it, or edit it first.'},
    {id:'review',label:'Owner Review',    x:90,  cy:490, w:155, kind:'human',   icon:'human', role:ROLES.review},
    {id:'follow',label:'Follow-up',       x:100, cy:566, w:135, kind:'std',     icon:'clock', role:'Chases the ones that go quiet, on a schedule you set once.'}
  ],
  hubs:[{id:'h1', x:180, y:318},{id:'h2', x:180, y:440}],
  links:[
    {from:'lead',to:'cap',w:2.1},{from:'cap',to:'crm',w:2.05},{from:'crm',to:'qual',w:2.0},
    {from:'qual',to:'h1',w:1.95},{from:'h1',to:'sched',w:1.4},{from:'h1',to:'resp',w:1.4},
    {from:'sched',to:'h2',w:1.4},{from:'resp',to:'h2',w:1.4},
    {from:'h2',to:'review',w:1.8},{from:'review',to:'follow',w:1.2}
  ]
};

SPECS.scenarioClientMobile = {
  viewBox:[360,534], vertical:true, linkMs:520,
  nodes:[
    {id:'client',label:'New Client',    x:84,  cy:34,  w:150, kind:'trigger', icon:'seed',  role:'A signed proposal or a closed deal. Onboarding starts itself.'},
    {id:'intake',label:'Intake',        x:94,  cy:114, w:130, kind:'std',     icon:'task',  role:'One form, asked once, feeding everything after it.'},
    {id:'docs',  label:'Documents',     x:14,  cy:216, w:150, kind:'std',     icon:'doc',   role:'Asks for what is missing and chases it until it arrives.'},
    {id:'tasks', label:'Internal Tasks',x:196, cy:216, w:150, kind:'std',     icon:'task',  role:'Assigns the setup work to the right people with the right dates.'},
    {id:'proc',  label:'AI Processing', x:80,  cy:340, w:170, kind:'ai',      icon:'ai',    role:'Reads what came in, pulls out what matters, and flags anything that looks wrong.'},
    {id:'appr',  label:'Approval',      x:100, cy:412, w:130, kind:'human',   icon:'human', role:'A person confirms before anything reaches the client.'},
    {id:'upd',   label:'Client Update', x:90,  cy:490, w:158, kind:'std',     icon:'mail',  role:'The client hears where things stand without having to ask.'}
  ],
  hubs:[{id:'h1', x:180, y:166},{id:'h2', x:180, y:288}],
  links:[
    {from:'client',to:'intake',w:2.1},{from:'intake',to:'h1',w:2.0},
    {from:'h1',to:'docs',w:1.4},{from:'h1',to:'tasks',w:1.4},
    {from:'docs',to:'h2',w:1.4},{from:'tasks',to:'h2',w:1.4},
    {from:'h2',to:'proc',w:2.0},{from:'proc',to:'appr',w:1.9},{from:'appr',to:'upd',w:1.8}
  ]
};

SPECS.scenarioServiceMobile = {
  viewBox:[360,606], vertical:true, linkMs:520,
  nodes:[
    {id:'ref',   label:'Referral',        x:84,  cy:34,  w:150, kind:'trigger', icon:'seed',  role:'However the work arrives: a partner, a portal or a phone call.'},
    {id:'intake',label:'Intake',          x:94,  cy:106, w:130, kind:'std',     icon:'task',  role:'Captured once, organized, and sent to the right place.'},
    {id:'sched', label:'Scheduling',      x:90,  cy:178, w:140, kind:'std',     icon:'cal',   role:'Booked against real availability and confirmed automatically.'},
    {id:'svc',   label:'Service',         x:100, cy:250, w:126, kind:'std',     icon:'users', role:'The work your team is there to do.'},
    {id:'rep',   label:'Reporting Agent', x:10,  cy:352, w:166, kind:'ai',      icon:'chart', role:'An agent that pulls together the report from what the system already recorded.'},
    {id:'inv',   label:'Invoice',         x:216, cy:352, w:126, kind:'std',     icon:'card',  role:'Raised from the work the system already recorded.'},
    {id:'appr',  label:'Approval',        x:10,  cy:436, w:140, kind:'human',   icon:'human', role:'You review the finding before it goes to the client.'},
    {id:'deliv', label:'Client Delivery', x:90,  cy:562, w:158, kind:'std',     icon:'mail',  role:'Report and invoice reach the client together, on time.'}
  ],
  hubs:[{id:'h1', x:180, y:302},{id:'h2', x:180, y:504}],
  links:[
    {from:'ref',to:'intake',w:2.1},{from:'intake',to:'sched',w:2.05},{from:'sched',to:'svc',w:2.0},
    {from:'svc',to:'h1',w:1.95},{from:'h1',to:'rep',w:1.4},{from:'h1',to:'inv',w:1.3},
    {from:'rep',to:'appr',w:1.35},{from:'appr',to:'h2',w:1.3},{from:'inv',to:'h2',w:1.25},
    {from:'h2',to:'deliv',w:1.9}
  ]
};

/* The three ideas the company is built on, converging into BOTANIA.
   Vertical routing: three across the top, the mark below them. */
SPECS.cta = {
  viewBox:[640,240], vertical:true, linkMs:700,
  nodes:[
    {id:'growth',    label:'Growth',       x:87,  cy:44,  w:96,  kind:'std',     icon:'chart'},
    {id:'structure', label:'Structure',    x:239, cy:44,  w:118, kind:'std',     icon:'db'},
    {id:'intel',     label:'Intelligence', x:413, cy:44,  w:140, kind:'ai',      icon:'ai'},
    {id:'bot',       label:'BOTANIA',      x:235, cy:196, w:170, kind:'trigger', icon:'seed'}
  ],
  hubs:[{id:'h', x:320, y:118}],
  links:[
    {from:'growth',to:'h',w:1.3},{from:'structure',to:'h',w:1.3},{from:'intel',to:'h',w:1.3},
    {from:'h',to:'bot',w:2.3}
  ]
};

/* Same three ideas, packed tighter so the labels still read at phone
   width. Scaling the desktop layout down put them at under 8px. */
SPECS.ctaMobile = {
  viewBox:[443,230], vertical:true, linkMs:700,
  nodes:[
    {id:'growth',    label:'Growth',       x:24,  cy:44,  w:96,  kind:'std',     icon:'chart'},
    {id:'structure', label:'Structure',    x:140, cy:44,  w:118, kind:'std',     icon:'db'},
    {id:'intel',     label:'Intelligence', x:278, cy:44,  w:140, kind:'ai',      icon:'ai'},
    {id:'bot',       label:'BOTANIA',      x:137, cy:186, w:170, kind:'trigger', icon:'seed'}
  ],
  hubs:[{id:'h', x:221, y:112}],
  links:[
    {from:'growth',to:'h',w:1.3},{from:'structure',to:'h',w:1.3},{from:'intel',to:'h',w:1.3},
    {from:'h',to:'bot',w:2.3}
  ]
};

/* ============================================================
   AMBIENT VENATION
   Ported from the previous BOTANIA build. Space colonisation
   (Runions et al.), Poisson-disk seeding, Murray's-law taper.
   Here it is the substrate only. The SVG layer carries the
   signal, so the pulse and pointer code is not needed.
   ============================================================ */
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function Grid(cell, w, h){
  this.cell = cell;
  this.cols = Math.max(1, Math.ceil(w / cell));
  this.rows = Math.max(1, Math.ceil(h / cell));
  this.b = new Array(this.cols * this.rows);
}
Grid.prototype.add = function(i, x, y){
  var cx = Math.min(this.cols - 1, Math.max(0, (x / this.cell) | 0));
  var cy = Math.min(this.rows - 1, Math.max(0, (y / this.cell) | 0));
  var k = cy * this.cols + cx;
  (this.b[k] || (this.b[k] = [])).push(i);
};
Grid.prototype.near = function(x, y, out){
  out.length = 0;
  var cx = Math.min(this.cols - 1, Math.max(0, (x / this.cell) | 0));
  var cy = Math.min(this.rows - 1, Math.max(0, (y / this.cell) | 0));
  for(var yy = Math.max(0, cy - 1); yy <= Math.min(this.rows - 1, cy + 1); yy++)
    for(var xx = Math.max(0, cx - 1); xx <= Math.min(this.cols - 1, cx + 1); xx++){
      var b = this.b[yy * this.cols + xx];
      if(b) for(var i = 0; i < b.length; i++) out.push(b[i]);
    }
  return out;
};
function poisson(w, h, r, rng, inDomain, cap){
  var k = 10, cell = r / Math.SQRT2;
  var gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  var grid = new Int32Array(gw * gh).fill(-1);
  var pts = [], active = [];
  function insert(px, py){
    grid[((py / cell) | 0) * gw + ((px / cell) | 0)] = pts.length;
    pts.push([px, py]); active.push(pts.length - 1);
  }
  var tries = 0;
  while(!pts.length && tries++ < 3000){
    var px = rng() * w, py = rng() * h;
    if(inDomain(px, py)) insert(px, py);
  }
  while(active.length && pts.length < cap){
    var ai = (rng() * active.length) | 0, p = pts[active[ai]], placed = false;
    for(var i = 0; i < k; i++){
      var ang = rng() * Math.PI * 2, rad = r * (1 + rng());
      var qx = p[0] + Math.cos(ang) * rad, qy = p[1] + Math.sin(ang) * rad;
      if(qx < 0 || qy < 0 || qx >= w || qy >= h || !inDomain(qx, qy)) continue;
      var gx = (qx / cell) | 0, gy = (qy / cell) | 0, ok = true;
      for(var yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2) && ok; yy++)
        for(var xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2) && ok; xx++){
          var id = grid[yy * gw + xx];
          if(id >= 0){
            var dx = pts[id][0] - qx, dy = pts[id][1] - qy;
            if(dx * dx + dy * dy < r * r) ok = false;
          }
        }
      if(ok){ insert(qx, qy); placed = true; break; }
    }
    if(!placed) active.splice(ai, 1);
  }
  return pts;
}
function venation(w, h, cfg){
  var rng = mulberry32(cfg.seed);
  var ox = w * cfg.originX, oy = h * cfg.originY;
  var rx = w * cfg.spreadX, ry = h * cfg.spreadY;
  function inDomain(x, y){
    var nx = (x - ox) / rx, ny = (y - oy) / ry;
    return nx * nx + ny * ny <= 1;
  }
  var attractors = poisson(w, h, cfg.spacing, rng, inDomain, cfg.cap);
  if(attractors.length < 8) return null;

  var rootX = ox, rootY = oy, best = Infinity;
  for(var i = 0; i < attractors.length; i++){
    var ddx = attractors[i][0] - ox, ddy = attractors[i][1] - oy;
    var d = ddx * ddx + ddy * ddy;
    if(d < best){ best = d; rootX = attractors[i][0]; rootY = attractors[i][1]; }
  }
  var nodes = [{ x:rootX, y:rootY, parent:-1 }];
  var grid = new Grid(cfg.influence, w, h);
  grid.add(0, rootX, rootY);

  /* a dominant midrib first. Pure colonisation from one point
     radiates evenly and reads as a starburst, not venation */
  var steps = Math.max(2, Math.round(w * cfg.midrib / cfg.step));
  var px = rootX, py = rootY, parent = 0;
  for(var s = 0; s < steps; s++){
    px += cfg.step * cfg.biasX;
    py += cfg.step * cfg.biasY + Math.sin(s / steps * Math.PI) * cfg.arc;
    if(px < 0 || px >= w || py < 0 || py >= h) break;
    nodes.push({ x:px, y:py, parent:parent });
    parent = nodes.length - 1;
    grid.add(parent, px, py);
  }

  var live = attractors.slice(), scratch = [];
  var inf2 = cfg.influence * cfg.influence, kill2 = cfg.kill * cfg.kill;
  var t0 = performance.now();
  for(var it = 0; it < cfg.maxIter && live.length; it++){
    if(nodes.length > cfg.nodeCap || performance.now() - t0 > cfg.budget) break;
    var dX = new Map(), dY = new Map();
    for(var a = 0; a < live.length; a++){
      var ax = live[a][0], ay = live[a][1];
      grid.near(ax, ay, scratch);
      var bi = -1, bd = inf2;
      for(var q = 0; q < scratch.length; q++){
        var nn = nodes[scratch[q]];
        var ddx2 = ax - nn.x, ddy2 = ay - nn.y, dd = ddx2 * ddx2 + ddy2 * ddy2;
        if(dd < bd){ bd = dd; bi = scratch[q]; }
      }
      if(bi < 0) continue;
      var nb = nodes[bi], vx = ax - nb.x, vy = ay - nb.y;
      var vl = Math.hypot(vx, vy) || 1;
      dX.set(bi, (dX.get(bi) || 0) + vx / vl);
      dY.set(bi, (dY.get(bi) || 0) + vy / vl);
    }
    if(!dX.size) break;
    var fresh = [];
    dX.forEach(function(sx, idx){
      var sy = dY.get(idx), sl = Math.hypot(sx, sy);
      if(sl < 1e-6) return;
      var vx2 = sx / sl + cfg.biasX * cfg.biasStrength;
      var vy2 = sy / sl + cfg.biasY * cfg.biasStrength;
      var l2 = Math.hypot(vx2, vy2);
      if(l2 < 1e-6) return;
      vx2 /= l2; vy2 /= l2;
      var j = (rng() - 0.5) * cfg.jitter, cs = Math.cos(j), sn = Math.sin(j);
      var pnode = nodes[idx];
      var nx2 = pnode.x + (vx2 * cs - vy2 * sn) * cfg.step;
      var ny2 = pnode.y + (vx2 * sn + vy2 * cs) * cfg.step;
      nodes.push({ x:nx2, y:ny2, parent:idx });
      grid.add(nodes.length - 1, nx2, ny2);
      fresh.push(nodes.length - 1);
    });
    for(var li = live.length - 1; li >= 0; li--){
      for(var f = 0; f < fresh.length; f++){
        var fn = nodes[fresh[f]];
        var fdx = live[li][0] - fn.x, fdy = live[li][1] - fn.y;
        if(fdx * fdx + fdy * fdy < kill2){ live.splice(li, 1); break; }
      }
    }
  }

  /* flow = subtree size; width = its cube root (Murray's law) */
  var N = nodes.length, children = [];
  for(var c1 = 0; c1 < N; c1++) children[c1] = [];
  for(var c2 = 1; c2 < N; c2++) children[nodes[c2].parent].push(c2);
  var order = [], queue = [0];
  while(queue.length){
    var cur = queue.shift(); order.push(cur);
    for(var ci = 0; ci < children[cur].length; ci++) queue.push(children[cur][ci]);
  }
  var flow = new Float32Array(N).fill(1);
  for(var oi = order.length - 1; oi >= 0; oi--){
    var nd = order[oi], sum = 1;
    for(var k2 = 0; k2 < children[nd].length; k2++) sum += flow[children[nd][k2]];
    flow[nd] = sum;
  }
  var maxFlow = 1;
  for(var m = 0; m < N; m++) if(flow[m] > maxFlow) maxFlow = flow[m];

  var segs = [];
  for(var g2 = 1; g2 < N; g2++){
    var pp = nodes[nodes[g2].parent];
    segs.push({ x1:pp.x, y1:pp.y, x2:nodes[g2].x, y2:nodes[g2].y,
                w: cfg.minW + Math.cbrt(flow[g2] / maxFlow) * (cfg.maxW - cfg.minW) });
  }
  return segs;
}

function initVeins(host){
  var cv = host.querySelector('canvas');
  if(!cv) return;
  var ctx = cv.getContext('2d');
  var seed = (Math.random() * 2147483647) | 0;
  function draw(){
    var box = host.getBoundingClientRect();
    var W = Math.round(box.width), H = Math.round(box.height);
    if(W < 40 || H < 40) return;
    var dpr = Math.min(window.devicePixelRatio || 1, W < 760 ? 1.5 : 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var mobile = W < 760;
    var segs = venation(W, H, {
      seed:seed,
      originX:-0.04, originY:0.06, spreadX:1.2, spreadY:1.15,
      midrib: mobile ? 0.6 : 0.9, arc: mobile ? 0.3 : 0.18,
      spacing: mobile ? 42 : 27, cap: mobile ? 260 : 900,
      influence: mobile ? 120 : 96, kill: mobile ? 26 : 18,
      step: mobile ? 13 : 10,
      biasX:0.72, biasY:0.7, biasStrength:0.7, jitter:0.26,
      maxIter: mobile ? 130 : 220, nodeCap: mobile ? 2000 : 4800, budget:90,
      minW:0.35, maxW: mobile ? 2.1 : 2.6
    });
    ctx.clearRect(0, 0, W, H);
    if(!segs) return;
    ctx.lineCap = 'round';
    for(var i = 0; i < segs.length; i++){
      var s = segs[i];
      var alpha = 0.2 * (0.42 + 0.58 * (s.w / 2.6));
      ctx.strokeStyle = 'rgba(125,148,105,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = s.w;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    }
  }
  draw();
  var rt;
  window.addEventListener('resize', function(){
    clearTimeout(rt); rt = setTimeout(draw, 280);
  });
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
  if(!nav) return;

  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  var targets = links.map(function(a){
    return document.querySelector(a.getAttribute('href'));
  });

  function current(){
    var chrome = parseFloat(getComputedStyle(root).getPropertyValue('--chrome-h')) || 0;
    /* A clicked anchor lands its section exactly on scroll-margin-top, which is
       this same line. Sub-pixel layout put it a fraction below, so the section
       failed the test and the previous one stayed marked. The tolerance covers
       that landing. */
    var line = chrome + 24 + 3;
    var found = -1;
    for(var i = 0; i < targets.length; i++){
      if(targets[i] && targets[i].getBoundingClientRect().top <= line) found = i;
    }
    /* at the very bottom the last section may never cross the line */
    if(window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) found = links.length - 1;
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
     scroll to arrive, and the spy is held off until the scroll settles so
     it cannot flicker through the sections on the way. */
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

  /* Throttled on a timestamp rather than a requestAnimationFrame flag.
     rAF is paused while a tab is in the background, and a boolean guard
     set just before a paused rAF never clears, which killed the spy for
     the rest of the session. */
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
    if(t.getBoundingClientRect().top < vh) t.classList.add('in');
    else deferred.push(t);
  });
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var sibs = Array.prototype.filter.call(e.target.parentNode.children, function(n){
        return n.classList && n.classList.contains('reveal');
      });
      var i = Math.max(0, sibs.indexOf(e.target));
      e.target.style.transitionDelay = Math.min(i * 45, 200) + 'ms';
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });
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

/* The legend describes the canvas in front of the reader, not the canvas
   in the abstract. The mobile hero carries no approval step, so it must
   not offer a key for one. */
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

/* The pan affordance appears only where the canvas genuinely overflows.
   the mobile hero has its own vertical layout and fits, so it must not
   tell the reader to drag something that does not move. */
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

function initHero(){
  var svg = document.getElementById('heroCanvas');
  if(!svg) return;
  var mobile = window.matchMedia('(max-width: 720px)').matches;
  var sc = mount('heroCanvas', mobile ? SPECS.heroMobile : SPECS.heroDesktop);
  if(!sc) return;

  function run(){
    if(REDUCED){ sc.settle(); sc.staticSignal(); return; }
    sc.seed();
    whenVisible(svg, function(){ sc.grow(); });
  }
  run();

  var replay = document.getElementById('heroReplay');
  if(replay){
    if(REDUCED){
      replay.textContent = 'Motion reduced';
      replay.disabled = true;
      replay.style.opacity = '.55';
      replay.style.cursor = 'default';
    } else {
      replay.addEventListener('click', function(){ sc.grow(); });
    }
  }

  /* Mobile is a different system, not a smaller one, so crossing the
     breakpoint rebuilds it rather than scaling the desktop layout. */
  var wasMobile = mobile, rt;
  window.addEventListener('resize', function(){
    clearTimeout(rt);
    rt = setTimeout(function(){
      var isMobile = window.matchMedia('(max-width: 720px)').matches;
      if(isMobile === wasMobile) return;
      wasMobile = isMobile;
      sc.stop();
      sc = mount('heroCanvas', isMobile ? SPECS.heroMobile : SPECS.heroDesktop);
      if(REDUCED){ sc.settle(); sc.staticSignal(); } else { sc.grow(); }
    }, 320);
  });
}

/* Manual → BOTANIA → Intelligent system, on one canvas. */
function initTransform(){
  var svg = document.getElementById('transformCanvas');
  if(!svg) return;
  var sc = mount('transformCanvas', SPECS.transform);
  var buttons = Array.prototype.slice.call(document.querySelectorAll('#transformTabs button'));
  var caption = document.getElementById('transformCaption');
  var CAPTIONS = [
    'Six applications, all working. Right now a person moves information between them.',
    'We map how information actually moves, then build the connections that carry it.',
    'The same six applications, working as one system. Information arrives where it is needed.'
  ];
  var state = -1, autoTimer = null;

  function set(i, manual){
    if(i === state) return;
    state = i;
    buttons.forEach(function(b, bi){ b.setAttribute('aria-selected', bi === i ? 'true' : 'false'); });
    if(caption) caption.textContent = CAPTIONS[i];
    sc.stop();

    if(i === 0){
      if(REDUCED){ sc.settle(); svg.classList.add('state-manual'); hideLinks(); }
      else sc.seedNodesOnly();
    } else if(i === 1){
      svg.classList.remove('state-manual');
      if(REDUCED){ restoreLinks(); sc.settle(); }
      else { standNodes(); sc.connect(); }
    } else {
      svg.classList.remove('state-manual');
      restoreLinks(); sc.settle();
      if(REDUCED) sc.staticSignal(); else sc.flow();
    }
    if(manual && autoTimer){ clearTimeout(autoTimer); autoTimer = null; }
  }

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

  buttons.forEach(function(b, i){ b.addEventListener('click', function(){ set(i, true); }); });

  whenVisible(svg, function(){
    if(state !== -1) return;
    set(0);
    if(REDUCED) return;
    autoTimer = setTimeout(function(){
      set(1);
      autoTimer = setTimeout(function(){ set(2); }, 3400);
    }, 1800);
  });
}

/* A canvas that names its own spec and has no tab strip. Used where a
   section's copy is about one specific system. */
function initNamedCanvases(){
  Array.prototype.forEach.call(document.querySelectorAll('svg[data-spec]'), function(svg){
    var spec = SPECS[svg.dataset.spec];
    if(!spec || !svg.id) return;
    var sc = mount(svg.id, spec);
    if(!sc) return;
    if(REDUCED){ sc.settle(); sc.staticSignal(); return; }
    sc.seed();
    whenVisible(svg, function(){ sc.grow(); });
  });
}

function initScenarios(){
  var svg = document.getElementById('scenarioCanvas');
  if(!svg) return;
  var buttons = Array.prototype.slice.call(document.querySelectorAll('#scenarioTabs button'));
  var caption = document.getElementById('scenarioCaption');
  var LIST = [
    { key:'scenarioLead',    cap:'An enquiry is captured and recorded in your CRM. AI works out what it needs, a response agent writes the reply, and scheduling is handled automatically. You review anything unusual before follow-up continues.' },
    { key:'scenarioClient',  cap:'Onboarding runs on its own. Details are collected once, documents are requested, setup tasks are assigned, and AI checks what comes back. A person approves before anything reaches the client.' },
    { key:'scenarioService', cap:'A referral moves through scheduling and delivery. A reporting agent builds the report from what the system already recorded, you approve the result, and the invoice goes out with it.' }
  ];
  var sc = null, current = -1;

  /* Below this width the vertical recomposition is used. It is set above
     the tablet breakpoint deliberately: the wide layout is 1200 units
     across, so anywhere under roughly 900px its labels stop being
     readable and the reader has to drag to reach the end. */
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
  /* Only auto-select if the visitor has not already chosen. A late
     observer callback must never overrule an explicit click. */
  whenVisible(svg, function(){ if(current === -1) select(0); });

  /* Crossing the breakpoint swaps in a different system, not a resized
     one, so it has to be rebuilt rather than left to scale. */
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
   The inputs are real form controls so the section stays keyboard
   and screen reader accessible. The drawing between them is only a
   connector: it is measured from the live layout rather than
   authored, so it follows the inputs when they wrap or stack.
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
    week:      document.getElementById('calcWeek'),
    year:      document.getElementById('calcYear'),
    yearWeeks: document.getElementById('calcYearWeeks'),
    saved:     document.getElementById('calcSaved'),
    savedWeeks:document.getElementById('calcSavedWeeks'),
    shareOut:  document.getElementById('calcShareOut')
  };

  /* Clamp rather than reject. A number field can hold anything the
     visitor types, and a silently wrong total is worse than a nudge. */
  function val(el, min, max, fallback){
    var n = parseFloat(el.value);
    if(!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
  function fmt(n){
    return Math.round(n).toLocaleString(PT_ON ? 'pt-BR' : 'en-US');
  }
  function weeksLabel(hours){
    var w = hours / WORK_WEEK;
    if(w < 0.5) return tr('under half a workweek');
    var n = Math.round(w);
    if(n <= 1) return tr('about one workweek');
    return tr('about {n} workweeks').replace('{n}', n);
  }

  function compute(){
    var p = val(people, 1, 999, 1);
    var m = val(minutes, 1, 480, 1);
    var t = val(times, 1, 500, 1);
    var sh = val(share, 0, 100, 0) / 100;

    var hoursWeek = (p * m * t) / 60;
    var hoursYear = hoursWeek * WORK_WEEKS;
    var saved     = hoursYear * sh;

    fields.week.textContent  = fmt(hoursWeek);
    fields.year.textContent  = fmt(hoursYear);
    fields.saved.textContent = fmt(saved);
    fields.yearWeeks.textContent  = weeksLabel(hoursYear);
    fields.savedWeeks.textContent = weeksLabel(saved);
    fields.shareOut.textContent = Math.round(sh * 100) + '%';
  }

  /* ---- connectors ---------------------------------------------------
     Three inputs converging into one outcome, drawn with the same
     curve the system canvases use so it belongs to the same hand.
     Geometry is measured from the live layout, so it follows the
     fields when they wrap or stack. */
  var pulses = [];
  function centerX(elm, box){
    var r = elm.getBoundingClientRect();
    return Math.round(r.left - box.left + r.width / 2);
  }
  function geometry(){
    var box = flow.getBoundingClientRect();
    if(!box.width) return null;
    var fieldEls = Array.prototype.slice.call(
      inputs.querySelectorAll('.calc-field:not(.calc-field-range)'));
    var lead = out.querySelector('.calc-result.is-lead') ||
               out.querySelector('.calc-result');
    if(!fieldEls.length || !lead) return null;
    var w = Math.round(box.width);
    var xs = fieldEls.map(function(e){ return centerX(e, box); });
    /* When the inputs stack, every stem would start from the same point
       and the drawing collapses into one vertical line. Fan the branches
       across the width instead, so the figure still reads as several
       things feeding one outcome. */
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
    /* and on from the junction to the outcome */
    d += ' M' + g.outX + ' ' + g.junction + 'V' + g.h;
    flow.appendChild(el('path', { d:d.trim() }));
    flow.appendChild(el('circle', { cx:g.outX, cy:g.junction, r:2.6, fill:'#7D9469', opacity:'.8' }));

    pulses = g.xs.map(function(x){
      var p = el('path', { 'class':'calc-pulse',
        d: linkPath([x, 0], [g.outX, g.junction], true) +
           'V' + g.h });
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
      p.style.strokeDasharray = (len * 0.18) + ' ' + len;
      p.style.strokeDashoffset = len * 0.18;
      p.style.opacity = '.85';
      /* force a reflow so the reset above is not folded into the change */
      void p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset .62s cubic-bezier(.16,1,.3,1) ' +
                           (i * 0.06) + 's, opacity .5s ease ' + (0.32 + i * 0.06) + 's';
      p.style.strokeDashoffset = -len;
      p.style.opacity = '0';
    });
  }

  var rafId = null;
  function update(){
    compute();
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function(){ pulse(); });
  }

  inputs.addEventListener('input', update);
  inputs.addEventListener('change', update);
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
   boot
   The canvases are enhancement. A failure in any of them must
   never take the content layer down with it.
   ============================================================ */
function boot(){
  localiseSpecs();
  initReveals();
  try{ initSectionNav(); }catch(err){ console.error('[BOTANIA] section nav disabled:', err); }
  [initHero, initTransform, initScenarios, initNamedCanvases, initCta, initCalc].forEach(function(fn){
    try{ fn(); }catch(err){ console.error('[BOTANIA] canvas disabled:', err); }
  });
  try{
    Array.prototype.forEach.call(document.querySelectorAll('.veins'), initVeins);
  }catch(err){
    console.error('[BOTANIA] venation disabled:', err);
    Array.prototype.forEach.call(document.querySelectorAll('.veins'), function(v){ v.style.display = 'none'; });
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();

/* ============================================================
   MOBILE NAVIGATION
   Carried over unchanged from the previous build.
   ============================================================ */
(function(){
'use strict';
var toggle = document.getElementById('navToggle');
var panel  = document.getElementById('primaryNav');
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
