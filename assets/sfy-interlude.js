/*
 * Simplify interlude — storytelling scenes between the Stage 4 text beats and the
 * city reveal, built to behave like the rest of the site:
 *
 *  - same scroll: wheel ×35 / touch ×80 per event, exponential smoothing with the
 *    site's SCROLL_LERP (0.075 @60fps), measured in the same scroll units (one scene
 *    ≈ one Stage 4 beat = 9% of the stage);
 *  - one composition in frame: parts appear/disappear on scroll windows exactly like
 *    the WebGL text beats (4s outExpo in, 0.3s smoothstep out, direction-aware), with
 *    the same left-to-right sweep look, drawn with a CSS mask so text stays sharp;
 *  - the scene keeps moving: while the interlude plays, Stage 4 is driven from
 *    t=0.905 to 0.975 so the city keeps zooming and the HUD/ruler keep counting.
 *
 * Hooked from Stage 4's scrub(): window.__sfyS4(ctx, t).
 */
(function () {
  var ZIN = 0.905, ZOUT = 0.975, PRELOAD = 0.45;
  var IG = 35, LG = 80, FG = 500, SMOOTH = -Math.log(1 - 0.075) * 60;
  var APPEAR = 4, DISAPPEAR = 0.3, BEAT = 0.09, EDGE = 0.35;
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduced = mq('(prefers-reduced-motion: reduce)');
  var lite = mq('(pointer: coarse)') || window.innerWidth < 768;       // like the site's LITE_TEXT: no edge blur
  var H = 0, A = 1, V = 2, D = 3;

  var st = { built: false, open: false, running: false, prevT: null, scenes: [], pos: 0, target: 0, lastPos: 0, last: 0 };

  /* ---------------- copy ---------------- */
  var WORDS = ['Find', 'Read', 'Tailor', 'Rewrite', 'Register', 'Re-type', 'Repeat'];
  var SPOTS = [[16, 30], [72, 20], [36, 70], [86, 60], [22, 88], [58, 40], [66, 90]];
  var FAQ = [
    ['How does the agent tailor my CV?', 'It matches your profile to each job’s requirements and brings the relevant skills forward. Experience and skills are never invented.'],
    ['What’s in the 60 days?', 'The full campaign: search, fit checks, CV and cover letters, forms and applications, reply tracking, strategy and interview prep.'],
    ['Is it only for IT?', 'No. Mass Hiring covers support, sales, operations, data annotation, junior roles and graduate programs.'],
    ['How is my data handled?', 'The campaign uses your professional profile and CV. You see the processing terms before a real launch.'],
    ['Do you guarantee a job?', 'The employer decides. Simplify runs the search and prepares you for interviews, but doesn’t guarantee an offer.'],
    ['Target or Autonomous?', 'Target builds the search around one role or company. In Autonomous you set the criteria and the agent finds the roles.']
  ];
  function s(t) { return '<span class="sfy-s">' + t + '</span>'; }
  function chips(list) { return list.map(function (c) { return '<span class="sfy-chip">' + c + '</span>'; }).join(''); }

  var SCENES = [
    { id: 'intro', w: 1.2, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">Simplify · How it works</span>' +
        '<h2 class="sfy-h sfy-h--xl bt" data-delay=".12">One CV and a goal.<br>The agent does ' + s('the rest') + '.</h2>' +
        '<p class="sfy-p bt" data-delay=".3">It finds the roles, tailors your documents, applies for you and gets you ready for the interview.</p>' +
      '</div>' },

    { id: 'problem', w: 2.6, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">01 · The problem</span>' +
        '<h2 class="sfy-h sfy-h--m bt" data-delay=".12">Applying to one job takes 20 steps.<br>You do it 200 times.</h2>' +
        '<div class="sfy-field bt" data-delay=".24" style="align-self:stretch"><svg aria-hidden="true"><polyline class="sfy-tangle"/>' +
          '<line class="sfy-straight" x1="6%" y1="58%" x2="94%" y2="58%" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>' +
          WORDS.map(function (w) { return '<span class="sfy-word">' + w + '</span>'; }).join('') + '</div>' +
        '<h3 class="sfy-h sfy-h--m bt" data-a=".74">Simplify draws ' + s('one line') + ' through all of it.</h3>' +
      '</div>' },

    { id: 'step1', w: 1.4, html:
      '<div class="sfy-comp c-split"><div class="c-stack">' +
        '<span class="sfy-label bt">02 · Your career campaign — 01 / 03</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">One profile.<br>Every ' + s('opportunity') + '.</h2>' +
        '<p class="sfy-p bt" data-delay=".22">Upload your CV and name the job you want — role, country, salary. Your goal becomes the agent’s task.</p>' +
        '<span class="sfy-flow bt" data-delay=".3">CV → your goal</span>' +
      '</div><div class="c-stack">' +
        '<div class="sfy-card sfy-profile bt" data-delay=".2"><span class="sfy-label">Candidate profile</span><div class="cv">CV</div><div class="role">Data Analyst</div>' +
          '<div class="sfy-row">' + chips(['SQL', 'Python', 'Product analytics']) + '</div>' +
          '<ul><li>Product metrics analysis</li><li>Data visualization</li><li>Hypothesis testing</li></ul>' +
          '<div class="sfy-row">' + chips(['Remote', 'Europe', 'from $60K']) + '</div></div>' +
        '<div class="sfy-card sfy-note bt" data-delay=".38">Only your real experience. No invented skills.</div>' +
      '</div></div>' },

    { id: 'step2', w: 1.4, html:
      '<div class="sfy-comp c-split"><div class="c-stack">' +
        '<span class="sfy-label bt">02 · Your career campaign — 02 / 03</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">Thousands of roles.<br>Your ' + s('matches') + '.</h2>' +
        '<p class="sfy-p bt" data-delay=".22">The agent finds the roles that fit, tailors your CV and cover letter, fills the forms and sends a personal application to each.</p>' +
        '<span class="sfy-flow bt" data-delay=".3">Search → tailor → apply</span>' +
      '</div><div class="c-stack">' +
        '<div class="sfy-card sfy-job bt" data-delay=".2"><div><div class="t">Data Analyst</div><div class="m">Remote · Europe</div></div><div class="st"><b>91%</b>Match</div></div>' +
        '<div class="sfy-card sfy-job bt" data-delay=".32"><div><div class="t">Product Analyst</div><div class="m">Berlin · Relocation</div></div><div class="st">Tailoring CV</div></div>' +
        '<div class="sfy-card sfy-job bt" data-delay=".44"><div><div class="t">Data Analyst</div><div class="m">Remote · Global</div></div><div class="st">Ready to submit</div></div>' +
        '<div class="sfy-row bt" data-delay=".52">' + chips(['Greenhouse', 'Lever', 'Workday', 'Ashby']) + '</div>' +
      '</div></div>' },

    { id: 'step3', w: 1.4, html:
      '<div class="sfy-comp c-split"><div class="c-stack">' +
        '<span class="sfy-label bt">02 · Your career campaign — 03 / 03</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">Next step —<br>the ' + s('interview') + '.</h2>' +
        '<p class="sfy-p bt" data-delay=".22">Replies land in one place. When an invite arrives, Simplify helps you prepare for the conversation that can change everything.</p>' +
        '<span class="sfy-flow bt" data-delay=".3">Reply → prep → interview</span>' +
      '</div><div class="c-stack">' +
        '<div class="sfy-card sfy-invite bt" data-delay=".2"><span class="sfy-label">Interview invite · Data Analyst</span><div class="big">Let’s talk.</div><p class="sfy-p">The next step toward your new job.</p></div>' +
        '<ul class="sfy-card sfy-check bt" data-delay=".36"><li>Company breakdown</li><li>Typical questions</li><li>Answer practice</li><li>Personal tips</li></ul>' +
      '</div></div>' },

    { id: 'pipe', w: 1.8, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">03 · Track &amp; optimize</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">Every application,<br>one ' + s('pipeline') + '.</h2>' +
        '<p class="sfy-p bt" data-delay=".22">It tracks every reply, learns what gets answers and sharpens the strategy — more interviews, fewer dead ends.</p>' +
        '<div class="sfy-track bt" data-delay=".3" style="align-self:stretch"><div class="base"></div><div class="fill"></div>' +
          ['Found', 'Submitted', 'Interview', 'Offer'].map(function (n, i) { return '<div class="sfy-node" style="left:' + (i * 100 / 3) + '%"><i></i><span>' + n + '</span></div>'; }).join('') +
          '<div class="sfy-card sfy-mover">Data Analyst · Remote</div></div>' +
      '</div>' },

    { id: 'modes', w: 1.8, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">04 · Two modes</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">Choose your ' + s('mode') + '.</h2>' +
        '<span class="sfy-label bt sfy-modecount" data-delay=".18">01 / 02 · keep scrolling to compare</span>' +
        '<div class="sfy-modes" style="align-self:stretch">' +
          '<div class="sfy-card sfy-mode bt" data-delay=".24"><span class="sfy-label">Target mode</span><h3 class="sfy-h sfy-h--m">A precise goal.<br>Maximum focus.</h3>' +
            '<p class="sfy-p">The search is built around one specific company and role.</p><div class="ex"><em>For example</em>Product Manager at Revolut</div></div>' +
          '<div class="sfy-card sfy-mode bt" data-delay=".34"><span class="sfy-label">Autonomous mode</span><h3 class="sfy-h sfy-h--m">A wide search.<br>The best opportunities.</h3>' +
            '<p class="sfy-p">You set the criteria — title, geography, salary, format — and the agent finds the roles.</p><div class="ex"><em>For example</em>Data Analyst · Remote · from $60K</div></div>' +
        '</div>' +
      '</div>' },

    { id: 'mass', w: 1.3, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">05 · Mass hiring</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">High-volume hiring gets ' + s('its own') + ' route.</h2>' +
        '<p class="sfy-p bt" data-delay=".2">Not only IT: support, sales, operations, data annotation, junior roles and graduate programs have a dedicated flow.</p>' +
        '<div class="sfy-row bt" data-delay=".28">' + chips(['Support', 'Sales', 'Operations', 'Data annotation', 'Junior', 'Graduate programs']) + '</div>' +
        '<div class="sfy-route bt" data-delay=".36"><span class="sfy-card sfy-chip st">Application</span><span class="ar"><i></i></span><span class="sfy-card sfy-chip st">Assessment</span><span class="ar"><i></i></span><span class="sfy-card sfy-chip st">Hiring</span></div>' +
      '</div>' },

    { id: 'results', w: 1.3, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">06 · Our candidates’ results</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">Real people. ' + s('Real') + ' jobs.</h2>' +
        '<div class="sfy-stats">' +
          '<div class="sfy-card sfy-stat bt" data-delay=".18"><b data-count="120">0</b><span>people already hired</span></div>' +
          '<div class="sfy-card sfy-stat bt" data-delay=".26"><b data-count="5167">0</b><span>applications processed</span></div>' +
          '<div class="sfy-card sfy-stat bt" data-delay=".34"><b data-count="500" data-suffix="+">0</b><span>interview invites</span></div>' +
          '<div class="sfy-card sfy-stat bt" data-delay=".42"><b data-count="700" data-suffix="+">0</b><span>assessment invites</span></div>' +
        '</div>' +
        '<p class="sfy-fine bt" data-delay=".5">Project data. Some candidates are still in hiring processes — not a promise of an individual result.</p>' +
      '</div>' },

    { id: 'pricing', w: 1.5, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">07 · Transparent terms</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">60 days. One career ' + s('goal') + '.</h2>' +
        '<p class="sfy-p bt" data-delay=".18">You’re not buying applications. You’re buying a campaign.</p>' +
        '<div class="sfy-plans">' + plan('Local / CIS', '29 990 ₸', 'For job search in Kazakhstan and the CIS.', '.26') + plan('International', '49 990 ₸', 'For international remote roles and relocation.', '.34') + '</div>' +
        '<span class="sfy-label bt" data-delay=".44">Search · CV &amp; cover letters · applications · reply tracking · strategy · interview prep</span>' +
      '</div>' },

    { id: 'faq', w: 2.4, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">08 · FAQ</span>' +
        '<h2 class="sfy-h sfy-h--l bt" data-delay=".1">Questions, ' + s('answered') + '.</h2>' +
        '<div class="sfy-qa-stage" style="align-self:stretch">' +
          FAQ.map(function (qa, i) {
            var a = 0.04 + i * 0.16, d = 0.04 + (i + 1) * 0.16;
            return '<div class="sfy-qa bt" data-a="' + a.toFixed(2) + '" data-d="' + (i === FAQ.length - 1 ? 1 : d).toFixed(2) + '" data-delay="' + (i ? 0 : 0.2) + '"><div class="q">' + qa[0] + '</div><div class="a">' + qa[1] + '</div></div>';
          }).join('') +
        '</div>' +
        '<span class="sfy-label bt sfy-qa-count" data-delay=".2">01 / 06</span>' +
      '</div>' },

    { id: 'final', w: 1.3, html:
      '<div class="sfy-comp c-center">' +
        '<span class="sfy-label bt">Your goal. Your next step.</span>' +
        '<h2 class="sfy-h sfy-h--xl bt" data-delay=".12">You bring the goal.<br>We bring the ' + s('interviews') + '.</h2>' +
        '<button class="sfy-cta bt" type="button" data-cta data-delay=".3">Start your campaign <span aria-hidden="true">→</span></button>' +
        '<span class="sfy-label bt" data-delay=".42">Keep scrolling ↓</span>' +
      '</div>' }
  ];
  function plan(name, price, desc, d) {
    return '<div class="sfy-card sfy-plan bt" data-delay="' + d + '"><span class="sfy-label">Full campaign · ' + name + '</span>' +
      '<div class="amt">' + price + '<small>/ 60 days</small></div><p class="sfy-p">' + desc + '</p>' +
      '<button class="sfy-cta" type="button" data-cta>Choose ' + name + '</button></div>';
  }

  /* ---------------- helpers ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function k(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function sstep(e) { return e * e * (3 - 2 * e); }
  function outExpo(e) { return e >= 1 ? 1 : 1 - Math.pow(2, -10 * e); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------------- build ---------------- */
  function build() {
    if (st.built) return;
    st.built = true;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/sfy-interlude.css?v=202609281128'; document.head.appendChild(l);
    var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap'; document.head.appendChild(f);

    var root = document.createElement('div');
    root.id = 'sfy-interlude'; root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'How Simplify works'); root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<div class="sfy-veil"></div>' +
      SCENES.map(function (sc) { return '<section class="sfy-scene" data-scene="' + sc.id + '">' + sc.html + '</section>'; }).join('');
    var canvas = document.getElementById('webgl');
    if (canvas && canvas.nextSibling) canvas.parentNode.insertBefore(root, canvas.nextSibling); else document.body.appendChild(root);
    st.root = root;
    st.veil = root.querySelector('.sfy-veil'); st.veil.style.transition = 'none';   // driven per frame

    st.scenes = SCENES.map(function (sc) {
      var el = root.querySelector('[data-scene="' + sc.id + '"]');
      return {
        id: sc.id, w: sc.w, el: el, a: 0, b: 0,
        parts: [].map.call(el.querySelectorAll('.bt'), function (p) {
          return { el: p, a: +(p.getAttribute('data-a') || 0), d: +(p.getAttribute('data-d') || 1), delay: +(p.getAttribute('data-delay') || 0),
            state: H, u: 0, uFrom: 0, t: 0, lastU: -1, fid: null, count: p.querySelector('[data-count]') };
        })
      };
    });
    [].forEach.call(root.querySelectorAll('[data-cta]'), function (b) { b.addEventListener('click', startCampaign); });

    // input: same mapping as the site's scroll manager; only while open
    window.addEventListener('wheel', function (e) {
      if (!st.open) return;
      move(clamp(e.deltaY, -FG, FG) * IG);
    }, { capture: true, passive: true });
    var ty = null;
    window.addEventListener('touchstart', function (e) { if (st.open && e.touches[0]) ty = e.touches[0].clientY; }, { capture: true, passive: true });
    window.addEventListener('touchmove', function (e) {
      if (!st.open || ty == null || e.touches.length !== 1) return;
      var y = e.touches[0].clientY, dy = ty - y; ty = y;
      move(clamp(dy, -FG, FG) * LG);
    }, { capture: true, passive: true });
    window.addEventListener('keydown', function (e) {
      if (!st.open) return;
      var tg = e.target, tag = tg && tg.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (tg && tg.isContentEditable)) return;
      var step = { ArrowDown: 1, PageDown: 3, ' ': 3, ArrowUp: -1, PageUp: -3 }[e.key];
      if (step) move(step * 100 * IG);
    }, true);
  }

  function layout() {
    st.unit = BEAT * st.len;
    var acc = 0;
    st.scenes.forEach(function (sc) { sc.a = acc; acc += sc.w * st.unit; sc.b = acc; });
    st.total = acc;
  }

  function move(delta) {
    var lo = -EDGE * st.unit, hi = st.total + EDGE * st.unit;
    st.target = clamp(st.target + delta, lo * 1.01, hi * 1.01);
    if (st.target >= hi) close('down');
    else if (st.target <= lo) close('up');
  }

  /* ---------------- beat reveal (SVG port of the site's text shader) ---------------- */
  // Reveal = a soft left-to-right sweep drawn with a CSS mask. Unlike an SVG filter
  // (which Chrome rasterises at 1x and blurs), a mask keeps the text at full device
  // resolution, so every frame of the reveal is as sharp as the rest of the page.
  var SWEEP = 34;                                              // soft edge width, % of the element
  function setMask(s, v) { s.webkitMaskImage = v; s.maskImage = v; }
  function apply(p) {
    var u = p.u, s = p.el.style;
    var x = Math.min(1, u * 1.3) * (100 + SWEEP) - SWEEP;       // shader: effectiveProgress = uProgress * 1.3
    var mode = u <= 0.001 ? 0 : reduced ? 3 : x >= 100 ? 2 : 1;  // hidden | revealing | shown | reduced-motion
    if (mode === p.mode && (mode !== 1 || Math.abs(u - p.lastU) < 0.002)) return;
    p.mode = mode; p.lastU = u;
    if (mode === 0) { s.visibility = 'hidden'; s.opacity = ''; setMask(s, ''); return; }
    s.visibility = 'visible';
    if (mode === 3) { setMask(s, ''); s.opacity = u.toFixed(3); return; }
    if (mode === 2) { setMask(s, ''); s.opacity = ''; return; }
    s.opacity = Math.min(1, u * 4).toFixed(3);
    setMask(s, 'linear-gradient(90deg,#000 ' + x.toFixed(2) + '%,rgba(0,0,0,0) ' + (x + SWEEP).toFixed(2) + '%)');
  }
  function startA(p) {
    p.state = A; p.uFrom = p.u;
    p.t = p.u > 0 ? 0 : -p.delay;
    if (p.count && p.u === 0) setTimeout(function () { countUp(p.count); }, (p.delay + 0.15) * 1000);
  }
  function startD(p) { p.state = D; p.uFrom = p.u; p.t = 0; }
  function step(p, dt) {
    var dur = reduced ? 0.35 : APPEAR;
    if (p.state === A) {
      p.t += dt;
      var e = Math.max(0, p.t) / dur;
      p.u = p.uFrom + (1 - p.uFrom) * outExpo(Math.min(1, e));
      if (e >= 1) { p.state = V; p.u = 1; }
    } else if (p.state === D) {
      p.t += dt;
      var e2 = Math.min(1, p.t / DISAPPEAR);
      p.u = p.uFrom * (1 - sstep(e2));
      if (e2 >= 1) { p.state = H; p.u = 0; }
    }
  }
  // same trigger rules as the site's text layout (direction-aware)
  function trig(p, pos, s, e, fwd) {
    if (fwd) {
      if (p.state === H && pos >= s && pos < e) startA(p);
      else if ((p.state === V || p.state === A) && pos >= e) startD(p);
    } else {
      if ((p.state === H || p.state === D) && pos < e && pos >= s) startA(p);
      else if (p.state !== H && p.state !== D && pos < s) startD(p);
    }
  }
  function countUp(el) {
    var to = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '', t0 = performance.now();
    (function tick(now) {
      var t = clamp((now - t0) / 1600, 0, 1);
      el.textContent = String(Math.round(to * ease(t))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + suf;
      if (t < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------------- scrubbed motion inside scenes ---------------- */
  function scrub(sc, l) {
    var el = sc.el;
    if (sc.id === 'problem') {
      var field = el.querySelector('.sfy-field'), W = field.clientWidth, Hh = field.clientHeight;
      var words = el.querySelectorAll('.sfy-word'), pts = [];
      var gather = ease(k(l, 0.42, 0.72));
      var maxW = 1; for (var i = 0; i < words.length; i++) maxW = Math.max(maxW, words[i].offsetWidth);
      var gs = Math.min(0.84, (W * 0.8 / 6) * 0.9 / maxW);
      for (var j = 0; j < words.length; j++) {
        var sx = SPOTS[j][0], sy = SPOTS[j][1], tx = 10 + j * (80 / 6), tyy = 58;
        var w = words[j].style;
        w.left = (sx + (tx - sx) * gather) + '%'; w.top = (sy + (tyy - sy) * gather) + '%';
        w.transform = 'translate(-50%,-' + (50 + 46 * gather).toFixed(1) + '%) scale(' + (1 - (1 - gs) * gather).toFixed(3) + ')';
        w.opacity = (1 - 0.45 * k(l, 0.7, 0.9)).toFixed(3);
        pts.push((sx / 100 * W).toFixed(1) + ',' + (sy / 100 * Hh).toFixed(1));
      }
      var tg = el.querySelector('.sfy-tangle');
      tg.setAttribute('points', pts.concat([pts[0], pts[3], pts[5], pts[1], pts[6], pts[2]]).join(' '));
      tg.style.opacity = (1 - k(l, 0.3, 0.5)).toFixed(3);
      el.querySelector('.sfy-straight').style.strokeDashoffset = (1 - ease(k(l, 0.3, 0.62))).toFixed(4);
    } else if (sc.id === 'pipe') {
      var q = ease(k(l, 0.22, 0.88));
      el.querySelector('.sfy-track').style.setProperty('--p', q.toFixed(4));
      [].forEach.call(el.querySelectorAll('.sfy-node'), function (n, i) { n.classList.toggle('on', q >= i / 3 - 0.001); });
      var mv = el.querySelector('.sfy-mover'); mv.style.left = (q * 100) + '%'; mv.style.transform = 'translateX(' + (-q * 100).toFixed(2) + '%)';
    } else if (sc.id === 'modes') {
      var second = l >= 0.55;
      [].forEach.call(el.querySelectorAll('.sfy-mode'), function (m, i) { var on = (i === 1) === second; m.classList.toggle('hi', on); m.classList.toggle('dim', !on); });
      el.querySelector('.sfy-modecount').textContent = (second ? '02' : '01') + ' / 02 · keep scrolling to compare';
    } else if (sc.id === 'mass') {
      var ars = el.querySelectorAll('.sfy-route .ar i');
      if (ars[0]) ars[0].style.setProperty('--k', ease(k(l, 0.25, 0.5)).toFixed(3));
      if (ars[1]) ars[1].style.setProperty('--k', ease(k(l, 0.42, 0.68)).toFixed(3));
    } else if (sc.id === 'faq') {
      var idx = clamp(Math.floor((l - 0.04) / 0.16), 0, 5);
      el.querySelector('.sfy-qa-count').textContent = '0' + (idx + 1) + ' / 06';
    }
  }

  /* ---------------- one continuous flight through the clouds ----------------
   * The site's cloud layer flies a deep field of clouds at the camera as its progress
   * goes 0 -> 0.9, then fades the whole field (0.9 -> 1) to reveal the city. Here the
   * whole of Stage 4 — the text beats AND the interlude — becomes ONE uninterrupted
   * flight: the beats cover the first part of the field, the interlude keeps flying
   * through the rest, and the field only clears into the city after the last scene.
   * Pure function of the stage progress t (which the interlude drives), so it is
   * continuous and works in both scroll directions. */
  var TOTAL_W = SCENES.reduce(function (a, sc) { return a + sc.w; }, 0);
  var QB = (ZIN / BEAT) / (ZIN / BEAT + TOTAL_W);        // share of the flight spent on the beats (uniform speed)
  function cloudProgress(t) {
    if (t <= ZIN) return (t / ZIN) * QB * 0.9;                                  // beats
    if (t <= ZOUT) return (QB + (1 - QB) * (t - ZIN) / (ZOUT - ZIN)) * 0.9;     // interlude
    return 0.9 + 0.1 * k(t, ZOUT, 0.99);                                        // field clears -> city
  }
  // During the interlude the field is made endless: the cloud layer wraps each cloud's
  // depth over the invisible range (-62 .. -0.3), so a cloud that has flown through the
  // camera re-enters far away and keeps coming. _sfyZ is the total flight distance; at
  // t = ZIN it equals the layer's own offset, so the hand-over is seamless both ways.
  var CS = 30, DIST = 48;                                 // layer's z travel; distance flown across the interlude
  var Z0 = CS * sstep(QB * 0.9);
  window.__sfyCloudP = function (layer, stageP) {
    layer._sfyZ = stageP > ZIN ? Z0 + DIST * (stageP - ZIN) / (ZOUT - ZIN) : null;
    return cloudProgress(stageP);
  };
  window.__sfyCloudPost = null;

  /* ---------------- loop ---------------- */
  function run() {
    if (st.running) return;
    st.running = true; st.last = performance.now();
    requestAnimationFrame(frame);
  }
  function frame(now) {
    var dt = Math.min(0.05, Math.max(0, (now - st.last) / 1000)); st.last = now;
    var sm = st.sm;
    if (st.open) {
      // the timeline re-applied a clamp: a resize (bounds scale with viewport height)
      // keeps us in Stage 4 -> rescale and carry on; any other segment -> leave quietly
      if (sm && (sm._scrollClampMin !== st.hold || sm._scrollClampMax !== st.hold)) {
        var tl = sm._activeStage, seg = tl && tl.segments && tl.segments[tl._activeIndex];
        if (seg && seg.id === 'stage4' && sm._scrollClampMax > sm._scrollClampMin) rebase(sm._scrollClampMin, sm._scrollClampMax);
        else abort();
      }
      if (st.open) {
        st.pos += (st.target - st.pos) * (1 - Math.exp(-SMOOTH * dt));
        if (Math.abs(st.target - st.pos) < 0.5) st.pos = st.target;
        holdAt(st.min + st.len * (ZIN + (ZOUT - ZIN) * clamp(st.pos / st.total, 0, 1)));
      }
    }
    var fwd = st.pos >= st.lastPos; st.lastPos = st.pos;
    // veil: fades in/out with the interlude and parts for the cloud passes
    st.veilOn = (st.veilOn || 0) + ((st.open ? 1 : 0) - (st.veilOn || 0)) * (1 - Math.exp(-3.2 * dt));
    var vo = st.veilOn;
    if (Math.abs(vo - (st.veilLast || 0)) > 0.002) { st.veil.style.opacity = vo.toFixed(3); st.veilLast = vo; }
    var active = st.veilOn > 0.01;
    st.scenes.forEach(function (sc) {
      var span = sc.b - sc.a, vis = false;
      sc.parts.forEach(function (p) {
        if (st.open) trig(p, st.pos, sc.a + p.a * span, sc.a + p.d * span, fwd);
        step(p, dt); apply(p);
        if (p.state !== H) { vis = true; active = true; }
      });
      if (vis) scrub(sc, clamp((st.pos - sc.a) / span, 0, 1));
    });
    if (st.open || active) requestAnimationFrame(frame);
    else { st.running = false; st.root.classList.remove('is-live'); st.root.setAttribute('aria-hidden', 'true'); }
  }
  function rebase(min, max) {
    var len = max - min, r = len / st.len;
    st.pos *= r; st.target *= r; st.lastPos *= r;
    st.min = min; st.max = max; st.len = len;
    layout();
  }
  // pin the 3D scroll to a position through the site's own clamp (input can't move it)
  function holdAt(x) {
    var sm = st.sm; st.hold = x;
    sm._scrollClampMin = x; sm._scrollClampMax = x; sm.targetScrollPos = x;
  }

  /* ---------------- open / close ---------------- */
  function open(ctx, where) {
    build();
    var sm = ctx.scrollManager;
    if (!sm || sm._scrollClampMin == null || sm._scrollClampMax == null) return;
    st.ctx = ctx; st.sm = sm; st.min = sm._scrollClampMin; st.max = sm._scrollClampMax; st.len = st.max - st.min;
    if (!(st.len > 0)) return;
    layout();
    st.pos = st.target = where === 'end' ? st.total - 1 : 0; st.lastPos = st.pos;
    holdAt(st.min + st.len * (where === 'end' ? ZOUT : ZIN));
    var hud = ctx.hudStatusController; if (hud && hud.setIdleSuppressed) hud.setIdleSuppressed(true);
    st.open = true;
    st.root.classList.add('is-live', 'is-open'); st.root.setAttribute('aria-hidden', 'false');
    run();
  }
  function release(t) {
    var sm = st.sm; if (!sm) return;
    sm._scrollClampMin = st.min; sm._scrollClampMax = st.max;       // hand the stage its own bounds back
    if (t != null) sm.targetScrollPos = st.min + st.len * t;
    var hud = st.ctx && st.ctx.hudStatusController; if (hud && hud.setIdleSuppressed) hud.setIdleSuppressed(false);
  }
  function close(dir) {
    if (!st.open) return;
    st.open = false;
    st.root.classList.remove('is-open');
    st.scenes.forEach(function (sc) { sc.parts.forEach(function (p) { if (p.state !== H) startD(p); }); });
    // release on the next frame: the wheel/touch event that closed us must not also
    // reach the site's scroll manager (it would jump straight past the stage end)
    requestAnimationFrame(function () { if (!st.open) release(dir === 'down' ? ZOUT + 0.008 : 0.86); });
  }
  function abort() {
    st.open = false;
    st.root.classList.remove('is-open');
    st.scenes.forEach(function (sc) { sc.parts.forEach(function (p) { p.state = H; p.u = 0; apply(p); }); });
    var hud = st.ctx && st.ctx.hudStatusController; if (hud && hud.setIdleSuppressed) hud.setIdleSuppressed(false);
  }
  // CTA -> the site's own "Start your campaign" field in the bottom bar (stays in place)
  function startCampaign() {
    var pill = document.querySelector('.eg-pill');
    if (pill) { if (!pill.classList.contains('is-open')) pill.click(); setTimeout(function () { var i = document.querySelector('.eg-input'); if (i) i.focus(); }, 450); }
    else window.dispatchEvent(new Event('simplify:openWaitlist'));
  }

  /* ---------------- hook from Stage 4 ---------------- */
  window.__sfyS4 = function (ctx, t) {
    if (t >= PRELOAD) build();
    if (st.prevT == null) st.prevT = t;
    if (!st.open) {
      if (st.prevT < ZIN && t >= ZIN && t < 0.99) open(ctx, 'start');          // scrolling down past the last beat
      else if (st.prevT > ZOUT && t <= ZOUT && t >= ZIN) open(ctx, 'end');      // scrolling back up from the city
    }
    st.prevT = t;
  };
})();

/* HUD fitter: keep the progress bars / ruler clear of the MATCHES pill.
   The stock CSS pins .hud-right-group at left:160px, sized for the short
   "100 XP" label; "300 MATCHES" is wider, so the bars covered the count. */
(function () {
  var GAP = 12, ro = null, pill = null, maxLeft = 0;   // left edge only grows (reset on resize): no jitter while the count animates
  function fit() {
    pill = pill && pill.isConnected ? pill : document.querySelector('.hud-xp');
    if (!pill) return;
    var pr = pill.getBoundingClientRect();
    if (!pr.width) return;
    var grp = document.querySelector('.hud-right-group');
    // Only on the mobile layout, where the pill sits alone in the LEFT group.
    // On desktop the pill lives inside the right group itself — leave it be.
    if (grp) {
      if (!grp.contains(pill) && pr.left < window.innerWidth / 2) {
        var par = (grp.offsetParent || document.body).getBoundingClientRect();
        maxLeft = Math.max(maxLeft, Math.ceil(pr.right - par.left + GAP));
        grp.style.left = maxLeft + 'px';
      } else if (grp.style.left) grp.style.left = '';
    }
    var ruler = document.querySelector('.scroll-ruler');
    if (ruler) {
      var cx = window.innerWidth / 2;
      var half = (pr.left < cx ? cx - pr.right : pr.left - cx) - GAP - 6;
      var w = Math.min(300, Math.floor(half * 2));
      ruler.style.width = Math.max(w, 0) + 'px';
      ruler.style.visibility = w < 90 ? 'hidden' : '';
    }
  }
  function attach() {
    var p = document.querySelector('.hud-xp');
    if (!p) return false;
    pill = p;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(p); }
    fit();
    return true;
  }
  window.addEventListener('resize', function () { maxLeft = 0; fit(); });
  (function wait() { if (!attach()) setTimeout(wait, 300); })();
  // the HUD is rebuilt/re-shown between stages; re-fit cheaply
  setInterval(function () {
    var p = document.querySelector('.hud-xp');
    if (p && p !== pill && ro) { ro.disconnect(); ro.observe(p); pill = p; }
    fit();
  }, 1000);
})();
