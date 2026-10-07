import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PHOTO_BUCKET, supabase } from './supabase';
import { ts } from './time';
import type { Bird, BirdStatus, Egg, FeedPost, FriendEntry, Friendship, Incoming, Post, Profile, Species } from './types';

// ---------------------------------------------------------------------------
// Hibaüzenetek magyarul
// ---------------------------------------------------------------------------
const GAME_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: 'Jelentkezz be újra.',
  BIRD_NOT_FOUND: 'Ez a madár nem található.',
  BIRD_BUSY: 'Ez a madár még úton van vagy pihen.',
  NOT_FRIENDS: 'Csak ismerősnek küldhetsz képet.',
  INVALID_IMAGE: 'A kép feltöltése nem sikerült.',
  POST_NOT_FOUND: 'Ez a kép már nem elérhető.',
  EGG_NOT_YET: 'Még nem jár új ingyenes tojás.',
  NEST_FULL: 'A fészek tele van (legfeljebb 2 tojás fér bele).',
  EGG_NOT_FOUND: 'A tojás nem található.',
  EGG_NOT_READY: 'A tojás még nem kelt ki.',
  INVALID_NAME: 'A név 1–30 karakter hosszú lehet.',
  USER_NOT_FOUND: 'Nincs ilyen felhasználónév.',
  SELF_REQUEST: 'Saját magadat nem jelölheted be.',
  ALREADY_FRIENDS: 'Már ismerősök vagytok.',
  ALREADY_REQUESTED: 'Már bejelölted – várd meg, míg elfogadja.',
  REQUEST_NOT_FOUND: 'Ez a jelölés már nem érvényes.',
};

const AUTH_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'Hibás e-mail cím vagy jelszó.'],
  [/already registered|already exists/i, 'Ezzel az e-mail címmel már regisztráltak.'],
  [/email not confirmed/i, 'Előbb erősítsd meg az e-mail címed – nézd meg a postafiókod.'],
  [/password should be at least|weak password/i, 'A jelszó túl gyenge – legalább 8 karakter legyen.'],
  [/unable to validate email|invalid email/i, 'Érvénytelen e-mail cím.'],
  [/rate limit|too many requests/i, 'Túl sok próbálkozás, várj egy kicsit.'],
  [/network request failed|failed to fetch|network/i, 'Nincs internetkapcsolat.'],
  [/database error saving new user/i, 'A regisztráció nem sikerült – lehet, hogy a felhasználónév foglalt.'],
];

export function errorMessage(e: unknown): string {
  const msg = typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  const code = msg.match(/BIRDLY:([A-Z_]+)/)?.[1];
  if (code && GAME_ERRORS[code]) return GAME_ERRORS[code];
  for (const [re, text] of AUTH_ERRORS) if (re.test(msg)) return text;
  return `Hiba történt: ${msg}`;
}

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('BIRDLY:NOT_AUTHENTICATED');
  return id;
}

// ---------------------------------------------------------------------------
// Játékállapot
// ---------------------------------------------------------------------------
export function birdStatus(bird: Bird, now: number): BirdStatus {
  const ready = ts(bird.ready_at);
  if (!bird.ready_at || now >= ready) return { kind: 'free' };
  const arrive = ts(bird.arrives_at);
  if (now < arrive) return { kind: 'flying', from: ts(bird.last_sent_at), until: arrive };
  return { kind: 'resting', from: arrive, until: ready };
}

export const fetchSpecies = async () =>
  check(await supabase.from('species').select('*').order('sort')) as Species[];

export const fetchProfile = async (id: string) =>
  check(await supabase.from('profiles').select('*').eq('id', id).maybeSingle()) as Profile | null;

export const fetchBirds = async () =>
  check(await supabase.from('birds').select('*').order('hatched_at')) as Bird[];

export const fetchEggs = async () =>
  check(await supabase.from('eggs').select('*').order('laid_at')) as Egg[];

export async function fetchNextFreeEggAt(): Promise<string | null> {
  const row = check(await supabase.from('user_state').select('next_free_egg_at').maybeSingle()) as
    | { next_free_egg_at: string }
    | null;
  return row?.next_free_egg_at ?? null;
}

// ---------------------------------------------------------------------------
// Üzenőfal
// ---------------------------------------------------------------------------
type PostWithProfile = Post & { sender: Profile | null };

export async function fetchFeed(): Promise<FeedPost[]> {
  const uid = await currentUserId();
  const posts = check(
    await supabase
      .from('posts')
      .select('*, sender:profiles!posts_sender_id_fkey(*)')
      .eq('recipient_id', uid)
      .order('arrive_at', { ascending: false }),
  ) as PostWithProfile[];
  if (!posts.length) return [];

  const signed = check(
    await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(posts.map((p) => p.image_path), 60 * 60),
  ) as { path: string | null; signedUrl: string | null }[];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return posts.map((p) => ({ ...p, imageUrl: urlByPath.get(p.image_path) ?? null }));
}

export const fetchIncoming = async () => check(await supabase.rpc('incoming_birds')) as Incoming[];

export type SentPost = Post & { recipient: Profile | null };
export async function fetchSent(): Promise<SentPost[]> {
  const uid = await currentUserId();
  return check(
    await supabase
      .from('posts')
      .select('*, recipient:profiles!posts_recipient_id_fkey(*)')
      .eq('sender_id', uid)
      .order('sent_at', { ascending: false })
      .limit(20),
  ) as SentPost[];
}

export async function toggleLike(postId: string): Promise<boolean> {
  return check(await supabase.rpc('toggle_like', { p_post_id: postId })) as boolean;
}

// ---------------------------------------------------------------------------
// Kép küldése: tömörítés → feltöltés → szerveroldali küldés
// ---------------------------------------------------------------------------
export async function sendPhoto(opts: { uri: string; birdId: string; recipientId: string; caption: string }) {
  const uid = await currentUserId();

  const ctx = ImageManipulator.manipulate(opts.uri).resize({ width: 1080 });
  const rendered = await ctx.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 });
  const body = await (await fetch(result.uri)).arrayBuffer();

  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  check(await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType: 'image/jpeg' }));

  const res = await supabase.rpc('send_post', {
    p_bird_id: opts.birdId,
    p_recipient_id: opts.recipientId,
    p_image_path: path,
    p_caption: opts.caption,
  });
  if (res.error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw res.error;
  }
  return res.data as Post;
}

// ---------------------------------------------------------------------------
// Tojások, madarak
// ---------------------------------------------------------------------------
export async function layFreeEgg() {
  return check(await supabase.rpc('lay_free_egg')) as Egg;
}

export type HatchResult = { bird_id: string; bird_name: string; species_id: string; is_new_species: boolean };
export async function hatchEgg(eggId: string): Promise<HatchResult> {
  const rows = check(await supabase.rpc('hatch_egg', { p_egg_id: eggId })) as HatchResult[];
  return rows[0];
}

export async function renameBird(birdId: string, name: string) {
  check(await supabase.rpc('rename_bird', { p_bird_id: birdId, p_name: name }));
}

// ---------------------------------------------------------------------------
// Ismerősök
// ---------------------------------------------------------------------------
export async function fetchFriends(): Promise<FriendEntry[]> {
  const uid = await currentUserId();
  const rows = check(await supabase.from('friendships').select('*')) as Friendship[];
  if (!rows.length) return [];
  const otherIds = rows.map((r) => (r.requester_id === uid ? r.addressee_id : r.requester_id));
  const profiles = check(await supabase.from('profiles').select('*').in('id', otherIds)) as Profile[];
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return rows
    .map((r): FriendEntry | null => {
      const otherId = r.requester_id === uid ? r.addressee_id : r.requester_id;
      const profile = byId.get(otherId);
      if (!profile) return null;
      const status = r.status === 'accepted' ? 'accepted' : r.requester_id === uid ? 'outgoing' : 'incoming';
      return { profile, status };
    })
    .filter((x): x is FriendEntry => x !== null)
    .sort((a, b) => a.profile.display_name.localeCompare(b.profile.display_name, 'hu'));
}

export async function sendFriendRequest(username: string): Promise<'requested' | 'accepted'> {
  return check(await supabase.rpc('send_friend_request', { p_username: username })) as 'requested' | 'accepted';
}

export async function respondFriendRequest(requesterId: string, accept: boolean) {
  check(await supabase.rpc('respond_friend_request', { p_requester_id: requesterId, p_accept: accept }));
}

export async function removeFriend(userId: string) {
  check(await supabase.rpc('remove_friend', { p_user_id: userId }));
}

// ---------------------------------------------------------------------------
// Fiók
// ---------------------------------------------------------------------------
export async function isUsernameAvailable(username: string): Promise<boolean> {
  return check(await supabase.rpc('username_available', { p_username: username })) as boolean;
}

export async function updateProfile(fields: { display_name?: string; avatar_color?: string }) {
  const uid = await currentUserId();
  check(await supabase.from('profiles').update(fields).eq('id', uid));
}

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
}
