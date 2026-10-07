// Fiók végleges törlése (az App Store és a Google Play is megköveteli).
// Törli a felhasználó feltöltött képeit és a neki küldött képeket, majd magát a fiókot;
// az adatbázisban minden más (madarak, tojások, ismerősök, posztok) kaszkádolva törlődik.
import { admin, chunk, corsHeaders, json, PHOTO_BUCKET } from '../_shared/admin.ts';

async function listOwnFiles(userId: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(PHOTO_BUCKET).list(userId, { limit: 1000, offset });
    if (error) throw error;
    paths.push(...data.map((f) => `${userId}/${f.name}`));
    if (data.length < 1000) return paths;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);
  const { data: { user }, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  try {
    const { data: received, error } = await admin.from('posts').select('image_path').eq('recipient_id', user.id);
    if (error) throw error;
    const paths = [...(await listOwnFiles(user.id)), ...(received ?? []).map((p) => p.image_path)];
    for (const batch of chunk(paths, 100)) {
      const { error: rmError } = await admin.storage.from(PHOTO_BUCKET).remove(batch);
      if (rmError) throw rmError;
    }
    const { error: delError } = await admin.auth.admin.deleteUser(user.id);
    if (delError) throw delError;
    return json({ deleted: true });
  } catch (e) {
    console.error('Fióktörlési hiba', e);
    return json({ error: 'delete_failed' }, 500);
  }
});
