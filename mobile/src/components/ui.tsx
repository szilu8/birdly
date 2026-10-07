import Constants from 'expo-constants';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, rarityStyle } from '../lib/theme';

export const APP_VERSION = Constants.expoConfig?.version ?? '0.7.0';

// ---------- Fejléc ----------
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View style={[styles.row, { justifyContent: 'center' }]}>
      <Image source={require('../../assets/splash-icon.png')} style={{ width: size * 1.45, height: size * 1.45, marginRight: -size * 0.2 }} />
      <Text style={[styles.logo, { fontSize: size }]}>birdly</Text>
    </View>
  );
}

export function Header({ right }: { right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Logo />
      {right ?? (
        <View style={styles.versionPill}>
          <Text style={styles.versionText}>v{APP_VERSION.split('.').slice(0, 2).join('.')}</Text>
        </View>
      )}
    </View>
  );
}

// ---------- Görgethető képernyő frissítéssel ----------
export function Screen({
  children,
  refreshing = false,
  onRefresh,
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={styles.fill}>
      <Header />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.screenContent, contentStyle]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.moss} /> : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

// ---------- Gomb ----------
type ButtonVariant = 'orange' | 'moss' | 'line' | 'ghost' | 'danger';
export function Button({
  title,
  onPress,
  variant = 'moss',
  disabled,
  loading,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}
const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  orange: { bg: colors.orange, fg: colors.moss, border: colors.orange },
  moss: { bg: colors.moss, fg: colors.orange, border: colors.moss },
  line: { bg: 'transparent', fg: colors.moss, border: colors.moss },
  ghost: { bg: 'rgba(255,255,255,0.12)', fg: colors.orangeSoft, border: 'transparent' },
  danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
};

// ---------- Űrlapmező ----------
export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor="#A39B8E" {...props} style={[styles.input, props.style]} />
    </View>
  );
}

// ---------- Apróságok ----------
export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

export function RarityTag({ rarity }: { rarity: string }) {
  const r = rarityStyle[rarity] ?? rarityStyle.gyakori;
  return (
    <View style={[styles.tag, { backgroundColor: r.bg }]}>
      <Text style={[styles.tagText, { color: r.fg }]}>{r.label.toUpperCase()}</Text>
    </View>
  );
}

export function StatChip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.moss2, track = colors.mossSoft }: { value: number; color?: string; track?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.bar, { backgroundColor: track }]}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream },
  header: {
    backgroundColor: colors.moss,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { fontFamily: fonts.headingHeavy, fontSize: 28, color: colors.orange, letterSpacing: -0.5 },
  versionPill: { backgroundColor: colors.orange, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  versionText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.moss, letterSpacing: 0.5 },
  screenContent: { padding: 16, paddingBottom: 120 },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 18, marginBottom: 10, marginHorizontal: 2 },
  sectionTitleText: { fontFamily: fonts.heading, fontSize: 21, color: colors.moss },
  sectionHint: { fontFamily: fonts.semi, fontSize: 13, color: colors.muted },
  button: { minHeight: 46, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  buttonSmall: { minHeight: 36, paddingHorizontal: 12, borderRadius: 11 },
  buttonText: { fontFamily: fonts.heavy, fontSize: 15 },
  buttonTextSmall: { fontSize: 13 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  field: { marginBottom: 12 },
  fieldLabel: { fontFamily: fonts.heavy, fontSize: 13, color: colors.moss, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: '#E7DFD2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.semi,
    fontSize: 16,
    color: colors.black,
  },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.heavy, color: colors.moss },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  tagText: { fontFamily: fonts.heavy, fontSize: 10, letterSpacing: 0.5 },
  chip: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontFamily: fonts.bold, fontSize: 12, color: colors.moss2 },
  bar: { alignSelf: 'stretch', height: 6, borderRadius: 99, overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', borderRadius: 99 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.moss,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 10 },
  emptyEmoji: { fontSize: 50, marginBottom: 6 },
  emptyText: { fontFamily: fonts.semi, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  text: { fontFamily: fonts.body, fontSize: 15, color: colors.black },
  textBold: { fontFamily: fonts.heavy, fontSize: 15, color: colors.black },
  textMuted: { fontFamily: fonts.semi, fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
