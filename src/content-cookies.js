/* ============================================================
   Content-Script für alle Websites
   ------------------------------------------------------------
   Versucht, Cookie-/Consent-Banner automatisch so zu bedienen,
   dass alle optionalen Cookies abgelehnt werden. Erst über
   bekannte Buttons der großen Consent-Tools, danach über einen
   Text-Abgleich innerhalb erkennbarer Cookie-Dialoge.
   ============================================================ */

(function () {
  "use strict";

  var D =
    typeof YTSD_DEFAULTS !== "undefined"
      ? YTSD_DEFAULTS
      : { autoRejectCookies: true };

  chrome.storage.sync.get({ autoRejectCookies: D.autoRejectCookies }, function (res) {
    if (res.autoRejectCookies) start();
  });

  function start() {
    if (window.__ytsdCookieRan) return;
    window.__ytsdCookieRan = true;

    // Bekannte "Ablehnen"-Buttons der verbreiteten Consent-Management-Tools.
    var SELECTORS = [
      "#onetrust-reject-all-handler",
      ".ot-pc-refuse-all-handler",
      "#CybotCookiebotDialogBodyButtonDecline",
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll",
      "#CybotCookiebotDialogBodyButtonBasicPreferenceAccept",
      "button#didomi-notice-disagree-button",
      ".didomi-continue-without-agreeing",
      'button[data-testid="uc-deny-all-button"]',
      'button[data-testid="uc-denyAll-button"]',
      ".qc-cmp2-summary-buttons > button[mode='secondary']",
      'button[aria-label="REJECT ALL"]',
      ".osano-cm-denyAll",
      ".cky-btn-reject",
      ".cmplz-deny",
      "._brlbs-btn-refuse",
      "a.brlbs-refuse-btn",
      '[data-tid="banner-decline"]',
      ".truste-button2",
      "#truste-consent-required",
      "button.iubenda-cs-reject-btn",
      ".fc-cta-do-not-consent",
      ".fc-button.fc-cta-do-not-consent",
      "button.sp_choice_type_REJECT_ALL",
      'button[title="Reject All"]',
      'button[aria-label="Reject all"]',
      'button[aria-label="Alle ablehnen"]',
      'button[aria-label="Alles ablehnen"]'
    ];

    // Text-Varianten (nur innerhalb erkennbarer Cookie-Dialoge angewendet).
    var TEXTS = [
      "reject all",
      "reject non-essential",
      "reject unnecessary",
      "decline all",
      "decline optional",
      "decline cookies",
      "necessary cookies only",
      "only necessary",
      "use necessary cookies only",
      "essential only",
      "continue without accepting",
      "do not consent",
      "alle ablehnen",
      "alles ablehnen",
      "ablehnen",
      "alle cookies ablehnen",
      "nur notwendige",
      "nur notwendige cookies",
      "nur erforderliche",
      "nur essenzielle cookies",
      "auswahl ablehnen",
      "ohne einwilligung fortfahren",
      "weiter ohne zustimmung",
      "tout refuser",
      "refuser",
      "continuer sans accepter",
      "rechazar",
      "rechazar todo"
    ];

    var CONTEXT = [
      '[id*="cookie" i]',
      '[class*="cookie" i]',
      '[id*="consent" i]',
      '[class*="consent" i]',
      '[id*="gdpr" i]',
      '[class*="gdpr" i]',
      '[id*="cmp" i]',
      '[class*="cmp" i]',
      '[aria-label*="cookie" i]',
      '[id*="privacy" i][role="dialog"]',
      '[class*="privacy" i][class*="banner" i]'
    ].join(",");

    var tries = 0;
    var timer = setInterval(tick, 850);
    tick();
    setTimeout(function () {
      clearInterval(timer);
    }, 13000);

    function tick() {
      tries++;
      if (tries > 14) {
        clearInterval(timer);
        return;
      }
      try {
        if (clickSelectors() || clickByText()) {
          clearInterval(timer);
        }
      } catch (e) {
        /* einzelne Seiten mit exotischem DOM ignorieren */
      }
    }

    function isVisible(el) {
      if (!el) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      var view = el.ownerDocument.defaultView || window;
      var st = view.getComputedStyle(el);
      return (
        st.visibility !== "hidden" &&
        st.display !== "none" &&
        st.pointerEvents !== "none" &&
        st.opacity !== "0"
      );
    }

    function clickSelectors() {
      for (var i = 0; i < SELECTORS.length; i++) {
        var el;
        try {
          el = document.querySelector(SELECTORS[i]);
        } catch (e) {
          continue;
        }
        if (el && isVisible(el)) {
          el.click();
          return true;
        }
      }
      return false;
    }

    function clickByText() {
      var containers = document.querySelectorAll(CONTEXT);
      for (var i = 0; i < containers.length; i++) {
        var box = containers[i];
        if (!isVisible(box)) continue;

        var btns = box.querySelectorAll(
          'button,a,[role="button"],input[type="button"],input[type="submit"]'
        );
        for (var j = 0; j < btns.length; j++) {
          var b = btns[j];
          var t = (b.textContent || b.value || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
          if (!t || t.length > 42) continue;

          for (var k = 0; k < TEXTS.length; k++) {
            if (t === TEXTS[k] || t.indexOf(TEXTS[k]) !== -1) {
              if (isVisible(b)) {
                b.click();
                return true;
              }
            }
          }
        }
      }
      return false;
    }
  }
})();
