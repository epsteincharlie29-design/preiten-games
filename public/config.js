// =====================================================================
//  PREITEN GAMES – Einstellungen
//  Hier trägst du deine Spiele ein. Mehr musst du nicht anfassen.
// =====================================================================
window.PREITEN_CONFIG = {
  games: [
    {
      id: "hotte-preiten-line",
      title: "Die Hotte Preiten Line",
      description:
        "Russian Hacker Boi hat das TEBLEEDD geklaut! Erledige als Lil Preitner seine Aufträge, kämpfe gegen Bosse, fahr durch die Stadt – allein oder online im Koop.",
      tags: ["Action", "Story", "Koop"],
      url: "games/hotte-preiten-line/index.html", // liegt direkt auf dieser Website
      art: "image",
      image: "games/hotte-preiten-line/face_open.png",
      label: "#9b5de5",
    },
    {
      id: "preitenwars",
      title: "PreitenWars",
      description:
        "Erobere die Welt! Breite dein Reich aus, schick Truppen und Boote los und kämpfe gegen Bots oder deine Freunde.",
      tags: ["Strategie", "Multiplayer", "Solo"],
      // >>> Nach dem Render-Start hier deine PreitenWars-Adresse eintragen (Anleitung Schritt 3)
      url: "https://preitenwars.onrender.com",

      art: "wars", // eingebaute Pixel-Grafik
      label: "#e0262c", // Farbe des Modul-Etiketts
    },
    {
      id: "soon-1",
      title: "Bald verfügbar",
      description: "Hier kommt bald ein neues Preiten-Spiel hin.",
      tags: ["???"],
      url: null, // null = gesperrtes Modul
      art: "question",
      label: "#1fa83d",
    },
  ],
};
