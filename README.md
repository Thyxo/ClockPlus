# ClockPlus – falsk låseskærm

En PWA der ligner iPhonens låseskærm (iOS 26, dansk), hvor klokken i hemmelighed kan stilles frem, tilbage eller til et bestemt tidspunkt. Ren vanilla JS, ingen afhængigheder, intet build-trin – samme opbygning som Stopwatchplus og Calcplus.

Produktion: **https://clockplus.vercel.app** (push til `main` udgiver automatisk).

## Installér på iPhone
1. Åbn adressen i **Safari** → Del → **Føj til hjemmeskærm** (navnet er "Ur").
2. Åbn fra hjemmeskærmen: fuld skærm, virker offline.
3. Panel → **Udseende → Vælg billede**: vælg det samme billede som din rigtige låseskærm (fra Fotos). Teksten ligger i et separat lag ovenpå.

## Genveje
| Hvad | Sådan |
|---|---|
| Panel | 5 hurtige tryk øverst til højre |
| Panik (rigtig tid) | Hold øverst til venstre i 1 sek. |
| Hemmelig tid | Langt tryk (½ sek.) på uret |
| Sort skærm | Dobbelttryk · tryk vækker |
| Kode-skærm | Stryg op |
| Rul til rigtig tid | Usynlig knap i højre/venstre kant (synligt ned på 2-8 sek.) |
| Skjul Google-fodnote | Dobbelttryk på fodnoten |

## Tid (panelet)
- **Rigtig** · **Frem/tilbage** (−60 … +60 min, eller valgfrit) · **Tidspunkt** (fx 09.00)
- **Bagefter**:
  - *Kører normalt* – forskudt, men går som et ur
  - *Står stille* – frosset
  - *Venter på rigtig tid* – fx +5 min: står stille, indtil den rigtige tid når op
  - *Glider til rigtig tid* – går langsommere/hurtigere over 1-60 min (aldrig baglæns)
  - *Springer til rigtig tid* – efter 1-60 min
- Tiden starter, når du trykker **Færdig**.

## Hemmelige funktioner
- **Usynligt tastatur:** langt tryk på uret → i 8 sek. er skærmen et 3×4-tastatur (1 2 3 / 4 5 6 / 7 8 9 / ✕ 0 ✓). 4 cifre = TTMM (0 9 0 0 → 09.00). 1-2 cifre + ✓ = kun minutter.
- **Gemt tid:** langt tryk sætter i stedet en gemt tid (fx 09.00).
- **Kode-skærm:** stryg op og "tast koden" 0900 – den ryster som forkert kode, og efter Annuller står der 09.00.
- **Ved vækning:** dobbelttryk → sort skærm, tast i mørket, giv telefonen videre – de trykker, og tiden er ændret.
- **Hængelåsen blinker** kort, når et hemmeligt input er modtaget (kan slås fra).

## Hemmelig knap – rul til rigtig tid
En usynlig knap (64×120 pt) i højre eller venstre kant. Tryk (1 eller 2 gange) → fx +5 min tæller synligt ned minut for minut til den rigtige tid på 2-8 sek. Lodret placering kan justeres, og *Vis knappen i 2 sek.* viser hvor den er. Tryk Færdig i panelet for at starte forskydningen igen.

## Google-peek (fodnote)
Fake Google (soeg.vercel.app) skriver tilskuerens søgning til relæet. ClockPlus viser ordet som en lille, stille tekst på baggrunden – uden lyd, vibration eller animation.

1. Panel → **Mere → Forbindelse**: skriv samme rumkode som i Noter+, Stopur og Lommeregner. Uden kode virker appen præcis som før.
2. **Google-fodnote** (standard til):
   - Placering: **Bund** (mellem lommelygte og kamera), **Under uret** eller **Hjørne** (øverst til venstre)
   - Størrelse, synlighed (standard 25 %) og skrift (normal / som uret)
   - **Vis live**: ordet kommer, mens de skriver (`googleLive`)
   - **Skjul automatisk** efter 2/5/10/30 min (standard 10) eller aldrig
   - **Dobbelttryk på fodnoten** skjuler den. Panelet viser sidste ord og har *Skjul ordet nu*.
3. Kun nye ord: et ord bruges kun, hvis dets `at` er nyere end det sidste (`gMem.googleAt` gemmes), så et gammelt ord ikke dukker op igen efter genstart. Ved ny rumkode tæller kun ord, der kommer derefter. Lange ord afkortes med "…".

Relæ: `https://relay-production-03f5.up.railway.app/r/{rum}` (`src/link.js` er en uændret kopi fra Stopwatchplus – ret dér og kopiér ind igen).

Test: `curl -X POST -H 'Content-Type: text/plain' -d '{"google":{"q":"fortnite","at":'$(date +%s000)'}}' https://relay-production-03f5.up.railway.app/r/<rum>`

## Udseende
Baggrund (zoom/placering/mørkere), 5 skrifter som iOS (standard SF, rundet, serif/New York, smal, mono), tykkelse, størrelse, højde (iOS 26-"højt" ur), farve, glas-effekt, `21.16`/`21:16`, 12/24 t, dato/egen tekst/ingen, kort dato (man. 2. nov.), tekst i bunden, hængelås, streg under batteriet, lommelygte/kamera (symboler klippet ud af en rigtig iOS 26-låseskærm, glasknapper målt til 57 pt), hjemmebjælke.

## Kendte begrænsninger
- iPhonens egen statuslinje (øverst til venstre) viser altid den rigtige tid i en webapp – den kan ikke skjules.
- Den rigtige låseskærms skrift er SF Pro; den bruges automatisk på iPhone. På Android/PC bruges systemets skrift.

## Udvikling
```bash
npm test     # tidsmotoren (src/clock.js) og Google-fodnoten (src/gnote.js)
npm run dev  # http://localhost:5173
```
Hæv `VERSION` i `sw.js`, når filer ændres.
