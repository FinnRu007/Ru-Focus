/* Blockier-Seite: zeigt die gesperrte Domain und bietet eine
   10-Minuten-Freischaltung an. */

(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var domain = (params.get("d") || "").toLowerCase().replace(/[^a-z0-9.\-]/g, "");

  var domainEl = document.getElementById("domain");
  var noteEl = document.getElementById("note");
  var unlockBtn = document.getElementById("unlock");

  domainEl.textContent = domain || "unbekannte Seite";
  if (!domain) unlockBtn.disabled = true;

  document.getElementById("back").addEventListener("click", function () {
    if (history.length > 1) history.back();
    else location.href = "https://www.google.com";
  });

  document.getElementById("settings").addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
  });

  unlockBtn.addEventListener("click", function () {
    unlockBtn.disabled = true;
    unlockBtn.textContent = "Wird freigeschaltet …";
    chrome.runtime.sendMessage(
      { type: "snooze", domain: domain, minutes: 10 },
      function (res) {
        if (res && res.ok) {
          noteEl.hidden = false;
          noteEl.textContent = "Freigeschaltet – Seite wird geöffnet …";
          setTimeout(function () {
            location.href = "https://" + domain;
          }, 500);
        } else {
          unlockBtn.disabled = false;
          unlockBtn.textContent = "Für 10 Minuten freischalten";
          noteEl.hidden = false;
          noteEl.textContent = "Freischaltung fehlgeschlagen. Bitte erneut versuchen.";
        }
      }
    );
  });
})();
