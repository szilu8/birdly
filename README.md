# birdly 🐦

Képküldő app, ahol a képeidet **madarak** viszik el az ismerőseid üzenőfalára.
A képek **24 óra** után eltűnnek, **20 óra** után pedig befeketedik a szélük.

**Aktuális verzió: 0.7.0** – az első publikálásra szánt kiadás. A 0.x verziószám jelzi,
hogy az app még nincs teljesen kész, de közel van a véglegeshez.

## Mappák

| Mappa | Tartalom |
|---|---|
| `mobile/` | **A valódi Android + iPhone app** (Expo / React Native, TypeScript) |
| `supabase/` | Szerver: adatbázis séma és játékszabályok (`migrations/`), szerverfüggvények (`functions/`), ütemező (`setup/`), tesztek (`tests/`) |
| `docs/TELEPITES.md` | **Lépésről lépésre útmutató** a szerver beállításához és a boltokba való kiadáshoz |
| `index.html`, `assets/` | Bemutató weboldal (GitHub Pages) |
| `app/` | A korábbi kattintható bemutató prototípus (böngészőben fut, szerver nélkül) |

## Mit tud a 0.7?

- **Fiók:** regisztráció e-mail címmel és egyedi felhasználónévvel, belépés, kijelentkezés, fiók végleges törlése
- **Ismerősök:** jelölés felhasználónév alapján, elfogadás / elutasítás, törlés
- **🏠 Főoldal:** az ismerősök madarai által hozott képek; „Úton feléd” sáv visszaszámlálással;
  20 óra után befeketedő szél; 24 óra után a kép eltűnik (a szerverről is törlődik); „Tetszik”
- **📷 Küldés:** fotó a kamerával vagy a galériából, felirat, címzett, pihent madár kiválasztása
- **🪺 Madárház:** madarak statisztikákkal és állapottal (bevethető / úton / pihen), átnevezés;
  keltető 2 fészekkel, 72 órás tojások, 3 naponta egy ingyenes tojás, véletlen kikelés; madárkatalógus
- **👤 Profil:** ismerősök, beérkezett jelölések, elküldött képek állapota, beállítások
- **🔔 Push értesítések:** megérkezett egy madár, kikelt egy tojás, kipihente magát egy madár
- Minden játékszabály (időzítés, pihenés, kikelés) **a szerveren** fut, így nem lehet csalni

### Madarak

| Madár | Kézbesítés | Pihenő | Kikelési esély |
|---|---|---|---|
| 🕊️ Galamb | 1 óra | 23 óra | 60% |
| 🦅 Sas | 15 perc | 24 óra | 30% |
| 🐦 Sólyom | 1 perc | 32 óra | 10% |

Új faj a `species` táblába vehető fel (az adatbázisban már előkészítve, kikapcsolva: bagoly, papagáj,
hattyú, flamingó, páva – az `enabled` mező átállításával bekapcsolhatók).

## Gyors indítás

Lásd: [docs/TELEPITES.md](docs/TELEPITES.md)

```bash
cd mobile && cp .env.example .env   # Supabase URL + publishable kulcs
npm install && npx expo start
```
