/*
 * MissionCTRL / TrustOS — consent-gated analytics
 * ------------------------------------------------
 * Plausible (cookieless, no consent required) is loaded per-page in the markup.
 * THIS file governs Microsoft Clarity only, which DOES set cookies (_clck, _clsk)
 * and records session replay — so nothing here loads until the visitor opts in.
 *
 * Rules enforced below:
 *   1. No Clarity script, no cookies, until an explicit "Allow".
 *   2. /navigator/* is excluded outright — those are gated client reports and
 *      must never be session-recorded. Do not remove this guard.
 *   3. Global Privacy Control is honoured as a decline.
 *   4. The choice is remembered in localStorage and reversible via any element
 *      with id="privacy-choices" (or window.mcAnalytics.openChoices()).
 *
 * Mask sensitive regions in markup with: data-clarity-mask="true"
 */
(function () {
  'use strict';

  var CLARITY_ID = 'ycg9h5xkb6';
  var KEY = 'mc-analytics-consent';
  var EXCLUDED = /^\/navigator\//i;   // client-confidential — never record

  if (EXCLUDED.test(window.location.pathname)) return;

  function stored() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { window.localStorage.setItem(KEY, v); } catch (e) {} }

  function loadClarity() {
    if (window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
    window.clarity('consentv2', { ad_storage: 'denied', analytics_storage: 'granted' });
  }

  var el = null;

  function build() {
    if (el) return el;
    var css = document.createElement('style');
    css.textContent =
      '.mc-consent{position:fixed;left:18px;bottom:18px;z-index:2147483000;max-width:380px;' +
      'background:#10151f;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:18px 20px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.5);font-family:Sora,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
      'color:#fff;display:none}' +
      '.mc-consent.on{display:block}' +
      '.mc-consent-t{font-size:.78rem;font-weight:800;margin:0 0 8px}' +
      '.mc-consent-b{font-size:.72rem;line-height:1.65;color:rgba(255,255,255,.55);margin:0}' +
      '.mc-consent-b a{color:#8fb5c0}' +
      '.mc-consent-r{display:flex;gap:8px;margin-top:14px}' +
      '.mc-consent button{font-family:inherit;font-size:.74rem;font-weight:700;padding:10px 18px;' +
      'border-radius:6px;cursor:pointer;border:none}' +
      '.mc-yes{background:#5A8A9A;color:#fff}' +
      '.mc-yes:hover{background:#4d7a8a}' +
      '.mc-no{background:transparent;color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.18)}' +
      '.mc-no:hover{color:#fff;border-color:rgba(255,255,255,.4)}' +
      '@media (max-width:520px){.mc-consent{left:12px;right:12px;bottom:12px;max-width:none}}';
    document.head.appendChild(css);

    el = document.createElement('div');
    el.className = 'mc-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Analytics consent');
    el.innerHTML =
      '<p class="mc-consent-t">Analytics — only with your OK</p>' +
      '<p class="mc-consent-b">Our standard analytics are cookieless and collect no personal data. ' +
      'With your consent we would also use Microsoft Clarity (heatmaps and session replay) to see how ' +
      'this page is read. No ad tracking, no sale of data — and declining changes nothing. ' +
      '<a href="/cookie-policy/">Cookie Policy</a></p>' +
      '<div class="mc-consent-r"><button type="button" class="mc-yes">Allow</button>' +
      '<button type="button" class="mc-no">No thanks</button></div>';
    document.body.appendChild(el);

    el.querySelector('.mc-yes').addEventListener('click', function () {
      store('granted'); hide(); loadClarity();
    });
    el.querySelector('.mc-no').addEventListener('click', function () {
      store('denied'); hide();
    });
    return el;
  }

  function show() { build().classList.add('on'); }
  function hide() { if (el) el.classList.remove('on'); }

  window.mcAnalytics = {
    openChoices: show,
    state: stored,
    reset: function () { store(''); show(); }
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    var link = document.getElementById('privacy-choices');
    if (link) link.addEventListener('click', function (e) { e.preventDefault(); show(); });

    var c = stored();
    if (c === 'granted') { loadClarity(); return; }
    if (c === 'denied') return;
    if (navigator.globalPrivacyControl) return;   // GPC = decline, never ask
    setTimeout(show, 1500);
  });
})();
