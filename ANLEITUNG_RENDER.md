# Preiten Games gratis online stellen (GitHub + Render)

Du bekommst ZWEI Gratis-Dienste auf Render:
1. **preiten-games** – deine Startseite + Die Hotte Preiten Line (Ordner `Downloads\preiten-website`)
2. **preitenwars** – OpenFront/PreitenWars mit eigenem Spielserver (Ordner `Downloads\asfdasdfasdf\OpenFrontIO`)

Vorher einmal: Konten auf **github.com** und **render.com** anlegen (beide gratis), und
**Git für Windows** installieren (git-scm.com), falls noch nicht da.

## Schritt 1: Startseite hochladen
1. GitHub: rechts oben **+ -> New repository**, Name `preiten-games`, Public, *Create*.
2. **uploading an existing file** klicken, den INHALT von `preiten-website` reinziehen
   (`public`, `server.js`, `package.json`, `.gitignore`, ...), *Commit changes*.
3. Render: **New + -> Web Service** -> Repo `preiten-games` -> Runtime **Node**,
   Build `npm install`, Start `npm start`, Instance **Free** -> *Create Web Service*.
   -> Seite läuft unter `https://preiten-games.onrender.com` (Name kann abweichen).

## Schritt 2: PreitenWars (OpenFront) hochladen
Zu groß für den Web-Upload, darum mit Git. GitHub: neues **leeres** Repo `preitenwars` (Public,
OHNE README). Dann im Ordner `Downloads\asfdasdfasdf\OpenFrontIO` ein Terminal öffnen
(Rechtsklick -> "In Terminal öffnen") und eingeben (DEIN-NAME = dein GitHub-Name):

    git checkout --orphan preiten
    git add -A
    git commit -m "PreitenWars"
    git push https://github.com/DEIN-NAME/preitenwars.git preiten:main

(`--orphan` = nur der aktuelle Stand wird hochgeladen, ohne die alte OpenFront-Geschichte mit den
geschützten Logo-Dateien. Beim ersten Push fragt Windows nach deinem GitHub-Login.)

Render: **New + -> Blueprint** -> Repo `preitenwars` auswählen -> Render liest die Datei
`render.yaml` und richtet alles automatisch ein -> *Apply*. Der erste Build dauert 5-10 Minuten.
-> Läuft unter `https://preitenwars.onrender.com` (oder ähnlich).

## Schritt 3: Seiten verbinden
- In `preiten-website/public/config.js` bei PreitenWars die echte Adresse eintragen (`url: "https://..."`).
- In `preiten-website/public/index.html` unten `DEIN-NAME` durch deinen GitHub-Namen ersetzen
  (Link zum Quellcode – das verlangt die AGPL-Lizenz von OpenFront, wenn du es öffentlich hostest).
- Geänderte Dateien bei GitHub im Repo `preiten-games` neu hochladen -> Render aktualisiert automatisch.

## Gut zu wissen
- Gratis-Dienste schlafen nach 15 Min ohne Besucher ein; der erste Aufruf dauert dann ~30-60 s.
- PreitenWars hat im Gratis-Plan 512 MB Speicher: für dich und ein paar Freunde reicht das,
  für viele gleichzeitige Spiele nicht.
- Die OpenFront-Grafiken (CC BY-SA) brauchen die Nennung "OpenFront" – steht schon unten auf der Seite.
- Neues Spiel: Ordner nach `public/games/<name>/` + Eintrag in `public/config.js`.
- Lokal testen: `Website lokal starten.bat` (braucht Node.js).
