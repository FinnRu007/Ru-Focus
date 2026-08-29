# YouTube Shorts deaktivieren

Chrome-Erweiterung (Manifest V3), die YouTube entrümpelt und beim Fokussieren
hilft:

- **Shorts ausblenden** – entfernt Shorts-Regale auf Startseite, Abos, Suche und
  im Seitenmenü. Shorts in Videolisten werden ebenfalls entfernt.
- **Shorts-Links umleiten** – `youtube.com/shorts/<id>` öffnet automatisch im
  normalen Videoplayer (`/watch?v=<id>`).
- **Playables ausblenden** – blendet die YouTube-Spiele aus.
- **Umfragen & Hinweise ausblenden** – Umfragen, Feedback-Abfragen und
  „Nudge“-Einblendungen im Feed.
- **Website-Blocker** – frei wählbare Domains (z. B. `instagram.com`) werden beim
  Aufruf auf eine Hinweisseite umgeleitet. Von dort lässt sich eine Seite bei
  Bedarf für 10 Minuten freischalten.
- **Cookie-Banner automatisch ablehnen** – versucht auf jeder Website, alle
  optionalen Cookies abzulehnen (über die Buttons der gängigen Consent-Tools
  wie OneTrust, Cookiebot, Didomi, Usercentrics, Quantcast … und zusätzlich
  über einen Text-Abgleich).

Jede Funktion lässt sich einzeln an- und abschalten – schnell über das
Symbol-Popup, ausführlich über die Optionsseite.

## Installation

1. Dieses Repository herunterladen (Code → *Download ZIP*) und entpacken – oder
   `git clone`.
2. In Chrome `chrome://extensions` öffnen.
3. Oben rechts den **Entwicklermodus** einschalten.
4. **Entpackte Erweiterung laden** klicken und den entpackten Ordner
   (der Ordner mit der `manifest.json`) auswählen.

Funktioniert genauso in Edge, Brave und anderen Chromium-Browsern.

## Einstellungen

- **Popup** (Klick auf das Symbol): die wichtigsten Schalter.
- **Optionen** (Rechtsklick auf das Symbol → *Optionen*, oder über das Popup):
  alle Schalter plus die Verwaltung der blockierten Websites.

Alle Einstellungen werden in `chrome.storage.sync` gespeichert und – sofern
Chrome-Sync aktiv ist – zwischen den eigenen Geräten synchronisiert.

## Aufbau

```
manifest.json           Manifest V3
background.js            Service-Worker: baut die Blockregeln (declarativeNetRequest)
src/
  defaults.js            Standard-Einstellungen (in jeden Kontext geladen)
  content-youtube.js     blendet Shorts/Playables/Umfragen aus, leitet Shorts um
  content-cookies.js     lehnt Cookie-Banner ab
ui/
  popup.*                Symbol-Popup
  options.*              Optionsseite inkl. Blocklisten-Verwaltung
  blocked.*              Hinweisseite für gesperrte Websites
icons/                   16 / 32 / 48 / 128 px
```

## Berechtigungen

| Berechtigung | Wofür |
| --- | --- |
| `storage` | Einstellungen speichern |
| `declarativeNetRequest` | gesperrte Domains auf die Hinweisseite umleiten |
| `alarms` | die 10-Minuten-Freischaltung nach Ablauf zurücksetzen |
| `host_permissions: <all_urls>` | Shorts-Ausblenden auf YouTube und Cookie-Banner auf beliebigen Seiten |

Die Erweiterung sendet keinerlei Daten nach außen – es gibt kein Backend, kein
Tracking, keine Analytics.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
