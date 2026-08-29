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

  var LOG = "[YTSD]";
  // Diagnose-Ausgaben nur als console.debug (blenden sich standardmäßig aus,
  // sichtbar über die Log-Stufe "Verbose" in den DevTools).
  console.debug(LOG, "Wiedergabe-Script aktiv auf", location.pathname);

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
    console.debug(LOG, "Einstellungen geladen", settings);
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
    if (settings.showDislikes) updateDislikes(v);
    if (settings.disableAutoTranslate) fixTitle(v);
  }

  /* ---------- Dislike-Zahl ---------- */

  var dislikeCount = {}; // videoId -> Zahl | null

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

  function updateDislikes(v) {
    var n = dislikeCount[v];
    if (n === undefined) {
      dislikeCount[v] = null; // Platzhalter gegen Mehrfach-Abfragen
      try {
        chrome.runtime.sendMessage({ type: "ryd", videoId: v }, function (resp) {
          if (chrome.runtime.lastError) {
            console.debug(LOG, "Dislike-Abruf:", chrome.runtime.lastError.message);
          }
          dislikeCount[v] =
            resp && typeof resp.dislikes === "number" ? resp.dislikes : null;
          console.debug(LOG, "Dislikes für", v, "=", dislikeCount[v]);
          if (currentVideoId() === v) renderDislikes(v);
        });
      } catch (e) {
        console.debug(LOG, "sendMessage-Fehler:", e);
      }
      return;
    }
    renderDislikes(v);
  }

  function findDislikeButton() {
    var host = document.querySelector(
      "ytd-watch-metadata dislike-button-view-model, " +
        "dislike-button-view-model, " +
        "#segmented-dislike-button, " +
        "ytd-toggle-button-renderer#dislike-button, " +
        'segmented-like-dislike-button-view-model button[aria-label*="islike"]'
    );
    if (!host) {
      // Fallback: das zweite Segment neben dem Like-Button
      var seg = document.querySelector(
        "segmented-like-dislike-button-view-model, ytd-segmented-like-dislike-button-renderer"
      );
      if (seg) {
        var btns = seg.querySelectorAll("button");
        if (btns.length >= 2) return btns[1];
      }
      return null;
    }
    return host.tagName === "BUTTON" ? host : host.querySelector("button");
  }

  function renderDislikes(v) {
    var n = dislikeCount[v];
    if (n === null || n === undefined) return;

    // Anker = die komplette Like/Dislike-Pille (bzw. der Dislike-Container).
    // Die Zahl wird NEBEN die Pille gesetzt, nicht in den Button – der
    // Button schneidet zusätzlichen Text sonst ab.
    var btn = findDislikeButton();
    var anchor =
      document.querySelector(
        "ytd-watch-metadata segmented-like-dislike-button-view-model, " +
          "ytd-watch-metadata ytd-segmented-like-dislike-button-renderer, " +
          "segmented-like-dislike-button-view-model, " +
          "ytd-segmented-like-dislike-button-renderer"
      ) ||
      (btn &&
        btn.closest(
          "dislike-button-view-model, #segmented-dislike-button, ytd-toggle-button-renderer#dislike-button"
        )) ||
      btn;

    if (!anchor || !anchor.parentElement) {
      if (!renderDislikes._warned) {
        console.debug(LOG, "Dislike-Bereich noch nicht da – versuche es weiter");
        renderDislikes._warned = true;
      }
      return;
    }

    var label = compact(n);
    var host = anchor.parentElement;
    var txt = host.querySelector(":scope > .ytsd-dislike-count");

    if (
      txt &&
      txt.textContent === label &&
      txt.previousElementSibling === anchor
    ) {
      return; // schon korrekt platziert
    }

    if (!txt) {
      txt = document.createElement("span");
      txt.className = "ytsd-dislike-count";
      txt.title = "Dislikes – Schätzung von returnyoutubedislike.com";
    }
    txt.textContent = label;
    if (anchor.nextElementSibling !== txt) {
      anchor.insertAdjacentElement("afterend", txt);
    }
    console.debug(LOG, "Dislike-Zahl eingeblendet:", label);
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
    ".ytsd-dislike-count{" +
    "display:inline-flex !important;align-items:center;align-self:center;" +
    "visibility:visible !important;opacity:1 !important;" +
    "flex:0 0 auto;margin:0 4px 0 8px;padding:0;" +
    "font-family:'Roboto',Arial,sans-serif;font-size:1.4rem;line-height:2rem;" +
    "font-weight:500;white-space:nowrap;" +
    "color:var(--yt-spec-text-primary, currentColor)}";
  (document.head || document.documentElement).appendChild(st);
})();
