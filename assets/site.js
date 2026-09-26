/* ============================================================
   FIELD OFFICE v3 — small site-wide enhancements.
   Everything here is progressive: without JS the pages read fine.
   ============================================================ */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    // 1. Scroll reveals
    var items = document.querySelectorAll('[data-reveal]');
    if ('IntersectionObserver' in window && !calm) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      items.forEach(function (n) { io.observe(n); });
    } else {
      items.forEach(function (n) { n.classList.add('in'); });
    }

    // 2. Spotlight that follows the pointer on dossier cards
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.filecard');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    // 3. Make the ticker actually tick (duplicate once for a seamless loop)
    if (!calm) {
      document.querySelectorAll('.tickerbar').forEach(function (bar) {
        if (bar.querySelector('.track')) return;
        var track = document.createElement('div');
        track.className = 'track';
        while (bar.firstChild) track.appendChild(bar.firstChild);
        track.innerHTML += track.innerHTML;
        bar.appendChild(track);
        bar.classList.add('is-moving');
      });
    }

    // 4. Count-up for stat numbers marked data-count
    document.querySelectorAll('[data-count]').forEach(function (n) {
      var end = parseFloat(n.getAttribute('data-count'));
      var suffix = n.getAttribute('data-suffix') || '';
      if (calm || isNaN(end)) return;
      var started = false;
      var go = function () {
        if (started) return; started = true;
        var t0 = null, dur = 1100;
        (function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / dur);
          n.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suffix;
          if (k < 1) requestAnimationFrame(step);
        })(performance.now());
      };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { go(); o.disconnect(); } }).observe(n);
      } else go();
    });
  });
})();
