# birdly 0.7 – telepítési és kiadási útmutató

Ez az útmutató végigvezet azon, hogyan lesz a kódból működő, letölthető app.
A lépéseket sorrendben érdemes végigcsinálni.

| Rész | Mire kell | Költség |
|---|---|---|
| **Supabase** | szerver: fiókok, képek, madarak időzítése | ingyenes kerettel indul |
| **Expo / EAS** | az Android és iPhone app felépítése és feltöltése | ingyenes kerettel indul |
| **Google Play fejlesztői fiók** | Android kiadás | 25 USD egyszeri |
| **Apple Developer Program** | iPhone kiadás | 99 USD / év |

---

## 1. Supabase projekt létrehozása

1. Regisztrálj a https://supabase.com oldalon, és hozz létre egy új projektet.
   - **Region:** `Central EU (Frankfurt)` – így az adatok az EU-ban maradnak.
   - Az adatbázis-jelszót mentsd el.
2. **Adatbázis:** Dashboard → **SQL Editor** → *New query* → másold be a
   `supabase/migrations/20261007000000_birdly_v07.sql` fájl teljes tartalmát → **Run**.
   Ez létrehozza a táblákat, a játékszabályokat és a `photos` képtárolót.
3. **Bejelentkezés beállítása:** Dashboard → **Authentication** → **Sign In / Providers** → *Email*:
   - „Confirm email” legyen **bekapcsolva** (regisztrációkor megerősítő e-mail megy ki).
   - Ajánlott: **Authentication → Emails** alatt a sablonokat magyarra fordítani.
   - Éles használathoz saját SMTP (e-mail küldő) beállítása ajánlott, mert a beépített óránként csak néhány e-mailt küld.
4. **Kulcsok:** Dashboard → **Project Settings → API Keys**. Ezekre lesz szükség:
   - *Project URL* (pl. `https://abcdefghijkl.supabase.co`)
   - *Publishable key* (vagy régi néven *anon key*) – ez mehet az appba.
   - A *secret / service_role* kulcsot **soha ne** tedd az appba vagy a GitHubra!

## 2. Szerverfüggvények (értesítések, takarítás, fióktörlés)

Ehhez kell egy gép, amin van Node.js (https://nodejs.org). A repó gyökerében:

```bash
npx supabase login
npx supabase link --project-ref <PROJEKT_AZONOSÍTÓ>   # a Project URL első része
# (ha a link azt kéri, előbb futtasd: npx supabase init  – a meglévő fájlokat nem írja felül)

# Egy hosszú, véletlen titkos szöveg az ütemezőhöz (bármi lehet, pl. jelszógenerátorból):
npx supabase secrets set CRON_SECRET=<HOSSZÚ_VÉLETLEN_SZÖVEG>

npx supabase functions deploy tick --no-verify-jwt
npx supabase functions deploy delete-account
```

Ezután az **SQL Editorban** futtasd le a `supabase/setup/cron.sql` fájlt, a két `<...>` értéket kicserélve.
Innentől percenként lefut a `tick`: push értesítést küld, és törli a 24 óránál régebbi képeket.

## 3. Az app kipróbálása a saját telefonodon

```bash
cd mobile
cp .env.example .env        # majd írd be a Supabase URL-t és a publishable kulcsot
npm install
npx expo start
```

- A megjelenő QR-kódot az **Expo Go** appal (App Store / Google Play) beolvasva az app elindul a telefonodon.
- Az Expo Go-ban a **push értesítések nem működnek**, minden más igen. A teljes élményhez fejlesztői build kell (lásd lent).

## 4. Expo / EAS beállítása (egyszer)

```bash
cd mobile
npx eas-cli@latest login            # Expo fiók: https://expo.dev/signup
npx eas-cli@latest init             # beírja az app.json-ba a projectId-t (ez kell a push értesítésekhez)
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value <URL> --environment production --environment preview --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_KEY --value <KULCS> --environment production --environment preview --visibility plaintext
```

**Fontos:** az `app.json`-ban a `com.birdly.app` azonosító (iOS `bundleIdentifier`, Android `package`)
az egész világon egyedi kell legyen. Ha a bolt azt írja, hogy foglalt, írd át például `hu.<neved>.birdly`-re,
**még az első feltöltés előtt** – később már nem lehet megváltoztatni.

### Push értesítések
- **Android:** kell egy Firebase projekt (ingyenes) és annak FCM kulcsa feltöltve az Expóhoz:
  `npx eas-cli@latest credentials` → Android → Push Notifications (FCM V1). Részletes leírás az Expo
  dokumentációjában: „Push notifications setup”.
- **iPhone:** az EAS build automatikusan elkészíti a push tanúsítványt, ha Apple fejlesztői fiókkal lépsz be.

## 5. Tesztverzió készítése

```bash
npx eas-cli@latest build --profile preview --platform android   # .apk – közvetlenül telepíthető, megosztható
npx eas-cli@latest build --profile development --platform ios    # iPhone-ra regisztrált eszközökhöz
```

Az iPhone-os teszteléshez a legkényelmesebb a **TestFlight** (production build + `eas submit`, majd a
App Store Connectben meghívod a tesztelőket).

## 6. Kiadás a boltokba

```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform android
npx eas-cli@latest submit --platform ios
```

A boltok a feltöltés mellé ezeket is kérik:
- **Adatvédelmi tájékoztató** (nyilvános weboldal-link) – a weboldalra fel lehet tenni egy `adatvedelem.html` oldalt.
- **Fiók törlésének lehetősége az appban** – ✅ megvan (Profil → Fiók törlése).
- **Képernyőképek, leírás, ikon, korhatár-besorolás**, Androidon a „Data safety” kérdőív.
- ⚠️ **Felhasználói tartalom moderálása:** mivel a felhasználók képeket küldhetnek egymásnak, az Apple
  (1.2-es irányelv) és a Google is elvárja, hogy egy képet **jelenteni**, egy felhasználót **letiltani** lehessen.
  Ez a 0.7-ben még nincs benne – a bolti beküldés előtt ezt érdemes hozzáadni, különben valószínű az elutasítás.

## 7. Új verzió kiadása

1. `mobile/app.json`: növeld a `version` értékét (pl. `0.7.1`), valamint az `ios.buildNumber` és
   `android.versionCode` számát (mindig eggyel nagyobb legyen, mint a boltban lévő).
2. `build` → `submit`, mint fent.
3. Ha az adatbázis is változik, az új SQL-fájlt a `supabase/migrations` mappába tedd, és futtasd le az SQL Editorban.

## Hibakeresés

| Tünet | Megoldás |
|---|---|
| Az app „Hiányzik a szerver beállítása” üzenetet ír | Nincs `mobile/.env` fájl (vagy EAS-en nincsenek beállítva a környezeti változók). |
| Regisztrációnál „lehet, hogy a felhasználónév foglalt” | Válassz másik felhasználónevet. |
| Nem jönnek push értesítések | Expo Go-ban nem működnek; fejlesztői/éles build kell, `eas init` lefutott-e, Androidon FCM kulcs beállítva-e, és fut-e a cron (`select * from cron.job_run_details order by start_time desc limit 5;`). |
| A lejárt képek nem tűnnek el a tárhelyről | A cron nem fut – ellenőrizd a 2. pontot. (Az appban a lejárt kép akkor sem látszik.) |

## Helyi adatbázis-tesztek (fejlesztőknek)

PostgreSQL 15+ kell hozzá. A `supabase/tests/run.sh` egy friss adatbázison lefuttatja a migrációt
(a Supabase saját részeit csonkokkal helyettesítve), majd több mint 40 játékszabály-ellenőrzést
(küldés, láthatóság, pihenés, tojás, kikelési arányok, értesítések, fióktörlés).

```bash
supabase/tests/run.sh
```
