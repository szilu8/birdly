-- =====================================================================
-- birdly – percenkénti ütemezés (EGYSZER kell lefuttatni, a migráció UTÁN)
-- Supabase Dashboard → SQL Editor. Előtte cseréld ki a két <...> értéket!
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1) A projekt címe, pl. https://abcdefghijkl.supabase.co
select vault.create_secret('<PROJEKT_URL>', 'birdly_project_url');
-- 2) Ugyanaz a titkos szöveg, amit a tick függvénynek CRON_SECRET-ként beállítottál
select vault.create_secret('<CRON_SECRET>', 'birdly_cron_secret');

-- 3) Percenként meghívjuk a tick függvényt (értesítések + lejárt képek törlése)
select cron.schedule(
  'birdly-tick',
  '* * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'birdly_project_url') || '/functions/v1/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'birdly_cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Ellenőrzés: select * from cron.job_run_details order by start_time desc limit 5;
-- Leállítás:  select cron.unschedule('birdly-tick');
