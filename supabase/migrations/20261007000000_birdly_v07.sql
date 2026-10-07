-- =====================================================================
-- birdly 0.7 – adatbázis séma
-- Minden játékszabály (madár küldése, pihenés, tojás, kikelés) itt,
-- a szerveren fut, így a kliens nem tud csalni az időzítéssel.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Madárfajok
-- ---------------------------------------------------------------------
create table public.species (
  id               text primary key,
  name             text not null,
  emoji            text not null,
  delivery_seconds integer not null check (delivery_seconds > 0),
  rest_seconds     integer not null check (rest_seconds >= 0),
  rarity           text not null check (rarity in ('gyakori', 'ritka', 'epikus', 'legendas')),
  hatch_weight     integer not null default 0 check (hatch_weight >= 0),
  description      text not null default '',
  enabled          boolean not null default true,
  sort             integer not null default 0
);

insert into public.species (id, name, emoji, delivery_seconds, rest_seconds, rarity, hatch_weight, description, enabled, sort) values
  ('galamb',   'Galamb',   '🕊️', 3600,  82800,  'gyakori',  60, 'Megbízható postás. Lassú, de hamar újra bevethető.', true, 1),
  ('sas',      'Sas',      '🦅', 900,   86400,  'ritka',    30, 'Erős szárnyú, gyors és kiegyensúlyozott.',           true, 2),
  ('solyom',   'Sólyom',   '🐦', 60,    115200, 'epikus',   10, 'Villámgyors kézbesítés, de sokat kell pihennie.',    true, 3),
  -- Későbbi bővítéshez előkészítve (enabled = false → nem kelhet ki, nem látszik a katalógusban)
  ('bagoly',   'Bagoly',   '🦉', 10800, 43200,  'ritka',    12, 'Éjszakai futár – lassú, de gyorsan kipiheni magát.', false, 4),
  ('papagaj',  'Papagáj',  '🦜', 1800,  72000,  'ritka',    12, 'Fecsegő, színes kézbesítő.',                         false, 5),
  ('hattyu',   'Hattyú',   '🦢', 7200,  57600,  'epikus',   4,  'Elegáns és kitartó.',                                false, 6),
  ('flamingo', 'Flamingó', '🦩', 2700,  79200,  'epikus',   4,  'Rózsaszín stílusikon.',                              false, 7),
  ('pava',     'Páva',     '🦚', 300,   64800,  'legendas', 2,  'Ritka és pompás – gyors és keveset pihen.',          false, 8);

-- ---------------------------------------------------------------------
-- Felhasználók
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_color text not null default '#FFE2C6' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at   timestamptz not null default now()
);

-- Csak a felhasználó saját maga látja
create table public.user_state (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  next_free_egg_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  token      text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Madarak és tojások
-- ---------------------------------------------------------------------
create table public.birds (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  species_id    text not null references public.species (id),
  name          text not null check (char_length(name) between 1 and 30),
  hatched_at    timestamptz not null default now(),
  last_sent_at  timestamptz,
  arrives_at    timestamptz,          -- mikor ér célba az aktuális kép
  ready_at      timestamptz,          -- mikor küldhető újra (kézbesítés + pihenő)
  rest_notified boolean not null default true
);
create index birds_owner_idx on public.birds (owner_id);
create index birds_rest_idx on public.birds (ready_at) where rest_notified = false;

create table public.eggs (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  laid_at    timestamptz not null default now(),
  hatches_at timestamptz not null,
  notified   boolean not null default false
);
create index eggs_owner_idx on public.eggs (owner_id);

-- ---------------------------------------------------------------------
-- Ismerősök
-- ---------------------------------------------------------------------
create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_idx on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

-- ---------------------------------------------------------------------
-- Posztok (madárral küldött képek)
-- ---------------------------------------------------------------------
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  bird_id      uuid references public.birds (id) on delete set null,
  bird_name    text not null,
  species_id   text not null references public.species (id),
  image_path   text not null,
  caption      text not null default '' check (char_length(caption) <= 200),
  sent_at      timestamptz not null default now(),
  arrive_at    timestamptz not null,
  expires_at   timestamptz not null,
  liked_at     timestamptz,
  notified     boolean not null default false
);
create index posts_recipient_idx on public.posts (recipient_id, arrive_at desc);
create index posts_sender_idx on public.posts (sender_id, sent_at desc);
create index posts_notify_idx on public.posts (arrive_at) where notified = false;
create index posts_expires_idx on public.posts (expires_at);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.species     enable row level security;
alter table public.profiles    enable row level security;
alter table public.user_state  enable row level security;
alter table public.push_tokens enable row level security;
alter table public.birds       enable row level security;
alter table public.eggs        enable row level security;
alter table public.friendships enable row level security;
alter table public.posts       enable row level security;

create policy "species: mindenki olvashatja" on public.species
  for select using (true);

create policy "profiles: bejelentkezve olvasható" on public.profiles
  for select to authenticated using (true);
create policy "profiles: saját módosítása" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "user_state: saját" on public.user_state
  for select to authenticated using (user_id = auth.uid());

create policy "push_tokens: saját olvasás" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "push_tokens: saját beszúrás" on public.push_tokens
  for insert to authenticated with check (user_id = auth.uid());
create policy "push_tokens: saját módosítás" on public.push_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_tokens: saját törlés" on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

create policy "birds: saját" on public.birds
  for select to authenticated using (owner_id = auth.uid());

create policy "eggs: saját" on public.eggs
  for select to authenticated using (owner_id = auth.uid());

create policy "friendships: érintettek látják" on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));

-- A címzett csak a már megérkezett és még le nem járt képet látja,
-- a feladó a saját elküldött képeit.
create policy "posts: feladó vagy megérkezett címzett" on public.posts
  for select to authenticated using (
    sender_id = auth.uid()
    or (recipient_id = auth.uid() and arrive_at <= now() and expires_at > now())
  );

-- Közvetlen írás csak a lenti függvényeken keresztül (security definer).
revoke insert, update, delete on public.species, public.user_state, public.birds,
  public.eggs, public.friendships, public.posts from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_color) on public.profiles to authenticated;

-- =====================================================================
-- Segédfüggvények
-- =====================================================================
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

create or replace function public.random_bird_name()
returns text language sql volatile set search_path = public as $$
  select (array['Csőrike', 'Tollas Tibi', 'Szellő', 'Fütyi', 'Pihe', 'Röppentyű', 'Kapitány',
                'Bogyó', 'Szárnyas Sári', 'Nyílvessző', 'Postás Pali', 'Gizi', 'Villám', 'Árpád',
                'Cinke', 'Pötty', 'Szárcsa Sanyi', 'Tollbóbita'])[1 + floor(random() * 18)::int];
$$;

-- Új felhasználó: profil + kezdő galamb + egy tojás a fészekben
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_display  text := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  v_colors   text[] := array['#FFD3A8', '#CFE0BE', '#F5C9C9', '#C9DCF2', '#E8D5F2', '#F7E7A8'];
begin
  if v_username = '' then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  if v_display = '' then
    v_display := v_username;
  end if;

  insert into profiles (id, username, display_name, avatar_color)
  values (new.id, v_username, v_display, v_colors[1 + floor(random() * 6)::int]);

  insert into user_state (user_id, next_free_egg_at) values (new.id, now() + interval '3 days');

  insert into birds (owner_id, species_id, name) values (new.id, 'galamb', random_bird_name());
  insert into eggs (owner_id, hatches_at) values (new.id, now() + interval '72 hours');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Kliens által hívható függvények (RPC)
-- Hibák: a kliens a 'BIRDLY:' kezdetű kódokat fordítja le magyarra.
-- =====================================================================

create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select lower(trim(p_username)) ~ '^[a-z0-9_.]{3,20}$'
     and not exists (select 1 from profiles where username = lower(trim(p_username)));
$$;

-- ---------- Kép küldése madárral ----------
create or replace function public.send_post(
  p_bird_id uuid, p_recipient_id uuid, p_image_path text, p_caption text default ''
) returns public.posts
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_bird birds;
  v_sp   species;
  v_post posts;
begin
  if v_uid is null then raise exception 'BIRDLY:NOT_AUTHENTICATED'; end if;

  select * into v_bird from birds where id = p_bird_id and owner_id = v_uid for update;
  if not found then raise exception 'BIRDLY:BIRD_NOT_FOUND'; end if;
  if v_bird.ready_at is not null and v_bird.ready_at > now() then
    raise exception 'BIRDLY:BIRD_BUSY';
  end if;
  if not are_friends(v_uid, p_recipient_id) then raise exception 'BIRDLY:NOT_FRIENDS'; end if;
  if p_image_path is null or split_part(p_image_path, '/', 1) <> v_uid::text then
    raise exception 'BIRDLY:INVALID_IMAGE';
  end if;

  select * into v_sp from species where id = v_bird.species_id;

  insert into posts (sender_id, recipient_id, bird_id, bird_name, species_id, image_path, caption,
                     sent_at, arrive_at, expires_at)
  values (v_uid, p_recipient_id, v_bird.id, v_bird.name, v_sp.id, p_image_path,
          left(coalesce(trim(p_caption), ''), 200),
          now(),
          now() + make_interval(secs => v_sp.delivery_seconds),
          now() + make_interval(secs => v_sp.delivery_seconds) + interval '24 hours')
  returning * into v_post;

  update birds
     set last_sent_at  = now(),
         arrives_at    = v_post.arrive_at,
         ready_at      = v_post.arrive_at + make_interval(secs => v_sp.rest_seconds),
         rest_notified = false
   where id = v_bird.id;

  return v_post;
end;
$$;

-- ---------- Úton lévő madarak (kép nélkül!) ----------
create or replace function public.incoming_birds()
returns table (post_id uuid, sender_id uuid, sender_name text, species_id text, arrive_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.sender_id, pr.display_name, p.species_id, p.arrive_at
    from posts p join profiles pr on pr.id = p.sender_id
   where p.recipient_id = auth.uid() and p.arrive_at > now()
   order by p.arrive_at;
$$;

-- ---------- Tetszik ----------
create or replace function public.toggle_like(p_post_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_liked timestamptz;
begin
  update posts
     set liked_at = case when liked_at is null then now() else null end
   where id = p_post_id and recipient_id = auth.uid() and arrive_at <= now() and expires_at > now()
  returning liked_at into v_liked;
  if not found then raise exception 'BIRDLY:POST_NOT_FOUND'; end if;
  return v_liked is not null;
end;
$$;

-- ---------- Tojás: 3 naponta egy ingyenes, max. 2 a fészekben ----------
create or replace function public.lay_free_egg()
returns public.eggs language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_state user_state;
  v_egg   eggs;
begin
  if v_uid is null then raise exception 'BIRDLY:NOT_AUTHENTICATED'; end if;
  select * into v_state from user_state where user_id = v_uid for update;
  if v_state.next_free_egg_at > now() then raise exception 'BIRDLY:EGG_NOT_YET'; end if;
  if (select count(*) from eggs where owner_id = v_uid) >= 2 then raise exception 'BIRDLY:NEST_FULL'; end if;

  insert into eggs (owner_id, hatches_at) values (v_uid, now() + interval '72 hours') returning * into v_egg;
  update user_state set next_free_egg_at = now() + interval '3 days' where user_id = v_uid;
  return v_egg;
end;
$$;

-- ---------- Kikelés: súlyozott véletlen faj ----------
create or replace function public.hatch_egg(p_egg_id uuid)
returns table (bird_id uuid, bird_name text, species_id text, is_new_species boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_egg    eggs;
  v_total  integer;
  v_roll   numeric;
  v_sp     text;
  v_is_new boolean;
  v_bird   birds;
begin
  select * into v_egg from eggs where id = p_egg_id and owner_id = v_uid for update;
  if not found then raise exception 'BIRDLY:EGG_NOT_FOUND'; end if;
  if v_egg.hatches_at > now() then raise exception 'BIRDLY:EGG_NOT_READY'; end if;

  select sum(hatch_weight) into v_total from species where enabled and hatch_weight > 0;
  v_roll := random() * v_total;
  select s.id into v_sp from (
    select id, sum(hatch_weight) over (order by sort, id) as cum
      from species where enabled and hatch_weight > 0
  ) s where s.cum > v_roll order by s.cum limit 1;

  v_is_new := not exists (select 1 from birds b where b.owner_id = v_uid and b.species_id = v_sp);

  insert into birds (owner_id, species_id, name) values (v_uid, v_sp, random_bird_name()) returning * into v_bird;
  delete from eggs where id = v_egg.id;

  return query select v_bird.id, v_bird.name, v_bird.species_id, v_is_new;
end;
$$;

-- ---------- Madár átnevezése ----------
create or replace function public.rename_bird(p_bird_id uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(trim(p_name)) not between 1 and 30 then raise exception 'BIRDLY:INVALID_NAME'; end if;
  update birds set name = trim(p_name) where id = p_bird_id and owner_id = auth.uid();
  if not found then raise exception 'BIRDLY:BIRD_NOT_FOUND'; end if;
end;
$$;

-- ---------- Ismerősök ----------
create or replace function public.send_friend_request(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_row    friendships;
begin
  if v_uid is null then raise exception 'BIRDLY:NOT_AUTHENTICATED'; end if;
  select id into v_target from profiles where username = lower(trim(p_username));
  if v_target is null then raise exception 'BIRDLY:USER_NOT_FOUND'; end if;
  if v_target = v_uid then raise exception 'BIRDLY:SELF_REQUEST'; end if;

  select * into v_row from friendships
   where (requester_id = v_uid and addressee_id = v_target)
      or (requester_id = v_target and addressee_id = v_uid);

  if found then
    if v_row.status = 'accepted' then raise exception 'BIRDLY:ALREADY_FRIENDS'; end if;
    if v_row.requester_id = v_uid then raise exception 'BIRDLY:ALREADY_REQUESTED'; end if;
    -- ő már jelölt minket → elfogadjuk
    update friendships set status = 'accepted', accepted_at = now()
     where requester_id = v_target and addressee_id = v_uid;
    return 'accepted';
  end if;

  insert into friendships (requester_id, addressee_id) values (v_uid, v_target);
  return 'requested';
end;
$$;

create or replace function public.respond_friend_request(p_requester_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update friendships set status = 'accepted', accepted_at = now()
     where requester_id = p_requester_id and addressee_id = auth.uid() and status = 'pending';
  else
    delete from friendships
     where requester_id = p_requester_id and addressee_id = auth.uid() and status = 'pending';
  end if;
  if not found then raise exception 'BIRDLY:REQUEST_NOT_FOUND'; end if;
end;
$$;

-- Ismerős törlése, vagy saját függő jelölés visszavonása
create or replace function public.remove_friend(p_user_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from friendships
   where (requester_id = auth.uid() and addressee_id = p_user_id)
      or (requester_id = p_user_id and addressee_id = auth.uid() and status = 'accepted');
$$;

-- =====================================================================
-- Ütemezett feladat (tick edge function, service role) – értesítések
-- =====================================================================
create or replace function public.claim_due_notifications()
returns table (user_id uuid, token text, title text, body text, kind text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with arrived as (
    update posts p set notified = true
     where p.notified = false and p.arrive_at <= now()
    returning p.recipient_id as uid, p.sender_id, p.species_id
  ), hatched as (
    update eggs e set notified = true
     where e.notified = false and e.hatches_at <= now()
    returning e.owner_id as uid
  ), rested as (
    update birds b set rest_notified = true
     where b.rest_notified = false and b.ready_at <= now()
    returning b.owner_id as uid, b.name, b.species_id
  ), msgs as (
    select a.uid, s.emoji || ' Megérkezett egy madár!' as title,
           pr.display_name || ' képet küldött neked.' as body, 'post'::text as kind
      from arrived a join profiles pr on pr.id = a.sender_id join species s on s.id = a.species_id
    union all
    select h.uid, '🐣 Kikelt egy tojásod!', 'Nézd meg, milyen madár bújt ki a madárházban.', 'egg'
      from hatched h
    union all
    select r.uid, s.emoji || ' ' || r.name || ' kipihente magát', 'Újra küldhetsz vele képet.', 'rest'
      from rested r join species s on s.id = r.species_id
  )
  select m.uid, t.token, m.title, m.body, m.kind
    from msgs m join push_tokens t on t.user_id = m.uid;
end;
$$;

-- =====================================================================
-- Függvényjogosultságok
-- =====================================================================
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.username_available(text)                       to anon, authenticated;
grant execute on function public.send_post(uuid, uuid, text, text)                to authenticated;
grant execute on function public.incoming_birds()                                 to authenticated;
grant execute on function public.toggle_like(uuid)                                to authenticated;
grant execute on function public.lay_free_egg()                                   to authenticated;
grant execute on function public.hatch_egg(uuid)                                  to authenticated;
grant execute on function public.rename_bird(uuid, text)                          to authenticated;
grant execute on function public.send_friend_request(text)                        to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean)            to authenticated;
grant execute on function public.remove_friend(uuid)                              to authenticated;
grant execute on function public.claim_due_notifications()                        to service_role;

-- =====================================================================
-- Képtárolás (privát bucket, útvonal: <feladó id>/<fájl>.jpg)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: feltöltés saját mappába" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: saját vagy megérkezett kép olvasása" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.posts p
         where p.image_path = storage.objects.name
           and p.recipient_id = auth.uid()
           and p.arrive_at <= now()
           and p.expires_at > now()
      )
    )
  );

create policy "photos: saját törlése" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
