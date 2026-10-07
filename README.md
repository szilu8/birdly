# birdly 🐦 – bemutató béta

Képküldő app, ahol a képeidet **madarak** viszik el az ismerőseid üzenőfalára.
A képek **24 óra** után eltűnnek, **20 óra** után pedig befeketedik a szélük.

Ez egy **kattintható bemutató prototípus** (nincs szerver, nincs regisztráció) –
arra jó, hogy meg lehessen mutatni, hogyan nézne ki és működne az app.

## Megnyitás

Elég egy egyszerű statikus szerver a repó gyökerében:

```bash
python3 -m http.server 8000
```

- Weboldal: http://localhost:8000/
- App (mobil nézet): http://localhost:8000/app/

Asztali gépen az app telefonkeretben jelenik meg, telefonon teljes képernyős.
Telefonon a böngésző „Hozzáadás a kezdőképernyőhöz” menüjével app-ként is elindítható.

## Mit tud a béta?

| Fül | Tartalom |
|---|---|
| 🏠 **Főoldal** | Ismerőseid madarai által hozott képek, „Úton feléd” sáv, hátralévő idő, befeketedő szélek 20 óra után |
| 🪺 **Madárház** | Madaraid statisztikákkal (kézbesítés / pihenés), állapot (bevethető / úton / pihen), tojáskeltetés (72 óra → véletlen madár), madárkatalógus |
| 👤 **Profil** | Ismerősök, elküldött képeid, beállítások (dísznek), **Bemutató mód** |

A 📷 gombbal képet küldhetsz: választasz képet (vagy saját feltöltést), címzettet és egy pihent madarat.

**Bemutató mód** (Profil fül alján): előre lehet tekerni az időt (+1 / +4 / +24 óra), így a prezentáció közben
látszik a képek befeketedése, a madarak pihenése és a tojás kikelése. A tojásnál van „Demo: kikeltetés most” gomb is.

## Madarak

| Madár | Kézbesítés | Pihenő |
|---|---|---|
| 🕊️ Galamb | 1 óra | 23 óra |
| 🦅 Sas | 15 perc | 24 óra |
| 🐦 Sólyom | 1 perc | 32 óra |

A tojásból kikelhet még néhány *példa* madár is (bagoly, papagáj, hattyú, flamingó, páva) – ezek értékei csak illusztrációk.
A fajok listája az `app/app.js` elején lévő `SPECIES` objektumban bővíthető.

## Fájlok

- `index.html` – bemutató weboldal (mellékes)
- `app/` – a mobilapp prototípusa (HTML + CSS + JS, build nélkül)
- `assets/icon.svg` – ikon

## Következő lépések (ötlet)

A valódi Android/iPhone apphoz javasolt egy közös kódbázisú keretrendszer (pl. React Native/Expo vagy Flutter),
mellé backend (felhasználók, ismerősök, képtárolás, időzített kézbesítés, push értesítés).
