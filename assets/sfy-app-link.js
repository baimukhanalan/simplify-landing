/* Simplify — landing → platform handoff.
   Every "Start your campaign" entry point (bottom-bar pill, HUD button, interlude CTAs,
   waitlist form buttons) leads to the platform's interactive sign-up page with a soft
   mint veil transition. Button placement/animation stays exactly as the site renders it. */
(function () {
  var APP = (window.SIMPLIFY_APP_URL || 'https://app.wesimplify.works').replace(/\/$/, '');
  var SELECTORS = ['.eg-pill', '.eg-submit', '.hud-waitlist-btn', '.jf-join-btn', '.jf-submit-btn', '#sfy-interlude [data-cta]'].join(',');
  var leaving = false;

  function target() {
    var ref = new URLSearchParams(location.search).get('ref');
    return APP + '/login?mode=signup&from=landing' + (ref ? '&ref=' + encodeURIComponent(ref) : '');
  }

  function go() {
    if (leaving) return;
    leaving = true;
    var url = target();
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // bfcache return: let the CTA work again (both paths)
    window.addEventListener('pageshow', function (e) { if (e.persisted) { leaving = false; var old = document.getElementById('sfy-leave-veil'); if (old) old.remove(); } }, { once: true });
    if (reduce) { location.href = url; return; }
    var v = document.createElement('div');
    v.id = 'sfy-leave-veil';
    v.setAttribute('aria-hidden', 'true');
    v.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:all;opacity:0;transition:opacity .55s cubic-bezier(.16,1,.3,1);' +
      'background:radial-gradient(ellipse 90% 60% at 50% -10%,rgba(44,86,71,.28),transparent 70%),linear-gradient(180deg,#dcefe6 0%,#eef7f2 45%,#f5faf7 100%)';
    document.body.appendChild(v);
    requestAnimationFrame(function () { v.style.opacity = '1'; });
    setTimeout(function () { location.href = url; }, 520);
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest(SELECTORS) : null;
    if (!el || (e.target.closest && e.target.closest('.eg-menu'))) return; // the pill's menu button keeps its own behaviour
    e.preventDefault();
    e.stopImmediatePropagation();
    go();
  }, true);

  // Preconnect so the login page opens instantly.
  var l = document.createElement('link'); l.rel = 'preconnect'; l.href = APP; document.head.appendChild(l);
  window.simplifyStartCampaign = go;
})();
