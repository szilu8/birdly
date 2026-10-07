import { Pressable, StyleSheet, Text, View } from 'react-native';
import { birdStatus } from '../lib/api';
import { colors, fonts } from '../lib/theme';
import { formatCountdown, formatSpan } from '../lib/time';
import type { Bird, Species } from '../lib/types';
import { Card, ProgressBar, RarityTag, StatChip } from './ui';

export const speciesBg: Record<string, string> = {
  galamb: '#E4E8DD',
  sas: '#F3DEC5',
  solyom: '#D6D0C4',
  bagoly: '#E0D6EA',
  papagaj: '#D4EBD8',
  hattyu: '#E3EEF4',
  flamingo: '#F8DCE3',
  pava: '#D3E7E3',
};

export function BirdCard({ bird, species, now, onPress }: { bird: Bird; species?: Species; now: number; onPress?: () => void }) {
  const st = birdStatus(bird, now);
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={[styles.pic, { backgroundColor: speciesBg[bird.species_id] ?? colors.mossSoft }]}>
          <Text style={styles.emoji}>{species?.emoji ?? '🐦'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{bird.name}</Text>
            {species ? <RarityTag rarity={species.rarity} /> : null}
          </View>
          {species ? (
            <View style={styles.stats}>
              <StatChip text={species.name} />
              <StatChip text={`🚀 ${formatSpan(species.delivery_seconds)}`} />
              <StatChip text={`😴 ${formatSpan(species.rest_seconds)}`} />
            </View>
          ) : null}
          {st.kind === 'free' && <Text style={[styles.status, { color: '#3C7A2B' }]}>● Bevethető</Text>}
          {st.kind === 'flying' && (
            <>
              <Text style={[styles.status, { color: colors.orangeDeep }]}>● Úton · kézbesít: {formatCountdown(st.until - now)}</Text>
              <ProgressBar value={(now - st.from) / (st.until - st.from)} color={colors.orangeDeep} />
            </>
          )}
          {st.kind === 'resting' && (
            <>
              <Text style={[styles.status, { color: colors.muted }]}>● Pihen · még {formatCountdown(st.until - now)}</Text>
              <ProgressBar value={(now - st.from) / (st.until - st.from)} />
            </>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  pic: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 36 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.heading, fontSize: 19, color: colors.black, flexShrink: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  status: { fontFamily: fonts.heavy, fontSize: 13 },
});
