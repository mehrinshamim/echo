// Design tokens. Mirrors design-system-doc.md sections 2–5 one to one; change both together.

export const colors = {
  logs: { fill: '#bcd4f6', line: '#2f6fd0' },
  themes: { fill: '#f7b6d6', line: '#c93d84' },
  chats: { fill: '#b9dfa8', line: '#3f8a2c' },
  styles: { fill: '#f6dd8f', line: '#a57a10', tint: '#fbf3d6' },
  ink: '#141414',
  textSecondary: '#45413b',
  placeholder: '#5c574f',
  bg: '#f6f1e8',
  card: '#ffffff',
  divider: 'rgba(20,20,20,0.15)',
  focus: '#2f6fd0',
  onInk: '#ffffff',
  scrim: 'rgba(20,20,20,0.45)',
} as const;

export type Section = 'logs' | 'themes' | 'chats' | 'styles';

export const font = {
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
} as const;

export const type = {
  h1: { fontFamily: font.extrabold, fontSize: 32, lineHeight: 35, letterSpacing: -0.64, color: colors.ink },
  h1Lg: { fontFamily: font.extrabold, fontSize: 36, lineHeight: 38, letterSpacing: -0.72, color: colors.ink },
  h2: { fontFamily: font.extrabold, fontSize: 19, lineHeight: 24, color: colors.ink },
  body: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24, color: colors.ink },
  meta: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  button: { fontFamily: font.bold, fontSize: 16, lineHeight: 20, color: colors.ink },
  label: { fontFamily: font.bold, fontSize: 13, lineHeight: 16, color: colors.ink },
} as const;

export const border = { width: 1.5, color: colors.ink } as const;

/** Dashed variant for "add" actions and the merge suggestion card. */
export const borderDashed = { borderWidth: border.width, borderColor: border.color, borderStyle: 'dashed' } as const;

export const radius = { card: 20, tile: 16, pill: 999 } as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const layout = { gutter: 20, cardGap: 12, cardPadding: 16 } as const;

export const size = {
  tap: 44,
  btnPrimary: 56,
  btnSecondary: 48,
  back: 44,
  chip: 38,
  citation: 24,
  dot: 12,
  line: 2,
  themeStrip: 6,
  focusRing: 3,
  icon: 20,
  iconBar: 22,
} as const;

export const shadow = {
  float: {
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

export const pressed = 0.7;
