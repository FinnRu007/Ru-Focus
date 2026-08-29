/* Popup: schnelle Umschalter, direkt in chrome.storage.sync gespeichert. */

(function () {
  "use strict";

  var D = window.YTSD_DEFAULTS || {};
  var inputs = Array.prototype.slice.call(
    document.querySelectorAll("input[data-key]")
  );
  var savedEl = document.getElementById("saved");
  var savedTimer = null;

  function flashSaved() {
    savedEl.classList.add("show");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () {
      savedEl.classList.remove("show");
    }, 1200);
  }

  var keys = inputs.map(function (i) {
    return i.dataset.key;
  });
  var query = {};
  keys.forEach(function (k) {
    query[k] = D[k];
  });

  chrome.storage.sync.get(query, function (res) {
    inputs.forEach(function (input) {
      input.checked = !!res[input.dataset.key];
    });
  });

  inputs.forEach(function (input) {
    input.addEventListener("change", function () {
      var patch = {};
      patch[input.dataset.key] = input.checked;
      chrome.storage.sync.set(patch, flashSaved);
    });
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "sync") return;
    inputs.forEach(function (input) {
      var c = changes[input.dataset.key];
      if (c) input.checked = !!c.newValue;
    });
  });

  document.getElementById("openOptions").addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
  });

  var v = chrome.runtime.getManifest().version;
  document.getElementById("version").textContent = "v" + v;
})();
