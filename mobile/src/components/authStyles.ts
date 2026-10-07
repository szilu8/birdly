import { StyleSheet } from 'react-native';
import { colors, fonts } from '../lib/theme';

export const authStyles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.moss },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 70 },
  tagline: { fontFamily: fonts.semi, fontSize: 16, color: colors.orangeSoft, textAlign: 'center', marginTop: 4, marginBottom: 28 },
  panel: { backgroundColor: colors.cream, borderRadius: 22, padding: 18 },
  link: { fontFamily: fonts.semi, fontSize: 15, color: colors.orangeSoft, textAlign: 'center', marginTop: 22, padding: 6 },
  linkStrong: { fontFamily: fonts.heavy, color: colors.orange },
  hint: { fontFamily: fonts.semi, fontSize: 12, color: colors.muted, marginTop: -6, marginBottom: 12 },
});
