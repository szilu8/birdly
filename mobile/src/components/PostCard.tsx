import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../lib/theme';
import { FADE_START, formatAgo, formatCountdown, POST_LIFE, ts } from '../lib/time';
import type { FeedPost, Species } from '../lib/types';
import { Avatar } from './ui';

/** A kép széle 20 óra után egyre feketébb, 24 óránál eltűnik. */
function BurnEdges({ age }: { age: number }) {
  if (age < FADE_START) return null;
  const k = Math.min(1, (age - FADE_START) / (POST_LIFE - FADE_START));
  const size = `${10 + 30 * k}%` as const;
  const dark = `rgba(0,0,0,${(0.6 + 0.38 * k).toFixed(2)})`;
  const clear = 'rgba(0,0,0,0)';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[dark, clear]} style={[styles.edge, { top: 0, left: 0, right: 0, height: size }]} />
      <LinearGradient colors={[clear, dark]} style={[styles.edge, { bottom: 0, left: 0, right: 0, height: size }]} />
      <LinearGradient colors={[dark, clear]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.edge, { top: 0, bottom: 0, left: 0, width: size }]} />
      <LinearGradient colors={[clear, dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.edge, { top: 0, bottom: 0, right: 0, width: size }]} />
    </View>
  );
}

export function PostCard({
  post,
  species,
  now,
  onToggleLike,
}: {
  post: FeedPost;
  species?: Species;
  now: number;
  onToggleLike: () => void;
}) {
  const age = now - ts(post.arrive_at);
  const left = ts(post.expires_at) - now;
  const fading = age >= FADE_START;
  const sender = post.sender;
  const liked = Boolean(post.liked_at);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Avatar name={sender?.display_name ?? '?'} color={sender?.avatar_color ?? colors.orangeSoft} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{sender?.display_name ?? 'Ismeretlen'}</Text>
          <Text style={styles.meta}>
            {post.bird_name} ({species?.name ?? 'madár'}) hozta · {formatAgo(age)}
          </Text>
        </View>
        <Text style={styles.birdEmoji}>{species?.emoji ?? '🐦'}</Text>
      </View>

      <View style={styles.photo}>
        {post.imageUrl ? (
          <Image source={{ uri: post.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <Text style={styles.photoMissing}>A kép nem tölthető be</Text>
        )}
        <BurnEdges age={age} />
      </View>

      <View style={styles.foot}>
        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
        <View style={styles.metaRow}>
          <Pressable onPress={onToggleLike} hitSlop={10} accessibilityRole="button" accessibilityLabel="Tetszik">
            <Text style={[styles.like, liked && { color: '#D9534F' }]}>{liked ? '❤️' : '🤍'} Tetszik</Text>
          </Pressable>
          <View style={[styles.timeLeft, fading && styles.timeLeftFading]}>
            <Text style={[styles.timeLeftText, fading && { color: colors.orange }]}>
              {fading ? '🔥 ' : '⏳ '}
              {formatCountdown(left)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: colors.moss,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  name: { fontFamily: fonts.heavy, fontSize: 15, color: colors.black },
  meta: { fontFamily: fonts.semi, fontSize: 12, color: colors.muted },
  birdEmoji: { fontSize: 22 },
  photo: { aspectRatio: 4 / 5, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  photoMissing: { fontFamily: fonts.semi, color: colors.orangeSoft },
  edge: { position: 'absolute' },
  foot: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  caption: { fontFamily: fonts.body, fontSize: 15, color: colors.black, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  like: { fontFamily: fonts.heavy, fontSize: 14, color: colors.muted },
  timeLeft: { backgroundColor: colors.mossSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  timeLeftFading: { backgroundColor: colors.black },
  timeLeftText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.moss },
});
