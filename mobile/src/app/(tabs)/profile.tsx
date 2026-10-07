import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, APP_VERSION, Button, Card, Screen, SectionTitle, styles as ui } from '../../components/ui';
import {
  deleteAccount,
  errorMessage,
  fetchSent,
  removeFriend,
  respondFriendRequest,
  type SentPost,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useGame } from '../../lib/game';
import { registerForPush } from '../../lib/push';
import { colors, fonts, radius } from '../../lib/theme';
import { formatCountdown, ts, useNow } from '../../lib/time';
import type { FriendEntry } from '../../lib/types';

/** Webes és natív megerősítő ablak egyben. */
function confirm(title: string, message: string, okText: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Mégse', style: 'cancel' },
    { text: okText, style: 'destructive', onPress: onOk },
  ]);
}

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();
  const { birds, friends, species, reload } = useGame();
  const now = useNow(10_000);
  const [sent, setSent] = useState<SentPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.all([reload(), fetchSent().then(setSent)]).catch((e) => console.warn(e));
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      await reload();
    } catch (e) {
      Alert.alert('Nem sikerült', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const accepted = friends.filter((f) => f.status === 'accepted');
  const incoming = friends.filter((f) => f.status === 'incoming');
  const outgoing = friends.filter((f) => f.status === 'outgoing');

  async function enablePush() {
    if (!session) return;
    const ok = await registerForPush(session.user.id);
    if (ok) Alert.alert('Értesítések bekapcsolva 🔔', 'Szólunk, ha megérkezik egy madár, kikel egy tojás vagy kipiheni magát egy madarad.');
    else
      Alert.alert('Az értesítések nincsenek engedélyezve', 'A telefon beállításaiban engedélyezheted a birdly értesítéseit.', [
        { text: 'Később', style: 'cancel' },
        { text: 'Beállítások', onPress: () => Linking.openSettings() },
      ]);
  }

  function onDeleteAccount() {
    confirm(
      'Fiók végleges törlése',
      'Minden adatod (madarak, tojások, ismerősök, képek) véglegesen törlődik. Ez nem vonható vissza.',
      'Törlés',
      () =>
        run('delete', async () => {
          await deleteAccount();
          await signOut();
        }),
    );
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    >
      <View style={styles.profileCard}>
        <Avatar name={profile?.display_name ?? '?'} color={profile?.avatar_color ?? colors.orange} size={84} />
        <Text style={styles.displayName}>{profile?.display_name ?? '…'}</Text>
        <Text style={styles.handle}>@{profile?.username ?? ''}</Text>
        <View style={styles.pstats}>
          <Stat value={birds.length} label="madár" />
          <Stat value={sent.length} label="elküldött kép" />
          <Stat value={accepted.length} label="ismerős" />
        </View>
      </View>

      {incoming.length > 0 && (
        <>
          <SectionTitle title="Ismerősnek jelöltek" hint={`${incoming.length} új`} />
          <Card style={styles.list}>
            {incoming.map((f) => (
              <FriendRow key={f.profile.id} friend={f}>
                <Button title="Elfogad" small onPress={() => run(f.profile.id, () => respondFriendRequest(f.profile.id, true))} loading={busy === f.profile.id} />
                <Button title="✕" small variant="line" onPress={() => run(f.profile.id, () => respondFriendRequest(f.profile.id, false))} />
              </FriendRow>
            ))}
          </Card>
        </>
      )}

      <SectionTitle title="Ismerősök" hint={accepted.length ? 'törlés: hosszan nyomva' : '0 fő'} />
      <Card style={styles.list}>
        {accepted.length === 0 && (
          <Text style={[ui.textMuted, { padding: 14 }]}>Még nincs ismerősöd. Jelöld be a barátaidat a felhasználónevük alapján!</Text>
        )}
        {accepted.map((f) => (
          <FriendRow
            key={f.profile.id}
            friend={f}
            onLongPress={() =>
              confirm('Ismerős törlése', `Biztosan törlöd ${f.profile.display_name} ismerőst?`, 'Törlés', () =>
                run(f.profile.id, () => removeFriend(f.profile.id)),
              )
            }
          >
            <Button title="📷 Küldés" small onPress={() => router.push({ pathname: '/send', params: { to: f.profile.id } })} />
          </FriendRow>
        ))}
        {outgoing.map((f) => (
          <FriendRow key={f.profile.id} friend={f} subtitle="Jelölés elküldve – válaszra vár">
            <Button title="Visszavon" small variant="line" onPress={() => run(f.profile.id, () => removeFriend(f.profile.id))} />
          </FriendRow>
        ))}
      </Card>
      <Button title="+ Ismerős hozzáadása" variant="orange" onPress={() => router.push('/add-friend')} />

      <SectionTitle title="Elküldött képeid" hint="utolsó 24 óra" />
      <Card style={styles.list}>
        {sent.length === 0 && <Text style={[ui.textMuted, { padding: 14 }]}>Még nem küldtél képet. Nyomd meg a 📷 gombot!</Text>}
        {sent.map((p) => {
          const arrive = ts(p.arrive_at);
          const status = now < arrive ? `úton · még ${formatCountdown(arrive - now)}` : p.liked_at ? 'kézbesítve · ❤️ tetszett' : 'kézbesítve ✓';
          return (
            <View key={p.id} style={styles.row}>
              <Text style={{ fontSize: 26 }}>{species[p.species_id]?.emoji ?? '🐦'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={ui.textBold}>{p.recipient?.display_name ?? 'Ismeretlen'}</Text>
                <Text style={ui.textMuted}>
                  {p.bird_name} · {status}
                </Text>
              </View>
            </View>
          );
        })}
      </Card>

      <SectionTitle title="Beállítások" />
      <Card style={styles.list}>
        <SettingRow emoji="🔔" title="Értesítések" subtitle="Madárérkezés, kikelés, pihenés" onPress={enablePush} />
        <SettingRow emoji="🚪" title="Kijelentkezés" onPress={() => signOut()} />
        <SettingRow emoji="🗑️" title="Fiók törlése" danger onPress={onDeleteAccount} />
      </Card>
      <Text style={[ui.textMuted, { textAlign: 'center', marginTop: 8 }]}>
        birdly {APP_VERSION} · béta {busy === 'delete' ? '· törlés folyamatban…' : ''}
      </Text>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FriendRow({
  friend,
  subtitle,
  children,
  onLongPress,
}: {
  friend: FriendEntry;
  subtitle?: string;
  children?: ReactNode;
  onLongPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onLongPress={onLongPress} delayLongPress={400}>
      <Avatar name={friend.profile.display_name} color={friend.profile.avatar_color} />
      <View style={{ flex: 1 }}>
        <Text style={ui.textBold}>{friend.profile.display_name}</Text>
        <Text style={ui.textMuted}>{subtitle ?? `@${friend.profile.username}`}</Text>
      </View>
      {children}
    </Pressable>
  );
}

function SettingRow({
  emoji,
  title,
  subtitle,
  danger,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cream }]}
    >
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[ui.textBold, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={ui.textMuted}>{subtitle}</Text> : null}
      </View>
      <Text style={ui.textMuted}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: { backgroundColor: colors.moss, borderRadius: radius, padding: 20, alignItems: 'center' },
  displayName: { fontFamily: fonts.headingHeavy, fontSize: 26, color: colors.orange, marginTop: 10 },
  handle: { fontFamily: fonts.semi, fontSize: 14, color: colors.orangeSoft, opacity: 0.8 },
  pstats: { flexDirection: 'row', marginTop: 16, alignSelf: 'stretch' },
  statValue: { fontFamily: fonts.headingHeavy, fontSize: 24, color: colors.orange },
  statLabel: { fontFamily: fonts.semi, fontSize: 12, color: colors.orangeSoft, opacity: 0.85 },
  list: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
