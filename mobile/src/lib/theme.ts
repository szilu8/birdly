export const colors = {
  orange: '#FFB476',
  orangeSoft: '#FFE2C6',
  orangeDeep: '#F2954B',
  moss: '#2F3D24',
  moss2: '#44562F',
  mossSoft: '#DCE3D2',
  black: '#121410',
  cream: '#FBF4EA',
  card: '#FFFFFF',
  line: '#EFE7DA',
  muted: '#6E7466',
  danger: '#B83A2E',
};

export const fonts = {
  heading: 'Baloo2_700Bold',
  headingHeavy: 'Baloo2_800ExtraBold',
  body: 'Nunito_400Regular',
  semi: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
};

export const radius = 18;

export const rarityStyle: Record<string, { bg: string; fg: string; label: string }> = {
  gyakori: { bg: colors.mossSoft, fg: colors.moss, label: 'Gyakori' },
  ritka: { bg: '#D8E6F7', fg: '#2A4A75', label: 'Ritka' },
  epikus: { bg: '#EAD9F5', fg: '#5B2A7A', label: 'Epikus' },
  legendas: { bg: colors.orange, fg: colors.black, label: 'Legendás' },
};
