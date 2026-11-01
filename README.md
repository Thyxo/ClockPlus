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

## Udseende
Baggrund (zoom/placering/mørkere), 5 skrifter som iOS (standard SF, rundet, serif/New York, smal, mono), tykkelse, størrelse, højde (iOS 26-"højt" ur), farve, glas-effekt, `21.16`/`21:16`, 12/24 t, dato/egen tekst/ingen, hængelås, lommelygte/kamera, hjemmebjælke.

## Kendte begrænsninger
- iPhonens egen statuslinje (øverst til venstre) viser altid den rigtige tid i en webapp – den kan ikke skjules.
- Den rigtige låseskærms skrift er SF Pro; den bruges automatisk på iPhone. På Android/PC bruges systemets skrift.

## Udvikling
```bash
npm test     # tidsmotoren (src/clock.js)
npm run dev  # http://localhost:5173
```
Hæv `VERSION` i `sw.js`, når filer ændres.
