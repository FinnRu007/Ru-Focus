/* ============================================================
   Standard-Einstellungen der Erweiterung.
   Wird in jeden Kontext geladen (Content-Scripts, Service-Worker,
   Options-/Popup-Seite) und dient überall als Fallback.
   ============================================================ */

var YTSD_DEFAULTS = {
  // YouTube
  hideShorts: true,        // Shorts-Regale und Shorts in Listen ausblenden
  redirectShorts: true,    // /shorts/<id> automatisch auf /watch?v=<id> umleiten
  hidePlayables: true,     // YouTube Playables (Spiele) ausblenden
  hideSurveys: true,       // Umfragen, Feedback- und "Nudge"-Einblendungen ausblenden

  // Cookie-Banner
  autoRejectCookies: true, // Auf jeder Website versuchen, alle optionalen Cookies abzulehnen

  // Website-Blocker
  blockEnabled: true,      // Blocker global an/aus
  blocklist: ["instagram.com"]  // gesperrte Domains (ohne "https://" / "www.")
};

// In Service-Worker (importScripts) verfügbar machen:
if (typeof self !== "undefined") {
  self.YTSD_DEFAULTS = YTSD_DEFAULTS;
}
