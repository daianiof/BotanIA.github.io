/* BOTAN.IA site script, second generation.
   Draws the Branching Node Architecture as SVG and plays each system by
   itself when it comes into view: nodes wake, line up and connect, paths
   extend, a checkpoint waits and is approved. Nothing waits for the visitor
   and nothing loops; a system starts again only after it has left the screen.
   ?still  no opening clip     ?flat  finished states, as with reduced motion
   ?hold   systems wait to be placed by a "botania:seek" event (captures) */
(function(){
'use strict';

var root = document.documentElement;
var PT = (root.lang || 'en').slice(0, 2).toLowerCase() === 'pt';
var mqSmall = window.matchMedia('(max-width: 899px)');
var FLAT = root.classList.contains('no-motion');
var STILL = FLAT || /[?&]still\b/.test(location.search);
var HOLD = /[?&]hold\b/.test(location.search);

/* names drawn inside the systems, in the page's language */
var T = PT ? {
  messages:'Mensagens', bookings:'Agendamentos', clients:'Dados de clientes', payments:'Pagamentos', documents:'Documentos', team:'Operação da equipe',
  record:'Cadastro atualizado', followup:'Follow-up enviado', calendar:'Agenda atualizada',
  replyDraft:'Resposta redigida', invoiceReady:'Fatura preparada', bookingAsk:'Pedido de agendamento',
  replySent:'Resposta enviada', invoiceSent:'Fatura enviada', bookingOk:'Agendamento confirmado',
  friction:['Mensagens', 'Agendamentos', 'Follow-up', 'Dados de clientes', 'Formulários', 'Pagamentos', 'Agenda', 'Relatórios', 'Arquivos', 'Lembretes'],
  google:'Google Contatos', outlook:'Outlook', asks:'Pergunta antes de salvar',
  locale:'pt-BR', hour:'hora', hours:'horas',
  weeksUnder:'menos de meia semana de trabalho', weeksOne:'cerca de uma semana de trabalho',
  weeksMany:function(n){ return 'cerca de ' + n + ' semanas de trabalho'; },
  live:function(a, u, y, w){ return 'Cerca de ' + a + ' ' + u + ' por semana. Em um ano, ' + y + ' horas, ' + w + '.'; }
} : {
  messages:'Messages', bookings:'Bookings', clients:'Client information', payments:'Payments', documents:'Documents', team:'Team operations',
  record:'Client record updated', followup:'Follow-up sent', calendar:'Calendar updated',
  replyDraft:'Reply drafted', invoiceReady:'Invoice prepared', bookingAsk:'Booking request',
  replySent:'Reply sent', invoiceSent:'Invoice sent', bookingOk:'Booking confirmed',
  friction:['Messages', 'Bookings', 'Follow-up', 'Client details', 'Forms', 'Payments', 'Scheduling', 'Reporting', 'Files', 'Reminders'],
  google:'Google Contacts', outlook:'Outlook', asks:'Asks before saving',
  locale:'en-US', hour:'hour', hours:'hours',
  weeksUnder:'under half a workweek', weeksOne:'about one workweek',
  weeksMany:function(n){ return 'about ' + n + ' workweeks'; },
  live:function(a, u, y, w){ return 'About ' + a + ' ' + u + ' a week. Over a year, ' + y + ' hours, ' + w + '.'; }
};

function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
function seg(p, a, b){ return clamp01((p - a) / (b - a)); }
function ease(t){ return t * t * (3 - 2 * t); }

/* ============================================================
   header
   ============================================================ */
function initHeader(){
  var header = document.getElementById('siteHeader');
  var toggle = document.getElementById('navToggle');
  if(!header) return;
  function stuck(){ header.classList.toggle('is-stuck', window.scrollY > 12); }
  stuck();
  window.addEventListener('scroll', stuck, { passive:true });
  if(!toggle) return;
  function setOpen(open){
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  toggle.addEventListener('click', function(){ setOpen(!header.classList.contains('nav-open')); });
  header.addEventListener('click', function(e){ if(e.target.closest && e.target.closest('.site-nav a')) setOpen(false); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') setOpen(false); });
}

/* ============================================================
   hero: light passes through the scene once and it comes to rest
   on the still. After that only the pointer and the scroll move it.
   ============================================================ */
function initHero(){
  var hero = document.getElementById('top');
  if(!hero || !hero.classList.contains('hero')) return;
  var video = document.getElementById('heroVideo');
  var saver = navigator.connection && navigator.connection.saveData;

  if(video && !STILL && !HOLD && !saver){
    var wide = window.innerWidth * (window.devicePixelRatio || 1) > 1500;
    var src = video.getAttribute(mqSmall.matches ? 'data-mobile' : wide ? 'data-desktop' : 'data-desktop-small');
    var over = false;
    var finish = function(){
      if(over) return;
      over = true;
      hero.classList.remove('is-playing');
      /* the clip ends on the still, so the fade is invisible; then free the decoder */
      setTimeout(function(){ video.removeAttribute('src'); video.load(); }, 1100);
    };
    video.addEventListener('playing', function(){ if(!over) hero.classList.add('is-playing'); });
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    video.src = src;
    var started = video.play();
    if(started && started.catch) started.catch(finish);
    setTimeout(function(){ if(!hero.classList.contains('is-playing')) finish(); }, 2600);
  }

  if(FLAT) return;
  /* a fine pointer shifts the scene and its light by a few pixels */
  if(window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var step = function(){
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      hero.style.setProperty('--px', (cx * -11).toFixed(2) + 'px');
      hero.style.setProperty('--py', (cy * -6).toFixed(2) + 'px');
      hero.style.setProperty('--lx', (cx * 4).toFixed(2) + '%');
      hero.style.setProperty('--ly', (cy * 3).toFixed(2) + '%');
      raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .002) ? requestAnimationFrame(step) : 0;
    };
    hero.addEventListener('pointermove', function(e){
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width * 2 - 1;
      ty = (e.clientY - r.top) / r.height * 2 - 1;
      if(!raf) raf = requestAnimationFrame(step);
    });
    hero.addEventListener('pointerleave', function(){ tx = 0; ty = 0; if(!raf) raf = requestAnimationFrame(step); });
  }
  /* the scene falls behind the page a little as it scrolls away */
  var ticking = false;
  window.addEventListener('scroll', function(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      ticking = false;
      var y = window.scrollY;
      if(y < hero.offsetHeight) hero.style.setProperty('--sy', (y * .14).toFixed(1) + 'px');
    });
  }, { passive:true });
}

/* ============================================================
   system builder: nodes and paths from a small description
   node kinds: in / out (entry points and outcomes), join, hub, gate
   node states: hidden, dormant, active, processing, decision, complete
   ============================================================ */
var RADIUS = { hub:24, gate:13, join:5 };
var LABEL = {
  l:  function(r){ return { x:-(r + 14), y:5.5, a:'end' }; },
  r:  function(r){ return { x:r + 14, y:5.5, a:'start' }; },
  b:  function(r){ return { x:0, y:r + 30, a:'middle' }; },
  tl: function(r){ return { x:-r, y:-(r + 9), a:'start' }; },
  tr: function(r){ return { x:r, y:-(r + 9), a:'end' }; }
};

function nodeMarkup(n){
  var r = n.r || RADIUS[n.kind] || 8;
  var halo = n.kind === 'hub' ? r * 2.75 : n.kind === 'gate' ? 58 : 30;
  var s = '<g class="nd nd-' + n.kind + (n.brief ? ' is-brief' : '') + (n.alt ? ' has-alt' : '') + '" data-id="' + n.id + '" data-s="hidden" transform="translate(' + n.x + ' ' + n.y + ')"><g class="nd-pos">';
  if(n.kind !== 'join') s += '<circle class="nd-halo" r="' + halo + '"/>';
  s += '<g class="nd-body"><circle class="nd-ring" r="' + r + '"/>';
  if(n.kind === 'hub' || n.kind === 'gate') s += '<circle class="nd-fill" r="' + r + '"/>';
  if(n.kind !== 'join') s += '<circle class="nd-core" r="' + (n.kind === 'hub' ? r * .21 : r * .4).toFixed(1) + '"/>';
  s += '</g>';
  if(n.label){
    var L = LABEL[n.la || 'r'](r);
    var at = ' x="' + L.x + '" y="' + L.y + '" text-anchor="' + L.a + '">';
    s += '<text class="nd-label nd-main"' + at + n.label + '</text>';
    if(n.alt) s += '<text class="nd-label nd-alt"' + at + n.alt + '</text>';
  }
  return s + '</g></g>';
}

function build(host, cfg){
  var s = '<svg viewBox="' + cfg.vb + '" preserveAspectRatio="' + (cfg.fit || 'xMidYMid meet') + '" aria-hidden="true" focusable="false"><g>';
  (cfg.paths || []).forEach(function(p){ s += '<path class="pth ' + (p.cls || '') + '" data-id="' + p.id + '" pathLength="1" d="' + p.d + '"/>'; });
  s += '</g><g>';
  cfg.nodes.forEach(function(n){ s += nodeMarkup(n); });
  host.innerHTML = s + '</g></svg>';
  var sys = { host:host, n:{}, p:{} };
  cfg.nodes.forEach(function(n){
    var el = host.querySelector('.nd[data-id="' + n.id + '"]');
    sys.n[n.id] = { el:el, pos:el.firstChild, s:'hidden', dx:n.dx || 0, dy:n.dy || 0, k:-1 };
  });
  (cfg.paths || []).forEach(function(p){
    sys.p[p.id] = { el:host.querySelector('.pth[data-id="' + p.id + '"]'), t:-1, q:false };
  });
  return sys;
}
function state(sys, id, s){
  var n = sys.n[id];
  if(n && n.s !== s){ n.s = s; n.el.setAttribute('data-s', s); }
}
/* k = 1 is the loose position, 0 is on the grid */
function offset(sys, id, k){
  var n = sys.n[id];
  if(!n) return;
  k = Math.round(k * 200) / 200;
  if(n.k === k) return;
  n.k = k;
  n.pos.style.transform = k ? 'translate(' + (n.dx * k).toFixed(1) + 'px,' + (n.dy * k).toFixed(1) + 'px)' : '';
}
/* t = 0 nothing drawn, 1 the whole path */
function draw(sys, id, t){
  var p = sys.p[id];
  if(!p) return;
  t = Math.round(t * 500) / 500;
  if(p.t === t) return;
  p.t = t;
  p.el.style.strokeDashoffset = (1 - t).toFixed(3);
  p.el.style.opacity = t > 0 ? 1 : 0;
}
function quiet(sys, id, on){
  var p = sys.p[id];
  if(p && p.q !== on){ p.q = on; p.el.classList.toggle('is-quiet', on); }
}

/* ============================================================
   autoplay: a system plays once it is well inside the screen, and
   returns to its start only after it has left the screen entirely
   ============================================================ */
var players = {};
var rebuilders = [];
function autoplay(key, watch, duration, render, hooks){
  hooks = hooks || {};
  var pl = { p:0, raf:0, t0:0, playing:false, done:false };
  function frame(now){
    pl.p = clamp01((now - pl.t0) / duration);
    render(pl.p);
    if(pl.p < 1){ pl.raf = requestAnimationFrame(frame); }
    else { pl.playing = false; pl.done = true; if(hooks.end) hooks.end(); }
  }
  pl.play = function(){
    if(pl.playing || pl.done) return;
    pl.playing = true;
    pl.t0 = performance.now() - pl.p * duration;
    pl.raf = requestAnimationFrame(frame);
  };
  pl.reset = function(){
    cancelAnimationFrame(pl.raf);
    pl.playing = false; pl.done = false; pl.p = 0;
    if(hooks.reset) hooks.reset();
    render(0);
  };
  pl.seek = function(p){
    cancelAnimationFrame(pl.raf);
    pl.playing = false; pl.done = true; pl.p = p;
    if(hooks.seek) hooks.seek(p); else render(p);
  };
  pl.refresh = function(){ if(hooks.seek && pl.done && !pl.playing && pl.sought != null) hooks.seek(pl.sought); else render(pl.p); };
  players[key] = pl;
  if(FLAT){ pl.p = 1; pl.done = true; render(1); if(hooks.flat) hooks.flat(); return pl; }
  render(0);
  if(HOLD) return pl;
  if(!('IntersectionObserver' in window)){ pl.p = 1; pl.done = true; render(1); return pl; }
  var at = hooks.at || .45;
  new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting && e.intersectionRatio >= at) pl.play();
      else if(!e.isIntersecting && (pl.done || pl.playing)) pl.reset();
    });
  }, { threshold:[0, at] }).observe(watch);
  return pl;
}
document.addEventListener('botania:seek', function(e){
  var d = e.detail || {};
  if(players[d.id]){ players[d.id].sought = d.p; players[d.id].seek(d.p); }
});

/* ============================================================
   friction: many small things, each one asking for attention
   ============================================================ */
function initFriction(){
  var section = document.getElementById('work');
  var host = document.getElementById('frSystem');
  if(!section || !host) return;
  var wide = [[40,36],[330,66],[150,122],[400,158],[60,204],[300,244],[120,298],[420,328],[30,378],[280,404]];
  var tall = [[28,28],[196,58],[56,92],[214,122],[34,156],[188,186],[62,220],[208,250],[30,284],[200,314]];
  var sys;
  function rebuild(){
    var pts = mqSmall.matches ? tall : wide;
    sys = build(host, {
      vb: mqSmall.matches ? '0 0 360 340' : '0 0 600 440',
      nodes: pts.map(function(pt, i){ return { id:'f' + i, kind:'in', x:pt[0], y:pt[1], label:T.friction[i], la:'r' }; })
    });
  }
  function render(p){
    for(var i = 0; i < 10; i++){
      var a = .03 + i * .08;
      state(sys, 'f' + i, p < a ? 'hidden' : p < a + .13 ? 'active' : 'dormant');
    }
    section.classList.toggle('is-done', p >= .88);
  }
  rebuild();
  var pl = autoplay('friction', host, 3800, render);
  rebuilders.push(function(){ rebuild(); pl.refresh(); });
}

/* ============================================================
   connected work
   wide: six entry points in two interleaved groups, hub, three outcomes
   tall: three entry points that carry a second set of names, a centre spine
   ============================================================ */
function initConnected(){
  var section = document.getElementById('connected');
  var host = document.getElementById('cwSystem');
  if(!section || !host) return;
  var words = [].slice.call(section.querySelectorAll('.phases span'));
  var CW = {
    wide: {
      vb: '0 66 1200 388',
      nodes: [
        { id:'i1', kind:'in', x:250, y:110, label:T.messages, la:'l', dx:-36, dy:-12 },
        { id:'i2', kind:'in', x:250, y:230, label:T.bookings, la:'l', dx:28, dy:9 },
        { id:'i3', kind:'in', x:250, y:350, label:T.clients, la:'l', dx:-20, dy:20 },
        { id:'i4', kind:'in', x:250, y:170, label:T.payments, la:'l', dx:-16, dy:0 },
        { id:'i5', kind:'in', x:250, y:290, label:T.documents, la:'l', dx:-16, dy:0 },
        { id:'i6', kind:'in', x:250, y:410, label:T.team, la:'l', dx:-16, dy:0 },
        { id:'j1', kind:'join', x:350, y:260 },
        { id:'hub', kind:'hub', x:600, y:260, label:'BOTAN.IA', la:'b' },
        { id:'j2', kind:'join', x:800, y:260 },
        { id:'o1', kind:'out', x:940, y:150, label:T.record, la:'r' },
        { id:'o2', kind:'out', x:940, y:260, label:T.followup, la:'r' },
        { id:'o3', kind:'out', x:940, y:370, label:T.calendar, la:'r' }
      ],
      paths: [
        { id:'p-i1', d:'M258 110 H334 Q350 110 350 126 V255' },
        { id:'p-i4', d:'M258 170 H334 Q350 170 350 186 V255' },
        { id:'p-i2', d:'M258 230 H338 Q350 230 350 242 V255' },
        { id:'p-i5', d:'M258 290 H338 Q350 290 350 278 V265' },
        { id:'p-i3', d:'M258 350 H334 Q350 350 350 334 V265' },
        { id:'p-i6', d:'M258 410 H334 Q350 410 350 394 V265' },
        { id:'p-t1', d:'M355 260 H576' },
        { id:'p-t2', cls:'pth-out', d:'M624 260 H795' },
        { id:'p-o1', cls:'pth-out', d:'M800 255 V166 Q800 150 816 150 H932' },
        { id:'p-o2', cls:'pth-out', d:'M805 260 H932' },
        { id:'p-o3', cls:'pth-out', d:'M800 265 V354 Q800 370 816 370 H932' }
      ]
    },
    tall: {
      vb: '0 16 360 520',
      nodes: [
        { id:'i1', kind:'in', x:34, y:56, label:T.messages, alt:T.payments, la:'tl', dx:-8, dy:-6 },
        { id:'i2', kind:'in', x:326, y:118, label:T.bookings, alt:T.documents, la:'tr', dx:9, dy:5 },
        { id:'i3', kind:'in', x:34, y:180, label:T.clients, alt:T.team, la:'tl', dx:-7, dy:8 },
        { id:'hub', kind:'hub', x:166, y:296, label:'BOTAN.IA', la:'r' },
        { id:'o1', kind:'out', x:326, y:388, label:T.record, la:'tr' },
        { id:'o2', kind:'out', x:34, y:448, label:T.followup, la:'tl' },
        { id:'o3', kind:'out', x:326, y:508, label:T.calendar, la:'tr' }
      ],
      paths: [
        { id:'p-i1', d:'M42 56 H150 Q166 56 166 72 V272' },
        { id:'p-i2', d:'M318 118 H182 Q166 118 166 134 V272' },
        { id:'p-i3', d:'M42 180 H150 Q166 180 166 196 V272' },
        { id:'p-o1', cls:'pth-out', d:'M166 320 V372 Q166 388 182 388 H318' },
        { id:'p-o2', cls:'pth-out', d:'M166 320 V432 Q166 448 150 448 H42' },
        { id:'p-o3', cls:'pth-out', d:'M166 320 V492 Q166 508 182 508 H318' }
      ]
    }
  };
  var sys, tall, phase = -1;

  function rebuild(){
    tall = mqSmall.matches;
    sys = build(host, tall ? CW.tall : CW.wide);
    host.classList.remove('is-swapped');
    phase = -1;
  }

  function render(p){
    var i, id, a, b, c, s;
    var settle = tall ? .58 : .60;           /* both groups are in, the hub takes over */

    /* first group: present but loose, then awake, lined up, connected */
    for(i = 0; i < 3; i++){
      id = 'i' + (i + 1);
      a = .03 + i * .03;
      offset(sys, id, 1 - ease(seg(p, .06 + i * .02, .17 + i * .02)));
      draw(sys, 'p-' + id, ease(seg(p, .17 + i * .015, .28 + i * .01)));
      if(tall){
        /* the same three entry points then carry a second set of names */
        b = .43 + i * .03;
        s = p < a ? 'dormant' : p < .31 ? 'active' : p < b ? 'complete' : p < settle ? 'active' : 'complete';
      } else {
        s = p < a ? 'dormant' : p < .31 ? 'active' : 'complete';
      }
      state(sys, id, s);
      quiet(sys, 'p-' + id, s === 'complete');
    }
    if(tall) host.classList.toggle('is-swapped', p >= .40);

    /* second group (wide layout): arrives between the first, already close to the grid */
    for(i = 0; i < 3; i++){
      id = 'i' + (i + 4);
      b = .36 + i * .03;
      offset(sys, id, 1 - ease(seg(p, b, b + .08)));
      draw(sys, 'p-' + id, ease(seg(p, .45 + i * .015, .56 + i * .01)));
      s = p < b ? 'hidden' : p < settle ? 'active' : 'complete';
      state(sys, id, s);
      quiet(sys, 'p-' + id, s === 'complete');
    }

    /* the merge and the hub */
    state(sys, 'j1', p < .26 ? 'hidden' : p < settle ? 'active' : 'complete');
    draw(sys, 'p-t1', ease(seg(p, .25, .30)));
    quiet(sys, 'p-t1', p >= settle);
    state(sys, 'hub', p < .08 ? 'hidden' : p < .29 ? 'dormant' : p < (tall ? .43 : .46) ? 'active' : p < settle ? 'processing' : 'complete');

    /* outcomes, one at a time */
    draw(sys, 'p-t2', ease(seg(p, settle, settle + .06)));
    state(sys, 'j2', p < settle + .05 ? 'hidden' : 'active');
    for(i = 0; i < 3; i++){
      id = 'o' + (i + 1);
      c = settle + .05 + i * .095;
      draw(sys, 'p-' + id, ease(seg(p, c, c + .08)));
      state(sys, id, p < c - .015 ? 'hidden' : p < c + .07 ? 'dormant' : 'active');
    }

    /* the words under the system, the light in the room, and how upright the system stands */
    a = p < .17 ? 0 : p < settle ? 1 : 2;
    if(a !== phase){ phase = a; words.forEach(function(w, k){ w.classList.toggle('is-on', k === a); }); }
    section.style.setProperty('--glow', ease(seg(p, .26, .95)).toFixed(3));
    section.style.setProperty('--tilt', (1 - ease(seg(p, .04, .6))).toFixed(3));
  }

  rebuild();
  var pl = autoplay('connected', host, 8200, render);
  rebuilders.push(function(){ rebuild(); pl.refresh(); });
}

/* ============================================================
   what intelligent assistance can take on: one source branching
   into five. Wide screens draw the tree; phones wake five nodes in turn.
   ============================================================ */
function initAssist(){
  var wrap = document.getElementById('assist');
  if(!wrap) return;
  var tree = document.getElementById('assistTree');
  var items = [].slice.call(wrap.querySelectorAll('.assist-list li'));
  var minis = { n:{} };
  items.forEach(function(li, i){
    var slot = li.querySelector('.mini');
    if(!slot) return;
    slot.innerHTML = '<svg viewBox="-16 -16 32 32" aria-hidden="true" focusable="false">' + nodeMarkup({ id:'m' + i, kind:'in', x:0, y:0 }) + '</svg>';
    var el = slot.querySelector('.nd');
    minis.n['m' + i] = { el:el, pos:el.firstChild, s:'hidden', dx:0, dy:0, k:-1 };
  });
  var ORDER = [2, 1, 3, 0, 4];               /* the branches reach the middle first, then spread outward */
  var sys = null, wide = false;

  function rebuild(){
    wide = !mqSmall.matches && items.length === 5 && !!tree;
    if(!wide){ sys = null; if(tree) tree.innerHTML = ''; return; }
    var W = Math.round(wrap.clientWidth);
    var x = items.map(function(li){ return Math.round(li.offsetLeft + li.offsetWidth / 2); });
    var c = x[2], Y = 56, N = 100;            /* the rail, and the row of nodes */
    sys = build(tree, {
      vb: '0 0 ' + W + ' 112', fit: 'xMinYMin meet',
      nodes: [
        { id:'hub', kind:'hub', r:13, x:c, y:18 },
        { id:'jc', kind:'join', x:c, y:Y }, { id:'j1', kind:'join', x:x[1], y:Y }, { id:'j3', kind:'join', x:x[3], y:Y },
        { id:'n0', kind:'out', x:x[0], y:N }, { id:'n1', kind:'out', x:x[1], y:N }, { id:'n2', kind:'out', x:x[2], y:N },
        { id:'n3', kind:'out', x:x[3], y:N }, { id:'n4', kind:'out', x:x[4], y:N }
      ],
      paths: [
        { id:'t', cls:'pth-out', d:'M' + c + ' 32 V' + (Y - 5) },
        { id:'p2', cls:'pth-out', d:'M' + c + ' ' + (Y + 5) + ' V' + (N - 8) },
        { id:'l', cls:'pth-out', d:'M' + (c - 5) + ' ' + Y + ' H' + (x[1] + 5) },
        { id:'r', cls:'pth-out', d:'M' + (c + 5) + ' ' + Y + ' H' + (x[3] - 5) },
        { id:'p1', cls:'pth-out', d:'M' + x[1] + ' ' + (Y + 5) + ' V' + (N - 8) },
        { id:'p3', cls:'pth-out', d:'M' + x[3] + ' ' + (Y + 5) + ' V' + (N - 8) },
        { id:'p0', cls:'pth-out', d:'M' + (x[1] - 5) + ' ' + Y + ' H' + (x[0] + 16) + ' Q' + x[0] + ' ' + Y + ' ' + x[0] + ' ' + (Y + 16) + ' V' + (N - 8) },
        { id:'p4', cls:'pth-out', d:'M' + (x[3] + 5) + ' ' + Y + ' H' + (x[4] - 16) + ' Q' + x[4] + ' ' + Y + ' ' + x[4] + ' ' + (Y + 16) + ' V' + (N - 8) }
      ]
    });
  }

  function render(p){
    var i, at;
    if(wide && sys){
      state(sys, 'hub', p < .03 ? 'hidden' : p < .1 ? 'dormant' : p < .9 ? 'processing' : 'complete');
      draw(sys, 't', ease(seg(p, .1, .2)));
      state(sys, 'jc', p < .19 ? 'hidden' : 'active');
      draw(sys, 'p2', ease(seg(p, .2, .32)));
      draw(sys, 'l', ease(seg(p, .2, .36)));
      draw(sys, 'r', ease(seg(p, .2, .36)));
      state(sys, 'j1', p < .35 ? 'hidden' : 'active');
      state(sys, 'j3', p < .35 ? 'hidden' : 'active');
      draw(sys, 'p1', ease(seg(p, .36, .48)));
      draw(sys, 'p3', ease(seg(p, .4, .52)));
      draw(sys, 'p0', ease(seg(p, .36, .62)));
      draw(sys, 'p4', ease(seg(p, .4, .66)));
      var reach = [.62, .48, .32, .52, .66];  /* when each branch arrives */
      for(i = 0; i < 5; i++){
        state(sys, 'n' + i, p < reach[i] - .14 ? 'hidden' : p < reach[i] ? 'dormant' : 'active');
        items[i].classList.toggle('is-on', p >= reach[i]);
      }
    } else {
      for(i = 0; i < items.length; i++){
        at = .08 + i * .17;
        state(minis, 'm' + i, p < at ? 'dormant' : 'active');
        items[i].classList.toggle('is-on', p >= at);
      }
    }
  }
  rebuild();
  var pl = autoplay('assist', wrap, 4400, render, { at:.3 });
  var again = function(){ rebuild(); pl.refresh(); };
  rebuilders.push(again);
  /* the tree is measured from the page, so it is drawn again when the columns change width */
  var timer = 0;
  window.addEventListener('resize', function(){ clearTimeout(timer); timer = setTimeout(again, 150); });
}

/* ============================================================
   human control
   prepared work arrives at the checkpoint and waits. The page then
   presses Approve itself, and the system continues.
   ============================================================ */
function initControl(){
  var section = document.getElementById('control');
  var host = document.getElementById('hcSystem');
  if(!section || !host) return;
  var stages = {};
  [].forEach.call(section.querySelectorAll('.stage'), function(el){ stages[el.getAttribute('data-stage')] = el; });
  var HC = {
    wide: {
      vb: '0 34 1200 232',
      nodes: [
        { id:'a1', kind:'in', x:200, y:70, label:T.replyDraft, la:'l', brief:true, dx:-26, dy:-10 },
        { id:'a2', kind:'in', x:200, y:150, label:T.invoiceReady, la:'l', brief:true, dx:20, dy:8 },
        { id:'a3', kind:'in', x:200, y:230, label:T.bookingAsk, la:'l', brief:true, dx:-14, dy:16 },
        { id:'j1', kind:'join', x:300, y:150 },
        { id:'gate', kind:'gate', x:600, y:150 },
        { id:'j2', kind:'join', x:900, y:150 },
        { id:'b1', kind:'out', x:1000, y:70, label:T.replySent, la:'r', brief:true },
        { id:'b2', kind:'out', x:1000, y:150, label:T.invoiceSent, la:'r', brief:true },
        { id:'b3', kind:'out', x:1000, y:230, label:T.bookingOk, la:'r', brief:true }
      ],
      paths: [
        { id:'p-a1', d:'M208 70 H284 Q300 70 300 86 V145' },
        { id:'p-a2', d:'M208 150 H295' },
        { id:'p-a3', d:'M208 230 H284 Q300 230 300 214 V155' },
        { id:'p-t1', d:'M305 150 H586' },
        { id:'p-t2', cls:'pth-out pth-next', d:'M614 150 H895' },
        { id:'p-b1', cls:'pth-out pth-next', d:'M900 145 V86 Q900 70 916 70 H992' },
        { id:'p-b2', cls:'pth-out pth-next', d:'M905 150 H992' },
        { id:'p-b3', cls:'pth-out pth-next', d:'M900 155 V214 Q900 230 916 230 H992' }
      ]
    },
    tall: {
      vb: '0 0 100 520',
      fit: 'xMinYMid meet',
      nodes: [
        { id:'a1', kind:'in', x:20, y:36, dx:-5, dy:-6 },
        { id:'a2', kind:'in', x:50, y:36, dx:0, dy:-10 },
        { id:'a3', kind:'in', x:80, y:36, dx:6, dy:-5 },
        { id:'j1', kind:'join', x:50, y:96 },
        { id:'gate', kind:'gate', x:50, y:244 },
        { id:'j2', kind:'join', x:50, y:404 },
        { id:'b1', kind:'out', x:20, y:470 },
        { id:'b2', kind:'out', x:50, y:470 },
        { id:'b3', kind:'out', x:80, y:470 }
      ],
      paths: [
        { id:'p-a1', d:'M20 44 V80 Q20 96 36 96 H45' },
        { id:'p-a2', d:'M50 44 V91' },
        { id:'p-a3', d:'M80 44 V80 Q80 96 64 96 H55' },
        { id:'p-t1', d:'M50 101 V230' },
        { id:'p-t2', cls:'pth-out pth-next', d:'M50 258 V399' },
        { id:'p-b1', cls:'pth-out pth-next', d:'M45 404 H36 Q20 404 20 420 V462' },
        { id:'p-b2', cls:'pth-out pth-next', d:'M50 409 V462' },
        { id:'p-b3', cls:'pth-out pth-next', d:'M55 404 H64 Q80 404 80 420 V462' }
      ]
    }
  };
  var sys, approved = false, waiting = null, timers = [];
  var REACH = .47;                            /* the work arrives at the checkpoint */

  function setStage(name, mode){
    var el = stages[name];
    if(!el) return;
    el.classList.toggle('is-on', mode === 'on');
    el.classList.toggle('is-done', mode === 'done');
  }
  function later(ms, fn){ timers.push(setTimeout(fn, ms)); }
  function clearTimers(){ timers.forEach(clearTimeout); timers = []; }

  /* everything up to the checkpoint */
  function scrub(p){
    var i, id, a, s, at = p >= REACH;
    for(i = 0; i < 3; i++){
      id = 'a' + (i + 1);
      a = .05 + i * .04;
      offset(sys, id, 1 - ease(seg(p, .06 + i * .03, .2 + i * .03)));
      draw(sys, 'p-' + id, ease(seg(p, .2 + i * .02, .33 + i * .01)));
      s = p < a ? 'dormant' : p < .42 ? 'active' : 'complete';
      state(sys, id, s);
      quiet(sys, 'p-' + id, s === 'complete');
      state(sys, 'b' + (i + 1), 'dormant');
      draw(sys, 'p-b' + (i + 1), 0);
    }
    state(sys, 'j1', p < .31 ? 'hidden' : at ? 'complete' : 'active');
    draw(sys, 'p-t1', ease(seg(p, .32, REACH)));
    quiet(sys, 'p-t1', false);
    state(sys, 'gate', at ? 'decision' : 'dormant');
    state(sys, 'j2', 'hidden');
    draw(sys, 'p-t2', 0);
    setStage('prepare', at ? 'done' : 'on');
    setStage('decide', at ? 'on' : '');
    setStage('continue', '');
    section.style.setProperty('--glow', ease(seg(p, .1, REACH)).toFixed(3));
    if(at !== waiting){ waiting = at; section.classList.toggle('is-waiting', at); }
  }

  /* after approval: the amber resolves, the path continues, the next nodes wake one at a time */
  function showApproved(instant){
    var gap = instant ? 0 : 1;
    approved = true;
    section.classList.remove('is-waiting', 'is-pressed');
    section.classList.add('is-approved');
    section.classList.toggle('is-timed', !instant);
    for(var i = 1; i <= 3; i++){ state(sys, 'a' + i, 'complete'); offset(sys, 'a' + i, 0); draw(sys, 'p-a' + i, 1); quiet(sys, 'p-a' + i, true); }
    state(sys, 'j1', 'complete'); draw(sys, 'p-t1', 1); quiet(sys, 'p-t1', true);
    state(sys, 'gate', 'complete');
    setStage('prepare', 'done'); setStage('decide', 'done');
    var step = function(ms, fn){ if(instant) fn(); else later(ms, fn); };
    step(150 * gap, function(){ draw(sys, 'p-t2', 1); });
    step(700 * gap, function(){ state(sys, 'j2', 'active'); setStage('continue', 'on'); });
    [1, 2, 3].forEach(function(k){
      step((800 + k * 150) * gap, function(){ draw(sys, 'p-b' + k, 1); });
      step((1250 + k * 230) * gap, function(){ state(sys, 'b' + k, 'active'); });
    });
    section.style.setProperty('--glow', '1');
  }
  function clearApproved(){
    clearTimers();
    approved = false;
    waiting = null;
    section.classList.remove('is-approved', 'is-timed', 'is-pressed', 'is-waiting');
  }

  function rebuild(){ sys = build(host, mqSmall.matches ? HC.tall : HC.wide); waiting = null; }
  rebuild();

  var pl = autoplay('control', host, 3600, function(q){ if(!approved) scrub(q * (REACH + .03)); }, {
    /* the checkpoint holds for a moment, then the page presses Approve */
    end: function(){
      if(FLAT) return;
      later(1500, function(){ section.classList.add('is-pressed'); });
      later(1950, function(){ showApproved(false); });
    },
    reset: clearApproved,
    flat: function(){ showApproved(true); },
    seek: function(p){
      clearApproved();
      scrub(Math.min(1, p / .6) * (REACH + .03));
      if(p >= .7 && p < .85) section.classList.add('is-pressed');
      if(p >= .85) showApproved(true);
    }
  });
  rebuilders.push(function(){
    var was = approved;
    rebuild();
    if(was){ clearTimers(); showApproved(true); } else pl.refresh();
  });
}

/* ============================================================
   a real example: a photo of a card, a question, two address books
   ============================================================ */
function initExample(){
  var host = document.getElementById('exSystem');
  if(!host) return;
  var EX = {
    wide: {
      vb: '0 0 420 170',
      nodes: [
        { id:'e0', kind:'in', x:14, y:85 },
        { id:'gate', kind:'gate', x:120, y:85, label:T.asks, la:'b', brief:true },
        { id:'j', kind:'join', x:184, y:85 },
        { id:'g1', kind:'out', x:236, y:45, label:T.google, la:'r' },
        { id:'g2', kind:'out', x:236, y:125, label:T.outlook, la:'r' }
      ],
      paths: [
        { id:'p-e', d:'M22 85 H106' },
        { id:'p-t', cls:'pth-out', d:'M134 85 H179' },
        { id:'p-g1', cls:'pth-out', d:'M184 80 V61 Q184 45 200 45 H228' },
        { id:'p-g2', cls:'pth-out', d:'M184 90 V109 Q184 125 200 125 H228' }
      ]
    },
    tall: {
      vb: '0 0 360 200', fit: 'xMinYMin meet',
      nodes: [
        { id:'e0', kind:'in', x:66, y:12 },
        { id:'gate', kind:'gate', x:66, y:78, label:T.asks, la:'r', brief:true },
        { id:'j', kind:'join', x:66, y:136 },
        { id:'g1', kind:'out', x:156, y:136, label:T.google, la:'r' },
        { id:'g2', kind:'out', x:156, y:182, label:T.outlook, la:'r' }
      ],
      paths: [
        { id:'p-e', d:'M66 20 V64' },
        { id:'p-t', cls:'pth-out', d:'M66 92 V131' },
        { id:'p-g1', cls:'pth-out', d:'M71 136 H148' },
        { id:'p-g2', cls:'pth-out', d:'M66 141 V166 Q66 182 82 182 H148' }
      ]
    }
  };
  var sys;
  function rebuild(){ sys = build(host, mqSmall.matches ? EX.tall : EX.wide); }
  function render(p){
    state(sys, 'e0', p < .03 ? 'hidden' : p < .34 ? 'active' : 'complete');
    draw(sys, 'p-e', ease(seg(p, .08, .3)));
    quiet(sys, 'p-e', p >= .6);
    state(sys, 'gate', p < .31 ? 'dormant' : p < .6 ? 'decision' : 'complete');
    draw(sys, 'p-t', ease(seg(p, .62, .7)));
    state(sys, 'j', p < .69 ? 'hidden' : 'active');
    draw(sys, 'p-g1', ease(seg(p, .7, .8)));
    draw(sys, 'p-g2', ease(seg(p, .76, .86)));
    state(sys, 'g1', p < .69 ? 'hidden' : p < .8 ? 'dormant' : 'active');
    state(sys, 'g2', p < .75 ? 'hidden' : p < .86 ? 'dormant' : 'active');
  }
  rebuild();
  var pl = autoplay('example', host, 5200, render);
  rebuilders.push(function(){ rebuild(); pl.refresh(); });
}

/* ============================================================
   capacity calculator
   ============================================================ */
function initCalc(){
  var WORK_WEEKS = 46, WORK_WEEK = 40;
  var people  = document.getElementById('calcPeople');
  var minutes = document.getElementById('calcMinutes');
  var times   = document.getElementById('calcTimes');
  var share   = document.getElementById('calcShare');
  if(!people || !minutes || !times || !share) return;

  var fields = {
    savedWeek: document.getElementById('calcSavedWeek'),
    unit:      document.getElementById('calcUnit'),
    month:     document.getElementById('calcMonth'),
    monthUnit: document.getElementById('calcMonthUnit'),
    week:      document.getElementById('calcWeek'),
    weekUnit:  document.getElementById('calcWeekUnit'),
    saved:     document.getElementById('calcSaved'),
    savedWeeks:document.getElementById('calcSavedWeeks'),
    shareOut:  document.getElementById('calcShareOut'),
    live:      document.getElementById('calcLive')
  };

  /* Each number field has a slider partner. The slider covers the
     common range; the number field still accepts the full range,
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
  function fmt(n, dec){
    return n.toLocaleString(T.locale, { minimumFractionDigits:0, maximumFractionDigits:dec || 0 });
  }
  /* Small weekly figures keep one decimal, so 0.4 hours never reads as 0. */
  function weekDec(n){ return n < 10 ? 1 : 0; }
  function roundTo(n, dec){ var f = Math.pow(10, dec); return Math.round(n * f) / f; }
  function hours(n){ return n === 1 ? T.hour : T.hours; }
  function weeksLabel(h){
    var w = h / WORK_WEEK;
    if(w < 0.5) return T.weeksUnder;
    var n = Math.round(w);
    if(n <= 1) return T.weeksOne;
    return T.weeksMany(n);
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
    if(FLAT || from === to){ land(); return; }
    var t0 = null, D = 520;
    function step(ts){
      if(t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / D);
      var e = 1 - Math.pow(1 - k, 5);
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
    if(fields.unit) fields.unit.textContent = hours(shown);
    var dm = savedMonth < 10 ? 1 : 0;
    tween(fields.month, savedMonth, dm);
    if(fields.monthUnit) fields.monthUnit.textContent = hours(roundTo(savedMonth, dm));
    var dh = weekDec(hoursWeek);
    tween(fields.week, hoursWeek, dh);
    if(fields.weekUnit) fields.weekUnit.textContent = hours(roundTo(hoursWeek, dh));
    tween(fields.saved, savedYear, 0);
    if(fields.savedWeeks) fields.savedWeeks.textContent = weeksLabel(savedYear);
    if(fields.shareOut) fields.shareOut.textContent = Math.round(sh * 100) + '%';

    /* The eased digits are hidden from assistive tech; one settled
       sentence is announced once the visitor pauses. */
    if(fields.live){
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function(){
        fields.live.textContent = T.live(fmt(shown, dw), hours(shown), fmt(Math.round(savedYear), 0), weeksLabel(savedYear));
      }, 600);
    }
  }

  pairs.forEach(function(pair){
    if(pair.range){
      pair.range.addEventListener('input', function(){ pair.num.value = pair.range.value; fill(pair.range); compute(); });
      fill(pair.range);
    }
    pair.num.addEventListener('input', function(){
      if(pair.range){ pair.range.value = val(pair.num, pair.min, pair.max, pair.min); fill(pair.range); }
      compute();
    });
    /* Put a cleared or out-of-range entry back to a real value on leaving the field. */
    pair.num.addEventListener('blur', function(){ pair.num.value = val(pair.num, pair.min, pair.max, pair.min); });
  });
  share.addEventListener('input', function(){ fill(share); compute(); });
  fill(share);
  var form = document.getElementById('calcForm');
  if(form) form.addEventListener('submit', function(e){ e.preventDefault(); });
  compute();

  /* the result counts up once, the first time the visitor reaches it */
  var out = document.querySelector('.calc-out');
  if(out && !FLAT && !HOLD && 'IntersectionObserver' in window){
    var seen = new IntersectionObserver(function(entries){
      if(!entries[0].isIntersecting) return;
      seen.disconnect();
      [fields.savedWeek, fields.month, fields.week, fields.saved].forEach(function(n){ if(n) n._cur = 0; });
      compute();
    }, { threshold:.5 });
    seen.observe(out);
  }
}

function boot(){
  initHeader();
  initHero();
  initFriction();
  initConnected();
  initAssist();
  initControl();
  initCalc();
  initExample();
  var relayout = function(){ rebuilders.forEach(function(fn){ fn(); }); };
  if(mqSmall.addEventListener) mqSmall.addEventListener('change', relayout); else mqSmall.addListener(relayout);
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
