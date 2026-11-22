# Verbena — site de florărie

Un singur cod, două variante:

| Comandă | Ce obții | Pentru cine |
|---|---|---|
| `node build.js` (o face Netlify automat) | site cu panou de editare și comenzi trimise pe email | clienții tăi |
| `node build.js --vanzare` | folderul `vanzare`: site HTML simplu, se deschide direct din folder | tema de vânzare (Envato etc.) |

Nu sunt necesare pachete externe: doar Node.js.

## Unde e fiecare lucru

- **content/** — tot conținutul, editabil din panou:
  - `produse.json` — buchetele, cu mărimi, prețuri și câte o poză pe mărime
  - `tipuri.json` — tipurile de flori (fiecare are pagina ei: /flori/nume/)
  - `ocazii.json` — ocaziile (fiecare are pagina ei: /ocazii/nume/)
  - `acasa.json` — caruselul, avantajele, recenziile, livrarea, întrebările
  - `setari.json` — contact, ora limită, taxa de livrare, zile și intervale, metoda de primire a comenzilor
  - `texte.json` — textele interfeței (pregătit pentru o a doua limbă)
- **src/** — designul (`style.css`, culorile în primele rânduri) și logica magazinului (`app.js`)
- **admin/** — panoul de editare (Decap CMS) și transformarea automată a pozelor
- **images/uploads/** — pozele încărcate din panou

## Comenzile

`setari.json` → `comenzi_metoda`:
- `netlify` — comenzile și cererile „Te sunăm noi” ajung prin Netlify Forms, pe email
- `endpoint` — se trimit către un serviciu de formulare (de ex. Formspree); adresa în `comenzi_endpoint`
- `whatsapp` — clientul trimite comanda completă pe WhatsApp (implicit în versiunea de vânzare)

## Pozele

- orice poză încărcată în panou devine automat `.jpg`, micșorată și cu nume curat
- pe Netlify, pozele trec prin optimizarea automată de imagini
- fiecare poză are opțiunea „Încadrarea fotografiei” (implicit: centru)

## De făcut înainte de vânzare (finisaje)

- `texte-en.json` și traducerea conținutului demo în engleză
- documentația pentru cumpărători și pozele de prezentare
- 2–3 variante de culori
