-- birdly 0.7 – játékszabály tesztek (helyi Postgresen, a supabase_stubs.sql után)
\set ON_ERROR_STOP 1
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''
\set C '''cccccccc-0000-0000-0000-000000000003'''

create or replace function pg_temp.expect_error(sql text, code text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'Hiba várt (%), de nem jött: %', code, sql;
exception when others then
  if position(code in sqlerrm) = 0 then raise exception 'Rossz hiba: % (várt: %)', sqlerrm, code; end if;
end $$;
grant execute on function pg_temp.expect_error(text, text) to authenticated;

-- Regisztráció
insert into auth.users (id, raw_user_meta_data) values
  (:A, '{"username":"Anna_K","display_name":"Anna"}'),
  (:B, '{"username":"bence","display_name":"Bence"}'),
  (:C, '{"username":"csilla","display_name":"Csilla"}');

do $$ begin
  assert (select username from profiles where display_name = 'Anna') = 'anna_k', 'username kisbetűs';
  assert (select count(*) from birds) = 3, 'mindenki kap 1 kezdő madarat';
  assert (select count(*) from birds where species_id = 'galamb') = 3, 'a kezdő madár galamb';
  assert (select count(*) from eggs) = 3, 'mindenki kap 1 tojást';
  assert (select bool_and(hatches_at between now() + interval '71.9 hours' and now() + interval '72.1 hours') from eggs), '72 órás tojás';
end $$;

-- ---------------- Anna szemszöge ----------------
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);

do $$ begin
  assert (select count(*) from birds) = 1, 'RLS: csak a saját madár látszik';
  assert (select count(*) from profiles) = 3, 'profilok olvashatók';
  assert username_available('bence') = false;
  assert username_available('uj_nev') = true;
  assert username_available('x') = false, 'túl rövid név';
end $$;

select pg_temp.expect_error($$insert into posts (sender_id, recipient_id, bird_name, species_id, image_path, arrive_at, expires_at)
  values (auth.uid(), auth.uid(), 'x', 'galamb', 'x', now(), now())$$, 'permission denied');
select pg_temp.expect_error($$update birds set ready_at = null$$, 'permission denied');
select pg_temp.expect_error($$update profiles set username = 'hacker' where id = auth.uid()$$, 'permission denied');
update profiles set display_name = 'Anna K.' where id = auth.uid();

-- Küldés nem ismerősnek → hiba
select pg_temp.expect_error(format($$select send_post((select id from birds limit 1), %L, %L)$$,
  'bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001/k.jpg'), 'BIRDLY:NOT_FRIENDS');

-- Ismerősnek jelölés
select pg_temp.expect_error($$select send_friend_request('anna_k')$$, 'BIRDLY:SELF_REQUEST');
select pg_temp.expect_error($$select send_friend_request('nincs_ilyen')$$, 'BIRDLY:USER_NOT_FOUND');
do $$ begin assert send_friend_request('  Bence ') = 'requested'; end $$;
select pg_temp.expect_error($$select send_friend_request('bence')$$, 'BIRDLY:ALREADY_REQUESTED');
do $$ begin assert send_friend_request('csilla') = 'requested'; end $$;

-- ---------------- Bence elfogad ----------------
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select respond_friend_request('aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select status from friendships where addressee_id = auth.uid()) = 'accepted';
end $$;

-- ---------------- Csilla: ő is jelöli Annát → automatikus elfogadás ----------------
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
do $$ begin assert send_friend_request('anna_k') = 'accepted'; end $$;

-- ---------------- Anna küld Bencének ----------------
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.expect_error(format($$select send_post((select id from birds limit 1), %L, %L)$$,
  'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002/k.jpg'), 'BIRDLY:INVALID_IMAGE');

select (send_post((select id from birds limit 1), 'bbbbbbbb-0000-0000-0000-000000000002',
                  'aaaaaaaa-0000-0000-0000-000000000001/k1.jpg', 'Szia! 👋')).id is not null as sent;
do $$
declare b birds;
begin
  select * into b from birds limit 1;
  assert b.arrives_at between now() + interval '59 minutes' and now() + interval '61 minutes', 'galamb: 1 óra';
  assert b.ready_at - b.arrives_at = interval '23 hours', 'galamb: 23 óra pihenő';
  assert (select expires_at - arrive_at from posts limit 1) = interval '24 hours', '24 óra élettartam';
end $$;
-- Ugyanazzal a madárral újra → foglalt
select pg_temp.expect_error(format($$select send_post((select id from birds limit 1), %L, %L)$$,
  'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001/k2.jpg'), 'BIRDLY:BIRD_BUSY');
-- Más madarával → nem található
select pg_temp.expect_error(format($$select send_post(%L, %L, %L)$$,
  (select id from public.birds where false), 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001/k2.jpg'), 'BIRDLY:BIRD_NOT_FOUND');
select pg_temp.expect_error($$select are_friends(auth.uid(), auth.uid())$$, 'permission denied');
select pg_temp.expect_error($$select claim_due_notifications()$$, 'permission denied');

-- ---------------- Bence: még nem látja a képet, csak hogy úton van ----------------
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
insert into push_tokens (user_id, token) values (auth.uid(), 'ExponentPushToken[bence]');
do $$ begin
  assert (select count(*) from posts) = 0, 'úton lévő kép nem látszik';
  assert (select count(*) from incoming_birds()) = 1, 'úton lévő madár látszik';
  assert (select sender_name from incoming_birds()) = 'Anna K.';
end $$;
reset role;
insert into storage.objects (bucket_id, name) values ('photos', 'aaaaaaaa-0000-0000-0000-000000000001/k1.jpg');
set role authenticated;
do $$ begin assert (select count(*) from storage.objects) = 0, 'úton lévő kép fájlja sem olvasható'; end $$;
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('photos', 'aaaaaaaa-0000-0000-0000-000000000001/x.jpg')$$, 'row-level security');

-- Idő ugrás: a madár megérkezik
reset role;
update posts set sent_at = sent_at - interval '61 minutes', arrive_at = arrive_at - interval '61 minutes', expires_at = expires_at - interval '61 minutes';
update birds set arrives_at = arrives_at - interval '61 minutes', ready_at = ready_at - interval '61 minutes';
set role authenticated;
do $$ begin
  assert (select count(*) from posts) = 1, 'megérkezett kép látszik';
  assert (select count(*) from incoming_birds()) = 0;
  assert (select count(*) from storage.objects) = 1, 'megérkezett kép fájlja olvasható';
  assert toggle_like((select id from posts limit 1)) = true;
  assert toggle_like((select id from posts limit 1)) = false;
end $$;

-- Értesítések (service role)
reset role;
set role service_role;
do $$ declare n int; begin
  select count(*) into n from claim_due_notifications() where kind = 'post' and token = 'ExponentPushToken[bence]';
  assert n = 1, 'értesítés a megérkezett képről';
  assert (select count(*) from claim_due_notifications()) = 0, 'csak egyszer értesít';
end $$;

-- Lejárat: 24 óra után eltűnik
reset role;
update posts set arrive_at = now() - interval '25 hours', expires_at = now() - interval '1 hour';
set role authenticated;
do $$ begin
  assert (select count(*) from posts) = 0, 'lejárt kép nem látszik';
  assert (select count(*) from storage.objects) = 0, 'lejárt kép fájlja sem';
end $$;

-- ---------------- Tojások ----------------
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.expect_error($$select lay_free_egg()$$, 'BIRDLY:EGG_NOT_YET');
select pg_temp.expect_error($$select * from hatch_egg((select id from eggs limit 1))$$, 'BIRDLY:EGG_NOT_READY');
reset role;
update user_state set next_free_egg_at = now() - interval '1 minute' where user_id = :A;
set role authenticated;
select (lay_free_egg()).id is not null as laid;
do $$ begin
  assert (select count(*) from eggs) = 2;
  assert (select next_free_egg_at from user_state) > now() + interval '71 hours', 'következő ingyenes tojás 3 nap múlva';
end $$;
reset role;
update user_state set next_free_egg_at = now() - interval '1 minute' where user_id = :A;
set role authenticated;
select pg_temp.expect_error($$select lay_free_egg()$$, 'BIRDLY:NEST_FULL');

reset role;
update eggs set hatches_at = now() - interval '1 minute' where owner_id = :A;
set role authenticated;
select bird_name is not null as hatched, species_id from hatch_egg((select id from eggs order by laid_at limit 1));
do $$ begin
  assert (select count(*) from eggs) = 1;
  assert (select count(*) from birds) = 2;
end $$;

-- Súlyozott eloszlás: 3000 kikelés (csak az engedélyezett fajok)
reset role;
create temp table hatch_stats (species_id text);
grant all on hatch_stats to authenticated;
set role authenticated;
do $$ declare i int; e uuid; begin
  for i in 1..3000 loop
    reset role;
    insert into eggs (owner_id, hatches_at) values ('aaaaaaaa-0000-0000-0000-000000000001', now() - interval '1 second') returning id into e;
    set role authenticated;
    insert into hatch_stats select species_id from hatch_egg(e);
  end loop;
end $$;
reset role;
select species_id, count(*), round(100.0 * count(*) / 3000, 1) as pct from hatch_stats group by 1 order by 2 desc;
do $$ begin
  assert not exists (select 1 from hatch_stats h join species s on s.id = h.species_id where not s.enabled), 'kikapcsolt faj nem kel ki';
  assert (select count(*) from hatch_stats where species_id = 'galamb') between 1650 and 1950, 'galamb ~60%';
  assert (select count(*) from hatch_stats where species_id = 'solyom') between 200 and 400, 'sólyom ~10%';
end $$;

-- Pihenés értesítés
update birds set ready_at = now() - interval '1 second' where owner_id = :A and rest_notified = false;
insert into push_tokens (user_id, token) values (:A, 'ExponentPushToken[anna]');
select kind, title from claim_due_notifications() where user_id = :A;

-- Fiók törlés kaszkád
delete from auth.users where id = :B;
do $$ begin
  assert (select count(*) from posts) = 0;
  assert (select count(*) from friendships where 'bbbbbbbb-0000-0000-0000-000000000002' in (requester_id, addressee_id)) = 0;
end $$;

select '✅ Minden teszt sikeres' as eredmeny;
