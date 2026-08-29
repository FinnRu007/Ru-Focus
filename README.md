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
- **Dislikes anzeigen** – blendet die „Mag ich nicht“-Zahl am Video wieder ein.
  Daten von [returnyoutubedislike.com](https://returnyoutubedislike.com) –
  eine Schätzung auf Basis öffentlich verfügbarer Daten, keine exakten Zahlen.
- **Automatische Übersetzung deaktivieren** – setzt automatisch übersetzte
  Video-Titel zurück auf das Original (via oEmbed) und schaltet – sofern der
  Player das zulässt – die automatisch gewählte übersetzte Audiospur zurück auf
  den Originalton.
- **Keine automatischen Untertitel** – schaltet automatisch eingeblendete
  Untertitel beim Videostart ab. Manuelles Einschalten bleibt möglich.
- **Startlautstärke festlegen** – Regler in den Optionen (0–100 %). Jede neue
  Wiedergabe startet mit dieser Lautstärke. Standardmäßig aus – dann ändert die
  Erweiterung nichts an der Lautstärke.
- **Website-Blocker** – frei wählbare Domains (z. B. `instagram.com`) werden beim
  Aufruf auf eine Hinweisseite umgeleitet. Von dort lässt sich eine Seite bei
  Bedarf für 10 Minuten freischalten.
- **Cookie-Banner automatisch ablehnen** – versucht auf jeder Website, alle
  optionalen Cookies abzulehnen: über die Buttons der gängigen Consent-Tools
  (OneTrust, Cookiebot, Didomi, Usercentrics, Sourcepoint, Quantcast, TrustArc,
  Osano, CookieYes …), auch wenn diese in einem offenen Shadow-DOM oder in einem
  iframe stecken, und zusätzlich über einen Text-Abgleich. Klappt nicht bei
  jedem Anbieter, deckt aber die meisten großen Seiten ab.

Jede Funktion lässt sich einzeln an- und abschalten – schnell über das
Symbol-Popup, ausführlich über die Optionsseite.

## Installation

1. Dieses Repository herunterladen (Code → *Download ZIP*) und entpacken – oder
   `git clone`.
2. In Chrome `chrome://extensions` öffnen.
3. Oben rechts den **Entwicklermodus** einschalten.
4. **Entpackte Erweiterung laden** klicken und den Ordner auswählen, in dem die
   Datei `manifest.json` **direkt** liegt.

> Fehler „Manifest-Datei fehlt oder ist nicht lesbar“? Dann wurde ein Ordner zu
> weit oben ausgewählt. Nach dem Entpacken mit dem Windows-Explorer entsteht oft
> ein Ordner im Ordner (`…/youtube-shorts-deaktivieren/youtube-shorts-deaktivieren/`).
> Eine Ebene tiefer gehen, bis `manifest.json` direkt sichtbar ist.

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
  content-player.js      Dislike-Zahl + Titel-Übersetzung rückgängig (isoliert)
  player-main.js         Startlautstärke / Auto-Untertitel / Audiospur
                         (läuft in der Seite, world: MAIN – nur so ist die
                         YouTube-Player-API erreichbar)
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
| `host_permissions: <all_urls>` | Shorts auf YouTube, Cookie-Banner auf beliebigen Seiten, Abruf der Dislike-Zahl von `returnyoutubedislikeapi.com` |

Die Erweiterung sendet keine personenbezogenen Daten. Einzige ausgehende Anfrage:
bei aktivierter Dislike-Anzeige wird die Video-ID an
`returnyoutubedislikeapi.com` geschickt, um die Dislike-Zahl abzurufen. Kein
eigenes Backend, kein Tracking, keine Analytics.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
