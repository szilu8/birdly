import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BirdCard, speciesBg } from '../../components/BirdCard';
import { SendFab } from '../../components/SendFab';
import { Button, ProgressBar, RarityTag, Screen, SectionTitle, StatChip, styles as ui } from '../../components/ui';
import { birdStatus, errorMessage, hatchEgg, layFreeEgg, renameBird, type HatchResult } from '../../lib/api';
import { useGame } from '../../lib/game';
import { colors, fonts, radius } from '../../lib/theme';
import { formatCountdown, formatSpan, ts, useNow } from '../../lib/time';
import type { Bird, Egg } from '../../lib/types';

const EGG_SLOTS = 2;

export default function AviaryScreen() {
  const { birds, eggs, species, speciesList, nextFreeEggAt, reload } = useGame();
  const now = useNow();
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [hatched, setHatched] = useState<HatchResult | null>(null);
  const [editing, setEditing] = useState<Bird | null>(null);

  useFocusEffect(
    useCallback(() => {
      reload().catch(() => undefined);
    }, [reload]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await reload().catch(() => undefined);
    setRefreshing(false);
  }

  async function onLayEgg() {
    setBusy('lay');
    try {
      await layFreeEgg();
      await reload();
    } catch (e) {
      Alert.alert('Nem sikerült', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function onHatch(egg: Egg) {
    setBusy(egg.id);
    try {
      const result = await hatchEgg(egg.id);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHatched(result);
      await reload();
    } catch (e) {
      Alert.alert('Nem sikerült', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const freeCount = birds.filter((b) => birdStatus(b, now).kind === 'free').length;
  const discovered = new Set(birds.map((b) => b.species_id));
  const catalog = speciesList.filter((s) => s.enabled || discovered.has(s.id));
  const freeEggReady = nextFreeEggAt !== null && ts(nextFreeEggAt) <= now;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <SectionTitle title="Keltető" hint="72 óra / tojás" />
        <View style={styles.nest}>
          <Text style={styles.nestText}>
            Minden tojás pontosan <Text style={{ fontFamily: fonts.heavy }}>72 óra</Text> alatt kel ki – hogy milyen madár bújik
            elő, az meglepetés! 3 naponta jár egy ingyenes tojás.
          </Text>
          <View style={styles.eggs}>
            {Array.from({ length: EGG_SLOTS }, (_, i) => {
              const egg = eggs[i];
              if (!egg) {
                return (
                  <View key={`empty-${i}`} style={[styles.slot, styles.slotEmpty]}>
                    <Text style={{ fontSize: 30, opacity: 0.6 }}>🪺</Text>
                    <Text style={styles.slotSmall}>Üres fészek</Text>
                    {freeEggReady ? (
                      <Button title="+ Ingyenes tojás" variant="orange" small onPress={onLayEgg} loading={busy === 'lay'} />
                    ) : (
                      <Text style={styles.slotSmall}>
                        Következő ingyenes tojás:{'\n'}
                        <Text style={styles.slotStrong}>{nextFreeEggAt ? formatCountdown(ts(nextFreeEggAt) - now) : '–'}</Text>
                      </Text>
                    )}
                  </View>
                );
              }
              const hatchAt = ts(egg.hatches_at);
              const ready = now >= hatchAt;
              return (
                <View key={egg.id} style={styles.slot}>
                  <Text style={styles.egg}>🥚</Text>
                  {ready ? (
                    <>
                      <Text style={styles.slotStrong}>Kikelt!</Text>
                      <Button title="Megnézem 🐣" variant="orange" small onPress={() => onHatch(egg)} loading={busy === egg.id} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.slotSmall}>Kikelésig</Text>
                      <Text style={styles.slotStrong}>{formatCountdown(hatchAt - now)}</Text>
                      <ProgressBar
                        value={(now - ts(egg.laid_at)) / (hatchAt - ts(egg.laid_at))}
                        color={colors.orange}
                        track="rgba(255,255,255,0.15)"
                      />
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <SectionTitle title="Madaraid" hint={`${freeCount}/${birds.length} bevethető`} />
        {birds.map((b) => (
          <BirdCard key={b.id} bird={b} species={species[b.species_id]} now={now} onPress={() => setEditing(b)} />
        ))}

        <SectionTitle title="Madárkatalógus" hint={`${discovered.size}/${catalog.length} felfedezve`} />
        <View style={styles.catalog}>
          {catalog.map((s) => {
            const known = discovered.has(s.id);
            return (
              <View key={s.id} style={[styles.catItem, !known && styles.catLocked]}>
                <Text style={[styles.catEmoji, !known && { opacity: 0.15 }]}>{s.emoji}</Text>
                <Text style={[styles.catName, !known && { color: '#A8A193' }]}>{known ? s.name : '???'}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[ui.textMuted, { textAlign: 'center', marginTop: 12 }]}>A madárlista folyamatosan bővül 🪶</Text>
      </Screen>
      <SendFab />

      <HatchModal result={hatched} onClose={() => setHatched(null)} />
      <RenameModal
        bird={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await reload();
        }}
      />
    </View>
  );
}

function HatchModal({ result, onClose }: { result: HatchResult | null; onClose: () => void }) {
  const { species } = useGame();
  const sp = result ? species[result.species_id] : undefined;
  return (
    <Modal visible={!!result} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {sp && result ? (
            <>
              <View style={[styles.revealPic, { backgroundColor: speciesBg[sp.id] ?? colors.mossSoft }]}>
                <Text style={{ fontSize: 80 }}>{sp.emoji}</Text>
              </View>
              <Text style={styles.revealTitle}>{sp.name}!</Text>
              <View style={[ui.row, { justifyContent: 'center' }]}>
                <RarityTag rarity={sp.rarity} />
              </View>
              {result.is_new_species ? <Text style={styles.newSpecies}>✨ Új faj a katalógusodban!</Text> : null}
              <Text style={styles.revealText}>{sp.description}</Text>
              <View style={[ui.row, { justifyContent: 'center', marginVertical: 8 }]}>
                <StatChip text={`🚀 Kiszállítás: ${formatSpan(sp.delivery_seconds)}`} />
                <StatChip text={`😴 Pihenés: ${formatSpan(sp.rest_seconds)}`} />
              </View>
              <Text style={styles.revealText}>
                A neve: <Text style={{ fontFamily: fonts.heavy }}>{result.bird_name}</Text> – már a madárházadban vár.
              </Text>
              <Button title="Szuper! 🎉" onPress={onClose} style={{ marginTop: 12 }} />
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function RenameModal({ bird, onClose, onSaved }: { bird: Bird | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { species } = useGame();
  const sp = bird ? species[bird.species_id] : undefined;

  async function save() {
    if (!bird) return;
    setSaving(true);
    try {
      await renameBird(bird.id, name);
      onSaved();
    } catch (e) {
      Alert.alert('Nem sikerült', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={!!bird} transparent animationType="fade" onRequestClose={onClose} onShow={() => setName(bird?.name ?? '')}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.revealTitle}>
            {sp?.emoji} {bird?.name}
          </Text>
          {sp ? <Text style={[styles.revealText, { marginBottom: 12 }]}>{sp.description}</Text> : null}
          <Text style={ui.fieldLabel}>Átnevezés</Text>
          <TextInput value={name} onChangeText={setName} maxLength={30} style={ui.input} />
          <View style={[ui.row, { marginTop: 14 }]}>
            <Button title="Mégse" variant="line" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Mentés" onPress={save} loading={saving} disabled={!name.trim()} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  nest: { backgroundColor: colors.moss, borderRadius: radius, padding: 16 },
  nestText: { fontFamily: fonts.semi, fontSize: 14, color: colors.orangeSoft, marginBottom: 12, lineHeight: 20 },
  eggs: { flexDirection: 'row', gap: 12 },
  slot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    padding: 12,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  slotEmpty: { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,180,118,0.45)' },
  slotSmall: { fontFamily: fonts.semi, fontSize: 12, color: colors.orangeSoft, opacity: 0.85, textAlign: 'center' },
  slotStrong: { fontFamily: fonts.heavy, fontSize: 15, color: colors.orange, textAlign: 'center' },
  egg: { fontSize: 46 },
  catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catItem: { width: '31%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  catLocked: { backgroundColor: '#ECE6DC' },
  catEmoji: { fontSize: 30, marginBottom: 2 },
  catName: { fontFamily: fonts.bold, fontSize: 12, color: colors.moss },
  backdrop: { flex: 1, backgroundColor: 'rgba(18,20,16,0.6)', justifyContent: 'center', padding: 22 },
  sheet: { backgroundColor: colors.cream, borderRadius: 24, padding: 22 },
  revealPic: { alignSelf: 'center', width: 130, height: 130, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  revealTitle: { fontFamily: fonts.headingHeavy, fontSize: 30, color: colors.moss, textAlign: 'center', marginBottom: 6 },
  revealText: { fontFamily: fonts.semi, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 6 },
  newSpecies: { fontFamily: fonts.heavy, fontSize: 14, color: colors.orangeDeep, textAlign: 'center', marginTop: 8 },
});
