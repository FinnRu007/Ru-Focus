/* ============================================================
   Content-Script für alle Websites
   ------------------------------------------------------------
   Versucht, Cookie-/Consent-Banner automatisch so zu bedienen,
   dass alle optionalen Cookies abgelehnt werden.

   Vorgehen:
   1. bekannte "Ablehnen"-Buttons der großen Consent-Tools
      (auch in offenen Shadow-DOMs, z. B. Usercentrics)
   2. Text-Abgleich: eindeutige Formulierungen überall,
      schwächere nur innerhalb eines erkennbaren Consent-Dialogs
   3. mehrstufige Banner: gibt es auf der ersten Ebene kein
      "Ablehnen", wird "Einstellungen verwalten" o. Ä. geklickt
      und danach in der zweiten Ebene "Alle ablehnen" + ggf.
      "Auswahl bestätigen"
   Läuft in allen Frames (Sourcepoint, Quantcast … laufen im iframe).
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

    // Bekannte "alle ablehnen"-Buttons der verbreiteten Consent-Tools.
    var SELECTORS = [
      // OneTrust
      "#onetrust-reject-all-handler",
      "button.ot-pc-refuse-all-handler",
      ".ot-pc-refuse-all-handler",
      // Cookiebot
      "#CybotCookiebotDialogBodyButtonDecline",
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll",
      // Usercentrics (v2 / CMP – meist im Shadow-DOM #usercentrics-cmp-ui / #usercentrics-root)
      "button.uc-deny-button",
      "button#deny.uc-deny-button",
      'button[data-testid="uc-deny-all-button"]',
      'button[data-testid="uc-denyAll-button"]',
      "#uc-btn-deny-banner",
      // Sourcepoint (BBC, SPIEGEL, BILD, WELT …) – meist <iframe src=*privacy-mgmt*>
      "button.sp_choice_type_13",
      "button.sp_choice_type_REJECT_ALL",
      'button[title="Reject All"]',
      'button[title="Disagree"]',
      'button[title="Do not agree"]',
      'button[aria-label*="do not agree" i]',
      'button[aria-label*="reject all" i]',
      // Didomi
      "button#didomi-notice-disagree-button",
      ".didomi-continue-without-agreeing",
      // Quantcast
      '.qc-cmp2-summary-buttons > button[mode="secondary"]',
      // weitere Tools
      ".osano-cm-denyAll",
      ".cky-btn-reject",
      ".cmplz-deny",
      "._brlbs-btn-refuse",
      "a.brlbs-refuse-btn",
      ".truste-button2",
      "button.iubenda-cs-reject-btn",
      '[data-tid="banner-decline"]',
      ".fc-cta-do-not-consent",
      // generische ARIA/Title-Varianten
      'button[aria-label="Reject all" i]',
      'button[aria-label="Deny all" i]',
      'button[aria-label="Alle ablehnen" i]',
      'button[aria-label="Alles ablehnen" i]',
      'button[aria-label="Ablehnen" i]'
    ];

    // Eindeutige Formulierungen – dürfen überall geklickt werden.
    var STRONG = [
      "reject all",
      "reject all cookies",
      "reject non-essential",
      "reject unnecessary",
      "decline all",
      "deny all",
      "i do not agree",
      "do not agree",
      "continue without accepting",
      "do not consent",
      "only necessary",
      "only necessary cookies",
      "necessary cookies only",
      "use necessary cookies only",
      "essential only",
      "only essential cookies",
      "reject additional cookies",
      "alle ablehnen",
      "alles ablehnen",
      "alle ablehnen und schließen",
      "ablehnen und schließen",
      "alle cookies ablehnen",
      "auswahl ablehnen",
      "nur notwendige",
      "nur notwendige cookies",
      "nur erforderliche",
      "nur erforderliche cookies",
      "nur essenzielle cookies",
      "nur essentielle cookies",
      "ohne einwilligung fortfahren",
      "weiter ohne einwilligung",
      "weiter ohne zustimmung",
      "tout refuser",
      "continuer sans accepter",
      "rechazar todo",
      "rifiuta tutto"
    ];

    // Schwache Formulierungen – nur innerhalb eines erkennbaren Consent-Dialogs.
    var WEAK = ["ablehnen", "decline", "reject", "disagree", "refuser", "rechazar"];

    // Ebene 2 öffnen ("Einstellungen verwalten" / "Manage options" …).
    var MANAGE_SEL = [
      "button.sp_choice_type_12",
      ".sp_choice_type_12",
      "#onetrust-pc-btn-handler",
      ".ot-sdk-show-settings",
      ".optanon-show-settings",
      "#didomi-notice-learn-more-button",
      'button[data-testid="uc-customize-button"]',
      'button[data-testid="uc-more-button"]',
      ".cky-btn-customize",
      'button[aria-label*="manage options" i]',
      'button[aria-label*="einstellungen verwalten" i]'
    ];
    // Als Teil-Text gesucht (aber nur innerhalb eines Consent-Dialogs).
    var MANAGE_TXT = [
      "einstellungen verwalten",
      "einstellungen anpassen",
      "cookies verwalten",
      "cookie-einstellungen",
      "cookie einstellungen",
      "datenschutz-einstellungen",
      "datenschutzeinstellungen",
      "mehr optionen",
      "weitere optionen",
      "optionen verwalten",
      "auswahl anpassen",
      "individuelle einstellungen",
      "einstellungen ändern",
      "zwecke anzeigen",
      "manage settings",
      "manage options",
      "manage choices",
      "manage my choices",
      "manage preferences",
      "manage cookies",
      "manage my cookies",
      "manage consent",
      "customize",
      "customise",
      "more options",
      "cookie settings",
      "privacy settings",
      "let me choose",
      "more choices",
      "gérer les options",
      "personnaliser",
      "configurar",
      "gestisci opzioni"
    ];

    // Ebene 2 abschließen ("Auswahl bestätigen" / "Confirm my choices" …).
    var CONFIRM_SEL = [
      "button.sp_choice_type_SAVE_AND_EXIT",
      ".sp_choice_type_SAVE_AND_EXIT",
      ".save-preference-btn-handler",
      'button[data-testid="uc-save-button"]',
      ".qc-cmp2-save-and-exit"
    ];
    var CONFIRM_TXT = [
      "auswahl bestätigen",
      "auswahl speichern",
      "einstellungen speichern",
      "meine auswahl bestätigen",
      "speichern und schließen",
      "speichern & schließen",
      "speichern und beenden",
      "bestätigen und fortfahren",
      "confirm my choices",
      "confirm choices",
      "save choices",
      "save my choices",
      "save and exit",
      "save & exit",
      "save preferences",
      "save and close",
      "confirmer mes choix",
      "enregistrer mes choix"
    ];

    var CONTEXT_SEL = [
      '[id*="cookie" i]',
      '[class*="cookie" i]',
      '[id*="consent" i]',
      '[class*="consent" i]',
      '[id*="gdpr" i]',
      '[class*="gdpr" i]',
      '[id*="cmp" i]',
      '[class*="cmp" i]',
      '[id*="usercentrics" i]',
      '[class*="usercentrics" i]',
      '[aria-label*="cookie" i]',
      '[id*="privacy" i][role="dialog"]',
      '[class*="privacy" i][class*="banner" i]',
      '[class*="qc-cmp" i]',
      '[class*="message-component" i]'
    ].join(",");

    // Läuft die Seite selbst als CMP (iframe eines Consent-Tools)?
    var CMP_HOST =
      /(^|\.)(privacy-mgmt\.com|consensu\.org|onetrust\.com|cookiebot\.com|usercentrics\.eu|didomi\.io|trustarc\.com|cookie-script\.com|iubenda\.com)$/i.test(
        location.hostname
      ) || /sp_message|sp_privacy|consent|cmp/i.test(location.pathname);

    /* ---------- DOM-Helfer (inkl. offener Shadow-DOMs) ---------- */

    function allRoots() {
      var roots = [document];
      var stack = [document];
      while (stack.length) {
        var r = stack.pop();
        var els = r.querySelectorAll("*");
        for (var i = 0; i < els.length; i++) {
          if (els[i].shadowRoot) {
            roots.push(els[i].shadowRoot);
            stack.push(els[i].shadowRoot);
          }
        }
      }
      return roots;
    }

    function queryAll(selector, roots) {
      var out = [];
      for (var i = 0; i < roots.length; i++) {
        try {
          out.push.apply(out, roots[i].querySelectorAll(selector));
        } catch (e) {
          /* ungültiger Selektor in diesem Browser – überspringen */
        }
      }
      return out;
    }

    function visible(el) {
      if (!el) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      var st = window.getComputedStyle(el);
      return (
        st.visibility !== "hidden" &&
        st.display !== "none" &&
        st.pointerEvents !== "none" &&
        st.opacity !== "0"
      );
    }

    function norm(s) {
      return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function inContext(el) {
      var node = el;
      for (var i = 0; i < 12 && node; i++) {
        try {
          if (node.matches && node.matches(CONTEXT_SEL)) return true;
        } catch (e) {
          return false;
        }
        node =
          node.parentElement ||
          (node.getRootNode && node.getRootNode() && node.getRootNode().host) ||
          null;
      }
      return false;
    }

    /* ---------- Klick-Strategien ---------- */

    function clickBySelectors(list, roots, needContext) {
      for (var i = 0; i < list.length; i++) {
        var found = queryAll(list[i], roots);
        for (var j = 0; j < found.length; j++) {
          if (!visible(found[j])) continue;
          if (needContext && !CMP_HOST && !inContext(found[j])) continue;
          found[j].click();
          return true;
        }
      }
      return false;
    }

    // mode "exact": t === phrase | mode "sub": t enthält phrase
    function clickByText2(list, roots, mode) {
      var btns = queryAll('button,a,[role="button"]', roots);
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        var t = norm(b.textContent || b.getAttribute("aria-label"));
        if (!t || t.length > 48) continue;
        for (var k = 0; k < list.length; k++) {
          var hit = mode === "sub" ? t.indexOf(list[k]) !== -1 : t === list[k];
          if (hit) {
            if (!visible(b)) continue;
            if (!CMP_HOST && !inContext(b)) continue;
            b.click();
            return true;
          }
        }
      }
      return false;
    }

    function clickKnown(roots) {
      return clickBySelectors(SELECTORS, roots, false);
    }

    function clickByText(roots) {
      var btns = queryAll(
        'button,a,[role="button"],input[type="button"],input[type="submit"]',
        roots
      );
      for (var pass = 0; pass < 2; pass++) {
        var list = pass === 0 ? STRONG : WEAK;
        for (var i = 0; i < btns.length; i++) {
          var b = btns[i];
          var t = norm(b.textContent || b.value || b.getAttribute("aria-label"));
          if (!t || t.length > 45) continue;
          for (var k = 0; k < list.length; k++) {
            if (t === list[k] || t.indexOf(list[k]) !== -1) {
              if (!visible(b)) continue;
              if (pass === 1 && !CMP_HOST && !inContext(b)) continue;
              b.click();
              return true;
            }
          }
        }
      }
      return false;
    }

    function clickManage(roots) {
      return (
        clickBySelectors(MANAGE_SEL, roots, true) ||
        clickByText2(MANAGE_TXT, roots, "sub")
      );
    }

    function clickConfirm(roots) {
      return (
        clickBySelectors(CONFIRM_SEL, roots, true) ||
        clickByText2(CONFIRM_TXT, roots, "exact")
      );
    }

    /* ---------- Wiederholte Versuche ---------- */

    var tries = 0;
    var panelOpened = false;
    var rejectClicked = false;
    var ticksSinceReject = 0;
    var timer = setInterval(tick, 800);
    tick();
    setTimeout(stop, 24000);

    function stop() {
      clearInterval(timer);
    }

    function tick() {
      tries++;
      if (tries > 30) return stop();
      try {
        var roots = allRoots();

        if (!rejectClicked) {
          if (clickKnown(roots) || clickByText(roots)) {
            rejectClicked = true;
            ticksSinceReject = 0;
          } else if (!panelOpened && clickManage(roots)) {
            panelOpened = true; // nächste Ticks fangen "Alle ablehnen" in Ebene 2
          }
          return;
        }

        // Ablehnen ist erfolgt – bei mehrstufigen Panels noch bestätigen.
        ticksSinceReject++;
        if (clickConfirm(roots)) return stop();
        if (ticksSinceReject >= 6) stop();
      } catch (e) {
        /* exotisches DOM – nächster Versuch */
      }
    }
  }
})();
