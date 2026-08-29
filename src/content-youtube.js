/* ============================================================
   Content-Script für youtube.com
   ------------------------------------------------------------
   Blendet per CSS (an <html> gesetzte Klassen) Shorts, Playables
   und Umfrage-Einblendungen aus und leitet Shorts-Seiten auf den
   normalen Player um. Reagiert live auf geänderte Einstellungen.
   ============================================================ */

(function () {
  "use strict";

  var D =
    typeof YTSD_DEFAULTS !== "undefined"
      ? YTSD_DEFAULTS
      : {
          hideShorts: true,
          redirectShorts: true,
          hidePlayables: true,
          hideSurveys: true
        };

  var settings = Object.assign({}, D);

  /* ---------- CSS ---------- */

  var CSS = [
    /* --- Shorts --- */
    "html.ytsd-hide-shorts ytd-reel-shelf-renderer,",
    "html.ytsd-hide-shorts ytd-rich-shelf-renderer[is-shorts],",
    "html.ytsd-hide-shorts ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),",
    "html.ytsd-hide-shorts ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model),",
    "html.ytsd-hide-shorts ytd-rich-section-renderer:has([overlay-style='SHORTS']),",
    "html.ytsd-hide-shorts ytd-reel-item-renderer,",
    "html.ytsd-hide-shorts ytm-shorts-lockup-view-model,",
    "html.ytsd-hide-shorts ytm-shorts-lockup-view-model-v2,",
    "html.ytsd-hide-shorts grid-shelf-view-model,",
    "html.ytsd-hide-shorts ytd-video-renderer:has(a[href^='/shorts']),",
    "html.ytsd-hide-shorts ytd-compact-video-renderer:has(a[href^='/shorts']),",
    "html.ytsd-hide-shorts ytd-grid-video-renderer:has(a[href^='/shorts']),",
    "html.ytsd-hide-shorts ytd-guide-entry-renderer:has(a[title='Shorts']),",
    "html.ytsd-hide-shorts ytd-guide-entry-renderer:has(a[href='/shorts']),",
    "html.ytsd-hide-shorts ytd-mini-guide-entry-renderer:has(a[href='/shorts']),",
    "html.ytsd-hide-shorts ytd-mini-guide-entry-renderer[aria-label='Shorts'],",
    "html.ytsd-hide-shorts tp-yt-paper-tab:has([tab-title='Shorts']),",
    "html.ytsd-hide-shorts yt-tab-shape[tab-title='Shorts'],",
    "html.ytsd-hide-shorts ytd-rich-grid-slim-media[is-short] {",
    "  display: none !important;",
    "}",

    /* --- Playables --- */
    "html.ytsd-hide-playables ytd-rich-section-renderer:has(a[href^='/playables']),",
    "html.ytsd-hide-playables ytd-guide-entry-renderer:has(a[href^='/playables']),",
    "html.ytsd-hide-playables ytd-mini-guide-entry-renderer:has(a[href^='/playables']),",
    "html.ytsd-hide-playables ytd-rich-shelf-renderer:has(a[href*='/playables']),",
    "html.ytsd-hide-playables ytd-rich-section-renderer:has([title='Playables']) {",
    "  display: none !important;",
    "}",

    /* --- Umfragen / Nudges / Feedback --- */
    "html.ytsd-hide-surveys ytd-feed-nudge-renderer,",
    "html.ytsd-hide-surveys ytd-inline-survey-renderer,",
    "html.ytsd-hide-surveys ytd-single-option-survey-renderer,",
    "html.ytsd-hide-surveys tp-yt-paper-dialog:has(ytd-single-option-survey-renderer),",
    "html.ytsd-hide-surveys ytd-emoji-feedback-renderer,",
    "html.ytsd-hide-surveys ytd-brand-video-shelf-renderer,",
    "html.ytsd-hide-surveys ytd-checklist-renderer,",
    "html.ytsd-hide-surveys ytd-statement-banner-renderer {",
    "  display: none !important;",
    "}"
  ].join("\n");

  function injectStyle() {
    if (document.getElementById("ytsd-style")) return;
    var style = document.createElement("style");
    style.id = "ytsd-style";
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }
  injectStyle();
  document.addEventListener("DOMContentLoaded", injectStyle);

  /* ---------- Klassen setzen ---------- */

  function apply() {
    var c = document.documentElement.classList;
    c.toggle("ytsd-hide-shorts", !!settings.hideShorts);
    c.toggle("ytsd-hide-playables", !!settings.hidePlayables);
    c.toggle("ytsd-hide-surveys", !!settings.hideSurveys);
    if (settings.redirectShorts) redirectShorts();
  }

  /* ---------- Shorts -> normaler Player ---------- */

  function redirectShorts() {
    if (location.pathname.indexOf("/shorts/") === 0) {
      var id = location.pathname.split("/")[2];
      if (id) location.replace(location.origin + "/watch?v=" + id);
    }
  }

  // Sehr früh (noch bevor die Einstellungen geladen sind) – Standard ist "an".
  if (D.redirectShorts) redirectShorts();

  ["yt-navigate-finish", "yt-navigate-start"].forEach(function (evt) {
    window.addEventListener(
      evt,
      function () {
        if (settings.redirectShorts) redirectShorts();
      },
      true
    );
  });

  /* ---------- Einstellungen laden + beobachten ---------- */

  chrome.storage.sync.get(D, function (res) {
    settings = Object.assign({}, D, res);
    apply();
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "sync") return;
    Object.keys(changes).forEach(function (k) {
      settings[k] = changes[k].newValue;
    });
    apply();
  });

  // Erste Anwendung, falls das Dokument schon steht.
  apply();
})();
