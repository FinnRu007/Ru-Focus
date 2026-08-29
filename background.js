/* ============================================================
   Service-Worker
   ------------------------------------------------------------
   Baut aus der Blockliste dynamische declarativeNetRequest-Regeln,
   die gesperrte Domains auf ui/blocked.html umleiten. Verwaltet
   außerdem die zeitlich begrenzte Freischaltung ("Snooze").
   ============================================================ */

importScripts("src/defaults.js");

// IDs ab diesem Wert gehören der Blockliste (damit sie eindeutig sind).
const RULE_OFFSET = 1000;
const SNOOZE_KEY = "ytsdSnooze";

/* ---------- Helfer ---------- */

function normalizeDomain(input) {
  let s = String(input || "").trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split("/")[0].split("?")[0].split("#")[0];
  return s;
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(YTSD_DEFAULTS);
  return Object.assign({}, YTSD_DEFAULTS, stored);
}

async function getSnoozeMap() {
  const res = await chrome.storage.local.get({ [SNOOZE_KEY]: {} });
  return res[SNOOZE_KEY] || {};
}

async function setSnoozeMap(map) {
  await chrome.storage.local.set({ [SNOOZE_KEY]: map });
}

async function activeSnoozedDomains() {
  const map = await getSnoozeMap();
  const now = Date.now();
  return Object.keys(map).filter((d) => map[d] > now);
}

/* ---------- Regeln neu aufbauen ---------- */

async function rebuildRules() {
  const settings = await getSettings();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  let addRules = [];

  if (settings.blockEnabled && Array.isArray(settings.blocklist)) {
    const domains = [
      ...new Set(settings.blocklist.map(normalizeDomain).filter(Boolean))
    ];
    const snoozed = await activeSnoozedDomains();
    const blockedPage = chrome.runtime.getURL("ui/blocked.html");

    addRules = domains
      .filter((d) => !snoozed.includes(d))
      .map((d, i) => ({
        id: RULE_OFFSET + i,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { url: blockedPage + "?d=" + encodeURIComponent(d) }
        },
        condition: {
          urlFilter: "||" + d + "/",
          resourceTypes: ["main_frame"]
        }
      }));
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

/* ---------- Snooze ---------- */

async function snoozeDomain(domain, minutes) {
  const d = normalizeDomain(domain);
  if (!d) return { ok: false };
  const mins = Math.max(1, Math.min(720, minutes || 10));
  const until = Date.now() + mins * 60 * 1000;

  const map = await getSnoozeMap();
  map[d] = until;
  await setSnoozeMap(map);

  await chrome.alarms.create("unsnooze:" + d, { when: until + 1000 });
  await rebuildRules();
  return { ok: true, until };
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("unsnooze:")) return;
  const d = alarm.name.slice("unsnooze:".length);
  const map = await getSnoozeMap();
  delete map[d];
  await setSnoozeMap(map);
  await rebuildRules();
});

/* ---------- Nachrichten aus den Erweiterungs-Seiten ---------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === "snooze") {
    snoozeDomain(msg.domain, msg.minutes).then(sendResponse);
    return true; // asynchrone Antwort
  }

  if (msg.type === "rebuild") {
    rebuildRules().then(() => sendResponse({ ok: true }));
    return true;
  }
});

/* ---------- Auslöser ---------- */

chrome.runtime.onInstalled.addListener(rebuildRules);
chrome.runtime.onStartup.addListener(rebuildRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.blocklist || changes.blockEnabled) {
    rebuildRules();
  }
});
