import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PostCard } from '../../components/PostCard';
import { SendFab } from '../../components/SendFab';
import { EmptyState, Screen, SectionTitle } from '../../components/ui';
import { errorMessage, fetchFeed, fetchIncoming, toggleLike } from '../../lib/api';
import { useGame } from '../../lib/game';
import { colors, fonts } from '../../lib/theme';
import { formatCountdown, ts, useNow } from '../../lib/time';
import type { FeedPost, Incoming } from '../../lib/types';

export default function FeedScreen() {
  const { species, friends } = useGame();
  const now = useNow();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reloading = useRef(false);
  const lastLoadAt = useRef(0);

  const load = useCallback(async () => {
    if (reloading.current) return;
    reloading.current = true;
    lastLoadAt.current = Date.now();
    try {
      const [p, i] = await Promise.all([fetchFeed(), fetchIncoming()]);
      setPosts(p);
      setIncoming(i);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      reloading.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 60_000);
      return () => clearInterval(id);
    }, [load]),
  );

  // Ha egy úton lévő madár megérkezik, azonnal frissítünk
  const nextArrival = incoming.length ? Math.min(...incoming.map((i) => ts(i.arrive_at))) : Infinity;
  useEffect(() => {
    // (legfeljebb 5 mp-enként, ha a szerver órája kicsit lemaradna)
    if (now >= nextArrival && now - lastLoadAt.current > 5000) load();
  }, [now, nextArrival, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onLike(post: FeedPost) {
    const liked = !post.liked_at;
    setPosts((ps) => ps.map((p) => (p.id === post.id ? { ...p, liked_at: liked ? new Date().toISOString() : null } : p)));
    try {
      await toggleLike(post.id);
    } catch {
      load();
    }
  }

  const visible = posts.filter((p) => ts(p.expires_at) > now);
  const pending = incoming.filter((i) => ts(i.arrive_at) > now);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {pending.length > 0 && (
          <>
            <SectionTitle title="Úton feléd" hint={`${pending.length} madár`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {pending.map((i) => (
                <View key={i.post_id} style={styles.incoming}>
                  <Text style={styles.incomingBird}>{species[i.species_id]?.emoji ?? '🐦'}</Text>
                  <View>
                    <Text style={styles.incomingTitle}>
                      <Text style={{ color: colors.orange }}>{i.sender_name}</Text> képet küldött
                    </Text>
                    <Text style={styles.incomingSub}>
                      {species[i.species_id]?.name ?? 'Madár'} · érkezik: {formatCountdown(ts(i.arrive_at) - now)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        <SectionTitle title="Üzenőfal" hint="24 óráig látható" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && visible.length === 0 && (
          <EmptyState
            emoji="🪹"
            text={
              friends.some((f) => f.status === 'accepted')
                ? 'Most üres a falad.\nHa egy ismerősöd madara megérkezik, itt látod a képét.'
                : 'Még nincsenek ismerőseid.\nA Profil fülön felhasználónév alapján jelölhetsz be valakit!'
            }
          />
        )}
        {visible.map((p) => (
          <PostCard key={p.id} post={p} species={species[p.species_id]} now={now} onToggleLike={() => onLike(p)} />
        ))}
      </Screen>
      <SendFab />
    </View>
  );
}

const styles = StyleSheet.create({
  incoming: {
    backgroundColor: colors.moss,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 210,
  },
  incomingBird: { fontSize: 26 },
  incomingTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.orangeSoft },
  incomingSub: { fontFamily: fonts.semi, fontSize: 12, color: colors.orangeSoft, opacity: 0.8 },
  error: { fontFamily: fonts.semi, color: colors.danger, marginBottom: 10 },
});
