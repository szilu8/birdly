import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Field, styles as ui } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorMessage, sendFriendRequest } from '../lib/api';
import { useGame } from '../lib/game';
import { colors, fonts } from '../lib/theme';

export default function AddFriendScreen() {
  const { profile } = useAuth();
  const { reload } = useGame();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const result = await sendFriendRequest(username.trim().replace(/^@/, ''));
      await reload();
      Alert.alert(
        result === 'accepted' ? 'Ismerősök lettetek! 🎉' : 'Jelölés elküldve 💌',
        result === 'accepted'
          ? 'Ő már korábban bejelölt téged, így most már küldhettek egymásnak képeket.'
          : 'Ha elfogadja, küldhettek egymásnak képeket.',
      );
      router.back();
    } catch (e) {
      Alert.alert('Nem sikerült', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.grab} />
      <Text style={styles.title}>Ismerős hozzáadása</Text>
      <Text style={[ui.textMuted, { marginBottom: 18 }]}>
        Írd be a barátod felhasználónevét. A tiéd: <Text style={{ fontFamily: fonts.heavy, color: colors.moss }}>@{profile?.username}</Text> – ezt
        add meg neki, hogy ő is megtaláljon.
      </Text>
      <Field
        label="Felhasználónév"
        value={username}
        onChangeText={(t) => setUsername(t.toLowerCase())}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        placeholder="pl. anna.k"
        onSubmitEditing={submit}
        returnKeyType="send"
      />
      <View style={ui.row}>
        <Button title="Mégse" variant="line" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button title="Jelölés" onPress={submit} loading={busy} disabled={username.trim().length < 3} style={{ flex: 2 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream, padding: 20 },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 99, backgroundColor: '#D3CBBE', marginBottom: 16 },
  title: { fontFamily: fonts.headingHeavy, fontSize: 26, color: colors.moss, marginBottom: 4 },
});
