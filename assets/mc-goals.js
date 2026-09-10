/* mc-goals.js — fires Plausible custom events on real conversions.
   Wraps the page's existing submit handlers; changes no existing logic.
   Goals to register in Plausible: Demo Requested, Navigator Requested,
   Contact Submitted, Archetype Quiz Completed. */
(function () {
  function fire(name) {
    try { if (typeof window.plausible === 'function') window.plausible(name); } catch (e) {}
  }

  // The handlers below disable their submit button only AFTER validation passes,
  // so a disabled button is our signal that a real submission started.
  function wrapGuarded(fnName, buttonId, goal) {
    var orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function () {
      var r = orig.apply(this, arguments);
      try {
        var b = document.getElementById(buttonId);
        if (b && b.disabled) fire(goal);
      } catch (e) {}
      return r;
    };
  }

  function wrapPlain(fnName, goal) {
    var orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function () { fire(goal); return orig.apply(this, arguments); };
  }

  function init() {
    wrapGuarded('submitDemo', 'dm-submit', 'Demo Requested');
    wrapGuarded('handleNavSubmit', 'nav-submit', 'Navigator Requested');
    wrapGuarded('mcContactSubmit', 'mc-submit', 'Contact Submitted');
    wrapPlain('submitLead', 'Archetype Quiz Completed');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
