/* Optionen: alle Einstellungen + Verwaltung der Blockliste. */

(function () {
  "use strict";

  var D = window.YTSD_DEFAULTS || {};
  var QUICK = [
    "instagram.com",
    "tiktok.com",
    "facebook.com",
    "x.com",
    "reddit.com",
    "9gag.com",
    "twitch.tv"
  ];

  var toggles = Array.prototype.slice.call(
    document.querySelectorAll("input[data-key]")
  );
  var savedEl = document.getElementById("saved");
  var listEl = document.getElementById("blocklist");
  var quickEl = document.getElementById("quickAdd");
  var form = document.getElementById("addForm");
  var input = document.getElementById("addInput");

  var state = Object.assign({}, D);
  var savedTimer = null;

  function flashSaved() {
    savedEl.classList.add("show");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () {
      savedEl.classList.remove("show");
    }, 1200);
  }

  function normalizeDomain(value) {
    var s = String(value || "").trim().toLowerCase();
    if (!s) return "";
    s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
    s = s.split("/")[0].split("?")[0].split("#")[0];
    return s;
  }

  /* ---------- Laden ---------- */

  chrome.storage.sync.get(D, function (res) {
    state = Object.assign({}, D, res);
    if (!Array.isArray(state.blocklist)) state.blocklist = [];
    toggles.forEach(function (t) {
      t.checked = !!state[t.dataset.key];
    });
    renderList();
    renderQuick();
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "sync") return;
    Object.keys(changes).forEach(function (k) {
      state[k] = changes[k].newValue;
    });
    toggles.forEach(function (t) {
      if (changes[t.dataset.key]) t.checked = !!state[t.dataset.key];
    });
    if (changes.blocklist) {
      if (!Array.isArray(state.blocklist)) state.blocklist = [];
      renderList();
      renderQuick();
    }
  });

  /* ---------- Umschalter ---------- */

  toggles.forEach(function (t) {
    t.addEventListener("change", function () {
      var patch = {};
      patch[t.dataset.key] = t.checked;
      state[t.dataset.key] = t.checked;
      chrome.storage.sync.set(patch, flashSaved);
    });
  });

  /* ---------- Blockliste ---------- */

  function saveList() {
    chrome.storage.sync.set({ blocklist: state.blocklist }, flashSaved);
  }

  function addDomain(value) {
    var d = normalizeDomain(value);
    if (!d) return;
    if (state.blocklist.indexOf(d) !== -1) return;
    state.blocklist = state.blocklist.concat(d).sort();
    saveList();
    renderList();
    renderQuick();
  }

  function removeDomain(d) {
    state.blocklist = state.blocklist.filter(function (x) {
      return x !== d;
    });
    saveList();
    renderList();
    renderQuick();
  }

  function renderList() {
    listEl.innerHTML = "";
    if (!state.blocklist.length) {
      var li = document.createElement("li");
      li.className = "empty";
      li.textContent = "Noch keine Website gesperrt.";
      listEl.appendChild(li);
      return;
    }
    state.blocklist.forEach(function (d) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.textContent = d;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Entfernen";
      btn.addEventListener("click", function () {
        removeDomain(d);
      });
      li.appendChild(name);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function renderQuick() {
    quickEl.querySelectorAll("button").forEach(function (b) {
      b.remove();
    });
    QUICK.forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "+ " + d;
      if (state.blocklist.indexOf(d) !== -1) b.disabled = true;
      b.addEventListener("click", function () {
        addDomain(d);
      });
      quickEl.appendChild(b);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addDomain(input.value);
    input.value = "";
    input.focus();
  });

  /* ---------- Fußzeile ---------- */

  document.getElementById("version").textContent =
    "Version " + chrome.runtime.getManifest().version;
})();
