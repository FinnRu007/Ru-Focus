/* ============================================================
   Läuft in der SEITE (world: MAIN), nicht im isolierten
   Content-Script-Kontext – nur so ist die YouTube-Player-API
   (#movie_player.setVolume / setOption / setAudioTrack …)
   erreichbar.

   Die Einstellungen kommen von src/content-player.js über das
   Attribut data-ytsd-cfg an <html>. Angewendet wird pro Video:
   - Startlautstärke
   - automatische Untertitel aus (nur kurz nach dem Laden)
   - übersetzte Audiospur zurück auf Original
   ============================================================ */

(function () {
  "use strict";

  var cfg = {
    setStartVolume: false,
    startVolume: 50,
    disableAutoCaptions: true,
    disableAutoTranslate: true
  };

  var volumeDoneFor = null;
  var audioDoneFor = null;
  var captionTimers = [];

  /* ---------- Konfiguration lesen ---------- */

  function readCfg() {
    try {
      var raw = document.documentElement.getAttribute("data-ytsd-cfg");
      if (!raw) return;
      var parsed = JSON.parse(raw);
      for (var k in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, k)) cfg[k] = parsed[k];
      }
    } catch (e) {}
  }

  readCfg();

  new MutationObserver(function () {
    readCfg();
    volumeDoneFor = null;
    audioDoneFor = null;
    apply();
    killCaptionsBurst();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-ytsd-cfg"]
  });

  /* ---------- Helfer ---------- */

  function player() {
    var p = document.getElementById("movie_player");
    return p && typeof p.getPlayerState === "function" ? p : null;
  }

  function currentVideoId() {
    try {
      if (location.pathname === "/watch") {
        return new URLSearchParams(location.search).get("v");
      }
      var m = location.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
      return m ? m[1] : null;
    } catch (e) {
      return null;
    }
  }

  function trackName(t) {
    try {
      if (!t) return "";
      if (typeof t.name === "string") return t.name;
      if (t.name && t.name.name) return t.name.name;
      if (t.captionTrackName) return t.captionTrackName;
      if (t.displayName) return t.displayName;
    } catch (e) {}
    return "";
  }

  /* ---------- Anwenden ---------- */

  function apply() {
    var p = player();
    if (!p) return;
    var v = currentVideoId();
    if (!v) return;

    if (cfg.setStartVolume && volumeDoneFor !== v) {
      try {
        var vol = parseInt(cfg.startVolume, 10);
        if (isNaN(vol)) vol = 50;
        vol = Math.max(0, Math.min(100, vol));
        p.setVolume(vol);
        if (vol === 0) p.mute();
        else p.unMute();
        volumeDoneFor = v;
      } catch (e) {}
    }

    if (cfg.disableAutoTranslate && audioDoneFor !== v) {
      try {
        if (typeof p.getAvailableAudioTracks === "function") {
          var tracks = p.getAvailableAudioTracks() || [];
          if (tracks.length > 1) {
            var orig =
              tracks.filter(function (t) {
                return /original/i.test(trackName(t));
              })[0] ||
              tracks.filter(function (t) {
                return t && (t.isDefault === true || t.audioIsDefault === true);
              })[0];
            if (orig && typeof p.setAudioTrack === "function") {
              p.setAudioTrack(orig);
            }
          }
          audioDoneFor = v;
        }
      } catch (e) {}
    }
  }

  /* ---------- automatische Untertitel aus ---------- */

  function killCaptionsOnce() {
    if (!cfg.disableAutoCaptions) return;
    var p = player();
    if (!p) return;
    try {
      p.setOption("captions", "track", {});
    } catch (e) {}
  }

  function killCaptionsBurst() {
    captionTimers.forEach(clearTimeout);
    captionTimers = [300, 900, 1800, 3200].map(function (ms) {
      return setTimeout(killCaptionsOnce, ms);
    });
  }

  /* ---------- Auslöser ---------- */

  setInterval(apply, 600);

  function onNavigate() {
    volumeDoneFor = null;
    audioDoneFor = null;
    setTimeout(apply, 200);
    killCaptionsBurst();
  }
  ["yt-navigate-finish", "yt-player-updated"].forEach(function (evt) {
    document.addEventListener(evt, onNavigate, true);
    window.addEventListener(evt, onNavigate, true);
  });

  // Sicherheitsnetz für den ersten Seitenaufruf, falls bis dahin noch
  // kein data-ytsd-cfg gesetzt / kein Navigations-Event gefeuert wurde.
  setTimeout(function () {
    readCfg();
    apply();
    killCaptionsBurst();
  }, 1600);
})();
