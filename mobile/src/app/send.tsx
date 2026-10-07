import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Field, styles as ui } from '../components/ui';
import { birdStatus, errorMessage, sendPhoto } from '../lib/api';
import { useGame } from '../lib/game';
import { colors, fonts } from '../lib/theme';
import { formatCountdown, formatSpan, useNow } from '../lib/time';

export default function SendScreen() {
  const params = useLocalSearchParams<{ to?: string }>();
  const { birds, species, friends, reload } = useGame();
  const now = useNow();
  const insets = useSafeAreaInsets();

  const accepted = friends.filter((f) => f.status === 'accepted');
  // A sorrendet (szabad madarak elöl, leggyorsabb elöl) csak megnyitáskor számoljuk, hogy ne ugráljon.
  const [order] = useState(() =>
    [...birds]
      .sort((a, b) => {
        const fa = birdStatus(a, Date.now()).kind === 'free' ? 0 : 1;
        const fb = birdStatus(b, Date.now()).kind === 'free' ? 0 : 1;
        return fa - fb || (species[a.species_id]?.delivery_seconds ?? 0) - (species[b.species_id]?.delivery_seconds ?? 0);
      })
      .map((b) => b.id),
  );
  const sortedBirds = useMemo(
    () => [...birds].sort((a, b) => (order.indexOf(a.id) + 1 || 1e9) - (order.indexOf(b.id) + 1 || 1e9)),
    [birds, order],
  );

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [to, setTo] = useState<string | null>(params.to ?? (accepted.length === 1 ? accepted[0].profile.id : null));
  const [birdId, setBirdId] = useState<string | null>(
    () => sortedBirds.find((b) => birdStatus(b, Date.now()).kind === 'free')?.id ?? null,
  );
  const [sending, setSending] = useState(false);

  async function pick(source: 'camera' | 'library') {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        source === 'camera' ? 'Nincs hozzáférés a kamerához' : 'Nincs hozzáférés a képekhez',
        'A telefon beállításaiban engedélyezheted.',
        [
          { text: 'Mégse', style: 'cancel' },
          { text: 'Beállítások', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.9 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }

  const bird = birds.find((b) => b.id === birdId);
  const birdSpecies = bird ? species[bird.species_id] : undefined;
  const recipient = accepted.find((f) => f.profile.id === to);
  const canSend = Boolean(imageUri && bird && recipient && birdStatus(bird, now).kind === 'free');

  async function send() {
    if (!imageUri || !bird || !recipient) return;
    setSending(true);
    try {
      await sendPhoto({ uri: imageUri, birdId: bird.id, recipientId: recipient.profile.id, caption });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await reload();
      router.back();
      Alert.alert(
        `${birdSpecies?.emoji ?? '🐦'} ${bird.name} elindult!`,
        `${formatSpan(birdSpecies?.delivery_seconds ?? 0)} múlva kézbesíti a képet ${recipient.profile.display_name} falára.`,
      );
    } catch (e) {
      Alert.alert('Nem sikerült elküldeni', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.grab} />
        <Text style={styles.title}>Kép küldése 📷</Text>

        <Text style={styles.label}>1. Kép</Text>
        {imageUri ? (
          <Pressable onPress={() => setImageUri(null)} style={styles.preview}>
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>✕ Másik kép</Text>
            </View>
          </Pressable>
        ) : (
          <View style={ui.row}>
            {Platform.OS !== 'web' && (
              <Pressable style={styles.pickBox} onPress={() => pick('camera')}>
                <Text style={styles.pickEmoji}>📸</Text>
                <Text style={styles.pickText}>Fotózás</Text>
              </Pressable>
            )}
            <Pressable style={styles.pickBox} onPress={() => pick('library')}>
              <Text style={styles.pickEmoji}>🖼️</Text>
              <Text style={styles.pickText}>Galéria</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>2. Felirat</Text>
        <Field value={caption} onChangeText={setCaption} maxLength={200} placeholder="Írj valamit a képhez… (nem kötelező)" />

        <Text style={styles.label}>3. Kinek?</Text>
        {accepted.length === 0 ? (
          <View>
            <Text style={ui.textMuted}>Még nincs ismerősöd, akinek küldhetnél.</Text>
            <Button
              title="+ Ismerős hozzáadása"
              variant="orange"
              small
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
              onPress={() => {
                router.back();
                router.push('/add-friend');
              }}
            />
          </View>
        ) : (
          <View style={styles.chips}>
            {accepted.map((f) => {
              const sel = f.profile.id === to;
              return (
                <Pressable key={f.profile.id} onPress={() => setTo(f.profile.id)} style={[styles.chip, sel && styles.chipSel]}>
                  <Avatar name={f.profile.display_name} color={f.profile.avatar_color} size={24} />
                  <Text style={[styles.chipText, sel && { color: colors.orange }]}>{f.profile.display_name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>4. Melyik madár vigye?</Text>
        <View style={{ gap: 8 }}>
          {sortedBirds.map((b) => {
            const sp = species[b.species_id];
            const st = birdStatus(b, now);
            const free = st.kind === 'free';
            const sel = b.id === birdId;
            const sub = free
              ? `Kézbesítés: ${formatSpan(sp?.delivery_seconds ?? 0)} · utána ${formatSpan(sp?.rest_seconds ?? 0)} pihenő`
              : st.kind === 'flying'
                ? `Úton van – újra bevethető: ${formatCountdown(new Date(b.ready_at ?? 0).getTime() - now)}`
                : `Pihen még ${formatCountdown(st.until - now)}`;
            return (
              <Pressable
                key={b.id}
                disabled={!free}
                onPress={() => setBirdId(b.id)}
                style={[styles.birdRow, sel && free && styles.birdRowSel, !free && { opacity: 0.5 }]}
              >
                <Text style={{ fontSize: 28 }}>{sp?.emoji ?? '🐦'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ui.textBold}>
                    {b.name} <Text style={ui.textMuted}>· {sp?.name}</Text>
                  </Text>
                  <Text style={ui.textMuted}>{sub}</Text>
                </View>
                <Text>{free ? (sel ? '✅' : '⚪') : '😴'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[ui.row, { marginTop: 22 }]}>
          <Button title="Mégse" variant="line" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title="Elküldés 🪶" onPress={send} loading={sending} disabled={!canSend} style={{ flex: 2 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 99, backgroundColor: '#D3CBBE', marginBottom: 14 },
  title: { fontFamily: fonts.headingHeavy, fontSize: 26, color: colors.moss },
  label: { fontFamily: fonts.heavy, fontSize: 15, color: colors.moss, marginTop: 18, marginBottom: 8 },
  pickBox: {
    flex: 1,
    height: 110,
    borderRadius: 16,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pickEmoji: { fontSize: 34 },
  pickText: { fontFamily: fonts.heavy, color: colors.moss },
  preview: { width: '60%', aspectRatio: 4 / 5, borderRadius: 16, overflow: 'hidden', alignSelf: 'center', backgroundColor: colors.black },
  previewBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(18,20,16,0.75)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  previewBadgeText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.orangeSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 99,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSel: { backgroundColor: colors.moss, borderColor: colors.moss },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  birdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  birdRowSel: { borderColor: colors.orangeDeep, backgroundColor: '#FFF1E3' },
});
