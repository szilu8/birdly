import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { authStyles } from '../../components/authStyles';
import { Button, Field, Logo } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert('Nem sikerült belépni', errorMessage(error));
  }

  return (
    <KeyboardAvoidingView style={authStyles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={authStyles.content} keyboardShouldPersistTaps="handled">
        <Logo size={50} />
        <Text style={authStyles.tagline}>Küldd el madárral. Holnapra eltűnik.</Text>

        <View style={authStyles.panel}>
          <Field label="E-mail cím" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="te@pelda.hu" />
          <Field label="Jelszó" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" />
          <Button title="Belépés" variant="moss" onPress={signIn} loading={busy} disabled={!email || !password} />
        </View>

        <Link href="/sign-up" asChild>
          <Text style={authStyles.link}>Még nincs fiókod? <Text style={authStyles.linkStrong}>Regisztrálj!</Text></Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
