import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button, Field, Logo } from '../../components/ui';
import { errorMessage, isUsernameAvailable } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { authStyles } from '../../components/authStyles';

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const cleanUsername = username.trim().toLowerCase();
  const valid =
    displayName.trim().length > 0 && USERNAME_RE.test(cleanUsername) && email.includes('@') && password.length >= 8;

  async function signUp() {
    setBusy(true);
    try {
      if (!(await isUsernameAvailable(cleanUsername))) {
        Alert.alert('Foglalt felhasználónév', 'Ezt a nevet már valaki használja, válassz másikat.');
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: cleanUsername, display_name: displayName.trim() } },
      });
      if (error) throw error;
      if (!data.session) {
        Alert.alert(
          'Már majdnem kész! 📬',
          'Küldtünk egy megerősítő e-mailt. Kattints a benne lévő linkre, aztán lépj be.',
          [{ text: 'Rendben', onPress: () => router.back() }],
        );
      }
    } catch (e) {
      Alert.alert('A regisztráció nem sikerült', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={authStyles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={authStyles.content} keyboardShouldPersistTaps="handled">
        <Logo size={50} />
        <Text style={authStyles.tagline}>Hozd létre a fiókod – kapsz egy galambot és egy tojást!</Text>

        <View style={authStyles.panel}>
          <Field label="Megjelenő név" value={displayName} onChangeText={setDisplayName} maxLength={40} placeholder="pl. Kovács Anna" />
          <Field
            label="Felhasználónév"
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            placeholder="pl. anna.k"
          />
          <Text style={authStyles.hint}>3–20 karakter: kisbetű, szám, pont, alávonás. Ezzel találnak meg az ismerőseid.</Text>
          <Field label="E-mail cím" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="te@pelda.hu" />
          <Field label="Jelszó" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="legalább 8 karakter" />
          <Button title="Regisztráció" onPress={signUp} loading={busy} disabled={!valid} />
        </View>

        <Text style={authStyles.link} onPress={() => router.back()}>
          Van már fiókod? <Text style={authStyles.linkStrong}>Lépj be!</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
