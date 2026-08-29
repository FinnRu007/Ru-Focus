/* ============================================================
   Content-Script für youtube.com (isolierter Kontext)
   ------------------------------------------------------------
   - liest die Einstellungen und reicht die player-relevanten
     über das Attribut data-ytsd-cfg an src/player-main.js weiter
   - blendet die Dislike-Zahl ein (Quelle: returnyoutubedislike.com)
   - macht übersetzte Video-Titel wieder zum Original
   ============================================================ */

(function () {
  "use strict";

  var D = typeof YTSD_DEFAULTS !== "undefined" ? YTSD_DEFAULTS : {};
  var settings = Object.assign({}, D);

  /* ---------- Einstellungen an die Seite (MAIN world) ----------
     Übergabe über ein Attribut an <html> – funktioniert unabhängig
     von postMessage-Feinheiten, weil das DOM geteilt wird.          */

  function pushToMain() {
    try {
      document.documentElement.setAttribute(
        "data-ytsd-cfg",
        JSON.stringify({
          setStartVolume: !!settings.setStartVolume,
          startVolume: settings.startVolume,
          disableAutoCaptions: !!settings.disableAutoCaptions,
          disableAutoTranslate: !!settings.disableAutoTranslate
        })
      );
    } catch (e) {}
  }

  chrome.storage.sync.get(D, function (res) {
    settings = Object.assign({}, D, res);
    pushToMain();
    tick();
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "sync") return;
    Object.keys(changes).forEach(function (k) {
      settings[k] = changes[k].newValue;
    });
    pushToMain();
  });

  /* ---------- Takt ---------- */

  function currentVideoId() {
    try {
      if (location.pathname === "/watch") {
        return new URLSearchParams(location.search).get("v");
      }
    } catch (e) {}
    return null;
  }

  setInterval(tick, 700);
  window.addEventListener(
    "yt-navigate-finish",
    function () {
      pushToMain();
      setTimeout(tick, 250);
    },
    true
  );

  function tick() {
    var v = currentVideoId();
    if (!v) return;
    if (settings.showDislikes) injectDislikes(v);
    if (settings.disableAutoTranslate) fixTitle(v);
  }

  /* ---------- Dislike-Zahl ---------- */

  var dislikeCache = {};

  function compact(n) {
    try {
      return new Intl.NumberFormat(navigator.language || "de", {
        notation: "compact",
        maximumFractionDigits: 1
      }).format(n);
    } catch (e) {
      return String(n);
    }
  }

  function injectDislikes(v) {
    var btn = document.querySelector(
      "ytd-watch-metadata dislike-button-view-model button, " +
        "dislike-button-view-model button, " +
        "#segmented-dislike-button button, " +
        "ytd-toggle-button-renderer#dislike-button button, " +
        'button[aria-label*="Dislike" i], ' +
        'button[aria-label*="Mag ich nicht" i]'
    );
    if (!btn) return;
    if (btn.getAttribute("data-ytsd-vid") === v) return;

    var n = dislikeCache[v];
    if (n === undefined) {
      dislikeCache[v] = null; // verhindert parallele Mehrfach-Abfragen
      fetch(
        "https://returnyoutubedislikeapi.com/votes?videoId=" +
          encodeURIComponent(v)
      )
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (d) {
          dislikeCache[v] =
            d && typeof d.dislikes === "number" ? d.dislikes : null;
        })
        .catch(function () {});
      return;
    }
    if (n === null) return;

    btn.setAttribute("data-ytsd-vid", v);
    var label = compact(n);
    var txt = btn.querySelector(
      ".yt-spec-button-shape-next__button-text-content"
    );
    if (!txt) {
      txt = document.createElement("div");
      txt.className = "yt-spec-button-shape-next__button-text-content";
      btn.appendChild(txt);
    }
    txt.textContent = label;
    txt.classList.add("ytsd-dislike-count");
    btn.style.width = "auto";
    btn.setAttribute("aria-label", label + " „Mag ich nicht“-Angaben");
  }

  /* ---------- übersetzten Titel zurücksetzen ---------- */

  var titleCache = {};

  function applyTitle(orig) {
    var h1 = document.querySelector(
      "ytd-watch-metadata h1 yt-formatted-string, " +
        "ytd-watch-metadata h1 .yt-core-attributed-string, " +
        "ytd-watch-metadata #title h1"
    );
    if (h1 && h1.textContent.trim() && h1.textContent.trim() !== orig) {
      h1.textContent = orig;
    }
    if (/-\s*YouTube\s*$/.test(document.title) && document.title.indexOf(orig) !== 0) {
      document.title = orig + " - YouTube";
    }
  }

  function fixTitle(v) {
    var orig = titleCache[v];
    if (orig === undefined) {
      titleCache[v] = null;
      fetch(
        "https://www.youtube.com/oembed?format=json&url=" +
          encodeURIComponent("https://www.youtube.com/watch?v=" + v)
      )
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (d) {
          titleCache[v] = d && d.title ? d.title : null;
          if (titleCache[v] && currentVideoId() === v) applyTitle(titleCache[v]);
        })
        .catch(function () {});
      return;
    }
    if (orig) applyTitle(orig);
  }

  /* ---------- kleine Stil-Ergänzung für die Dislike-Zahl ---------- */

  var st = document.createElement("style");
  st.textContent =
    ".ytsd-dislike-count{margin-left:6px;display:inline-block !important}";
  (document.head || document.documentElement).appendChild(st);
})();
