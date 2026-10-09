/* ============================================================
   CASE STUDY SHOWCASE
   From 1024px the stacked case study becomes a slide gallery:
   one slide at a time, a tab per slide (arrow keys move between
   them), previous and next, and a count. Narrower screens, and
   any visitor without JavaScript, read the same content stacked.
   ============================================================ */
(function(){
'use strict';

var deck = document.querySelector('[data-deck]');
if(!deck) return;
var slides = Array.prototype.slice.call(deck.querySelectorAll('.cs-slide'));
var tabs = Array.prototype.slice.call(deck.querySelectorAll('.cs-tab'));
var tablist = deck.querySelector('.cs-tabs');
var prev = deck.querySelector('[data-deck-prev]');
var next = deck.querySelector('[data-deck-next]');
var count = deck.querySelector('.cs-count');
var wide = window.matchMedia('(min-width: 1024px)');
var current = 0;

function show(i, opts){
  opts = opts || {};
  current = Math.max(0, Math.min(slides.length - 1, i));
  slides.forEach(function(s, k){
    var on = k === current;
    s.classList.toggle('is-current', on);
    s.setAttribute('aria-hidden', on ? 'false' : 'true');
    if('inert' in s) s.inert = !on;
  });
  tabs.forEach(function(t, k){
    t.setAttribute('aria-selected', k === current ? 'true' : 'false');
    t.tabIndex = k === current ? 0 : -1;
  });
  count.textContent = (current + 1) + ' / ' + slides.length;
  prev.disabled = current === 0;
  next.disabled = current === slides.length - 1;
  if(opts.focusTab) tabs[current].focus();
  if(opts.remember && history.replaceState) history.replaceState(null, '', '#' + slides[current].id);
}

function enable(){
  deck.classList.add('is-deck');
  tablist.setAttribute('role', 'tablist');
  tabs.forEach(function(t, k){
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', slides[k].id);
  });
  slides.forEach(function(s, k){
    s.setAttribute('role', 'tabpanel');
    s.setAttribute('aria-labelledby', tabs[k].id);
  });
  var start = slides.findIndex(function(s){ return '#' + s.id === location.hash; });
  show(start < 0 ? current : start);
}

function disable(){
  deck.classList.remove('is-deck');
  slides.forEach(function(s){
    s.classList.remove('is-current');
    ['aria-hidden', 'role', 'aria-labelledby'].forEach(function(a){ s.removeAttribute(a); });
    if('inert' in s) s.inert = false;
  });
}

tabs.forEach(function(t, k){
  t.addEventListener('click', function(){ show(k, { remember: true }); });
});
tablist.addEventListener('keydown', function(e){
  var to = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: slides.length - 1 }[e.key];
  if(to === undefined) return;
  e.preventDefault();
  show(to, { focusTab: true, remember: true });
});
prev.addEventListener('click', function(){ show(current - 1, { remember: true }); });
next.addEventListener('click', function(){ show(current + 1, { remember: true }); });

/* a link to #slide-… opens that slide */
window.addEventListener('hashchange', function(){
  if(!deck.classList.contains('is-deck')) return;
  var i = slides.findIndex(function(s){ return '#' + s.id === location.hash; });
  if(i >= 0) show(i);
});

function apply(){ if(wide.matches) enable(); else disable(); }
if(wide.addEventListener) wide.addEventListener('change', apply); else wide.addListener(apply);
apply();
})();
