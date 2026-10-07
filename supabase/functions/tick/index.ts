// birdly "tick" – percenként fut (Supabase Cron hívja).
//  1. Push értesítést küld: megérkezett madár, kikelt tojás, kipihent madár.
//  2. Törli a 24 óránál régebbi képeket (adatbázis + tárhely).
//
// Hívás: POST, fejléc: x-cron-secret: <CRON_SECRET>
// Telepítés: supabase functions deploy tick --no-verify-jwt
import { admin, chunk, json, PHOTO_BUCKET } from '../_shared/admin.ts';

type Notification = { user_id: string; token: string; title: string; body: string; kind: string };
type ExpoTicket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushes(notes: Notification[]) {
  let sent = 0;
  const deadTokens = new Set<string>();
  for (const batch of chunk(notes, 100)) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch.map((n) => ({
        to: n.token,
        title: n.title,
        body: n.body,
        sound: 'default',
        data: { kind: n.kind },
      }))),
    });
    if (!res.ok) {
      console.error('Expo push hiba', res.status, await res.text());
      continue;
    }
    const { data } = (await res.json()) as { data: ExpoTicket[] };
    data.forEach((ticket, i) => {
      if (ticket.status === 'ok') sent++;
      else if (ticket.details?.error === 'DeviceNotRegistered') deadTokens.add(batch[i].token);
      else console.warn('Push nem ment ki:', ticket.message);
    });
  }
  if (deadTokens.size) {
    await admin.from('push_tokens').delete().in('token', [...deadTokens]);
  }
  return { sent, removedTokens: deadTokens.size };
}

async function purgeExpiredPosts() {
  const { data: expired, error } = await admin
    .from('posts')
    .select('id, image_path')
    .lt('expires_at', new Date().toISOString())
    .limit(500);
  if (error) throw error;
  if (!expired?.length) return 0;

  for (const batch of chunk(expired, 100)) {
    const { error: rmError } = await admin.storage.from(PHOTO_BUCKET).remove(batch.map((p) => p.image_path));
    if (rmError) {
      console.error('Tárhely törlési hiba', rmError);
      continue; // a sor marad, következő futáskor újrapróbáljuk
    }
    await admin.from('posts').delete().in('id', batch.map((p) => p.id));
  }
  return expired.length;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return json({ error: 'unauthorized' }, 401);
  }

  const { data: notes, error } = await admin.rpc('claim_due_notifications');
  if (error) return json({ error: error.message }, 500);

  const push = notes?.length ? await sendPushes(notes as Notification[]) : { sent: 0, removedTokens: 0 };
  const purged = await purgeExpiredPosts();

  return json({ notifications: notes?.length ?? 0, ...push, purged });
});
