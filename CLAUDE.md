# CLAUDE.md

Statisk PWA uden build: falsk iPhone-låseskærm (dansk UI) med hemmelig tidsstilling. Se README.md for funktioner.

- `src/clock.js` – ren tidsmotor (plan → anker → vist tid). Testes med `npm test`. Vist tid må aldrig gå baglæns – undtagen den hemmelige rul-knap (`rollAnchor`), der bevidst tæller synligt ned på få sekunder.
- `src/settings.js` – indstillinger i localStorage (`clockplus-v1`), baggrund i IndexedDB (`clockplus`/`files`/`wallpaper`).
- `src/app.js` – DOM, bevægelser (5 tryk øverst til højre = panel, langt tryk på uret = hemmeligt input, stryg op = kode-skærm, dobbelttryk = sort skærm, hold øverst til venstre = panik, usynlig knap i venstre/højre kant = rul til rigtig tid) og panel.
- `sw.js` – hæv `VERSION`, når filer ændres.
- Vercel-projekt `clockplus` (team thyxo's projects), push til `main` udgiver.
- UI-tekst på dansk. Baggrund og tekst skal forblive separate lag.
