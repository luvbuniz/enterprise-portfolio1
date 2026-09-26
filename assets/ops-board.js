/* ============================================================
   OPS BOARD — the agent-team routing diagram.
   One component, two modes:
     data-mode="auto"         homepage hero; loops through sample tasks
     data-mode="interactive"  case-study demo; visitor picks the task
   Plain SVG + vanilla JS. Sample tasks only, no real data.
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var W = 640, H = 540, CX = 320, CY = 250;

  // Riley sits in the middle; specialists ring around; Amy holds the exit.
  var NODES = {
    riley:  { name: 'Riley',  role: 'Organizer' },
    ivy:    { name: 'Ivy',    role: 'Inbox' },
    quinn:  { name: 'Quinn',  role: 'Jobs' },
    social: { name: 'Social', role: 'Routines' },
    pip:    { name: 'Pip',    role: 'QA' },
    cobble: { name: 'Cobble', role: 'Dev' },
    cody:   { name: 'Cody',   role: 'Coding bridge' },
    reed:   { name: 'Reed',   role: 'Real estate' },
    amy:    { name: 'Amy',    role: 'Approves' }
  };
  var RING = ['ivy', 'quinn', 'social', 'cody', 'cobble', 'pip', 'reed'];
  RING.forEach(function (id, i) {
    var a = (-90 + i * (360 / RING.length)) * Math.PI / 180;
    NODES[id].x = CX + Math.cos(a) * 232;
    NODES[id].y = CY + Math.sin(a) * 176;
  });
  NODES.riley.x = CX; NODES.riley.y = CY;
  NODES.amy.x = CX; NODES.amy.y = H - 34;

  // Each task is a list of hops: [from, to, what happens]. The last hop always lands on Amy.
  var TASKS = [
    { id: 'closing', label: 'A closing date changed', hops: [
      ['ivy', 'riley', 'Ivy (Inbox) flags a closing email with a document deadline.'],
      ['riley', 'reed', 'Riley (Organizer) routes it to Reed (Real estate admin).'],
      ['reed', 'amy', 'Reed updates the closing tracker and drafts notes to the vendors.']
    ], gate: 'Amy approves the vendor emails before they send.' },
    { id: 'crash', label: 'A tester reported a crash', hops: [
      ['ivy', 'riley', 'Ivy (Inbox) spots the tester email and hands it up.'],
      ['riley', 'pip', 'Riley routes it to Pip (QA).'],
      ['pip', 'cobble', 'Pip reproduces it on a real phone and writes a screenshot-backed finding.'],
      ['cobble', 'pip', 'Cobble (Dev) turns it into a fix brief and a PR. Pip re-tests the branch.'],
      ['pip', 'amy', 'Pip confirms the fix works.']
    ], gate: 'Amy approves the merge. Nothing ships without her.' },
    { id: 'gig', label: 'New gig posted', hops: [
      ['quinn', 'riley', 'Quinn (Jobs) finds a good-fit gig and scores it.'],
      ['riley', 'quinn', 'Riley says it is a top pick: draft a proposal.'],
      ['quinn', 'amy', 'Quinn drafts a tailored proposal and logs it in the tracker.']
    ], gate: 'Amy decides whether to send it.' },
    { id: 'posts', label: "This week's posts", hops: [
      ['riley', 'social', 'Riley kicks off the weekly social routine.'],
      ['social', 'amy', 'The routine drafts the calendar, captions, and two cuts of each video.']
    ], gate: 'Nothing posts without Amy’s click.' },
    { id: 'code', label: 'A big coding task', hops: [
      ['riley', 'cody', 'Riley hands a larger build to Cody (Coding bridge).'],
      ['cody', 'cobble', 'Cody packages it for Claude or Codex and brings the PR back.'],
      ['cobble', 'pip', 'Cobble (Dev) reviews the PR. Pip (QA) tests it.'],
      ['pip', 'amy', 'Pip signs off on the test pass.']
    ], gate: 'Amy approves the merge.' }
  ];

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function Board(root) {
    this.root = root;
    this.mode = root.getAttribute('data-mode') || 'auto';
    this.running = 0;
    this.build();
  }

  Board.prototype.build = function () {
    var self = this, root = this.root;
    root.classList.add('ops');

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': root.id + '-t' });
    var title = el('title', { id: root.id + '-t' }, svg);
    title.textContent = 'Diagram: Riley the organizer agent in the center, seven specialist AI agents around it, and Amy as the approval step before anything leaves.';

    var defs = el('defs', {}, svg);
    var glow = el('radialGradient', { id: root.id + '-glow' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#E4C87E', 'stop-opacity': '.9' }, glow);
    el('stop', { offset: '100%', 'stop-color': '#E4C87E', 'stop-opacity': '0' }, glow);

    // faint orbit + spokes
    el('ellipse', { cx: CX, cy: CY, rx: 232, ry: 176, class: 'ops-orbit' }, svg);
    this.spokes = {};
    RING.forEach(function (id) {
      self.spokes[id] = el('line', { x1: CX, y1: CY, x2: NODES[id].x, y2: NODES[id].y, class: 'ops-spoke' }, svg);
    });
    // the approval gate line
    el('line', { x1: CX, y1: CY + 176, x2: CX, y2: NODES.amy.y - 26, class: 'ops-spoke ops-spoke--gate' }, svg);

    this.hopLayer = el('g', {}, svg);

    this.nodeEls = {};
    Object.keys(NODES).forEach(function (id) {
      var n = NODES[id];
      var g = el('g', { class: 'ops-node' + (id === 'riley' ? ' ops-node--hub' : '') + (id === 'amy' ? ' ops-node--gate' : ''), transform: 'translate(' + n.x + ',' + n.y + ')' }, svg);
      if (id === 'amy') {
        el('rect', { x: -70, y: -24, width: 140, height: 48, rx: 2, class: 'ops-disc' }, g);
      } else {
        el('circle', { r: id === 'riley' ? 52 : 46, class: 'ops-disc' }, g);
        el('circle', { r: id === 'riley' ? 45 : 40, class: 'ops-ring' }, g);
      }
      var t1 = el('text', { y: id === 'amy' ? -2 : -1, class: 'ops-name' }, g);
      t1.textContent = id === 'amy' ? '✋ Amy' : n.name;
      var t2 = el('text', { y: id === 'amy' ? 15 : 15, class: 'ops-role' }, g);
      t2.textContent = n.role.toUpperCase();
      self.nodeEls[id] = g;
    });

    this.dot = el('circle', { r: 16, fill: 'url(#' + root.id + '-glow)', class: 'ops-dot', opacity: 0 }, svg);
    this.dotCore = el('circle', { r: 5, class: 'ops-dotcore', opacity: 0 }, svg);

    var stage = document.createElement('div');
    stage.className = 'ops-stage';
    stage.appendChild(svg);
    root.appendChild(stage);

    // controls
    if (this.mode === 'interactive') {
      var row = document.createElement('div');
      row.className = 'chiprow ops-tasks';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'Pick a sample task');
      TASKS.forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chipbtn';
        b.textContent = t.label;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          row.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          self.play(t);
        });
        row.appendChild(b);
      });
      root.insertBefore(row, stage);
    }

    this.log = document.createElement('ol');
    this.log.className = 'ops-log';
    this.log.setAttribute('aria-live', 'polite');
    root.appendChild(this.log);

    if (this.mode === 'interactive') {
      var p = document.createElement('li');
      p.className = 'ops-log-hint';
      p.textContent = 'Pick a task above to watch who picks it up.';
      this.log.appendChild(p);
    }

    if (this.mode === 'auto') {
      this.cursor = 0;
      var go = function () {
        if (!self.visible) { self.timer = setTimeout(go, 800); return; }
        var t = TASKS[self.cursor++ % TASKS.length];
        self.play(t).then(function () { self.timer = setTimeout(go, 1800); });
      };
      this.visible = true;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }).observe(root);
      }
      setTimeout(go, 700);
    }
  };

  Board.prototype.reset = function () {
    var self = this;
    while (this.hopLayer.firstChild) this.hopLayer.removeChild(this.hopLayer.firstChild);
    Object.keys(this.nodeEls).forEach(function (id) { self.nodeEls[id].classList.remove('is-on', 'is-done'); });
    this.log.innerHTML = '';
  };

  Board.prototype.addLog = function (text, cls) {
    var li = document.createElement('li');
    li.className = 'wf-in' + (cls ? ' ' + cls : '');
    li.textContent = text;
    this.log.appendChild(li);
    if (this.mode === 'auto') {
      while (this.log.children.length > 4) this.log.removeChild(this.log.firstChild);
    }
    return li;
  };

  Board.prototype.travel = function (a, b, run) {
    var self = this, A = NODES[a], B = NODES[b];
    el('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: 'ops-hop' + (b === 'amy' ? ' ops-hop--gate' : '') }, this.hopLayer);
    return new Promise(function (resolve) {
      if (reduced()) { resolve(); return; }
      var dur = 900, t0 = null;
      self.dot.setAttribute('opacity', 1); self.dotCore.setAttribute('opacity', 1);
      function step(ts) {
        if (run !== self.running) { resolve(); return; }
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur);
        var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var x = A.x + (B.x - A.x) * e, y = A.y + (B.y - A.y) * e;
        self.dot.setAttribute('cx', x); self.dot.setAttribute('cy', y);
        self.dotCore.setAttribute('cx', x); self.dotCore.setAttribute('cy', y);
        if (k < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  };

  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduced() ? 0 : ms); }); }

  Board.prototype.play = function (task) {
    var self = this, run = ++this.running;
    this.reset();
    this.addLog('TASK · ' + task.label, 'ops-log-task');
    var chain = Promise.resolve();
    task.hops.forEach(function (h) {
      chain = chain.then(function () {
        if (run !== self.running) return;
        self.nodeEls[h[0]].classList.add('is-on');
        self.addLog(h[2]);
        return self.travel(h[0], h[1], run).then(function () {
          if (run !== self.running) return;
          self.nodeEls[h[0]].classList.remove('is-on');
          self.nodeEls[h[0]].classList.add('is-done');
          self.nodeEls[h[1]].classList.add('is-on');
          return wait(650);
        });
      });
    });
    return chain.then(function () {
      if (run !== self.running) return;
      self.dot.setAttribute('opacity', 0); self.dotCore.setAttribute('opacity', 0);
      var li = self.addLog('✋ ' + task.gate, 'ops-log-gate');
      if (self.mode === 'interactive') {
        return new Promise(function (resolve) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn btn--solid ops-approve';
          b.textContent = 'Approve (demo)';
          b.addEventListener('click', function () {
            b.remove();
            self.nodeEls.amy.classList.remove('is-on');
            self.nodeEls.amy.classList.add('is-done');
            self.addLog('✓ Approved. Only now does it leave the building.', 'ops-log-ok');
            resolve();
          });
          li.appendChild(document.createTextNode(' '));
          li.appendChild(b);
          b.focus({ preventScroll: true });
        });
      }
      return wait(1300).then(function () {
        if (run !== self.running) return;
        self.nodeEls.amy.classList.remove('is-on');
        self.nodeEls.amy.classList.add('is-done');
        self.addLog('✓ Approved by Amy. Now it goes out.', 'ops-log-ok');
      });
    });
  };

  function init() {
    document.querySelectorAll('[data-ops-board]').forEach(function (n) {
      if (!n.id) n.id = 'ops' + Math.random().toString(36).slice(2, 7);
      new Board(n);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
