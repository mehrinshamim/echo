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
  recording: '#d63a3a',
} as const;

export type Section = 'logs' | 'themes' | 'chats' | 'styles';

export const font = {
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
} as const;

export const type = {
  h1: { fontFamily: font.extrabold, fontSize: 28, lineHeight: 30, letterSpacing: -0.56, color: colors.ink },
  h1Lg: { fontFamily: font.extrabold, fontSize: 36, lineHeight: 38, letterSpacing: -0.72, color: colors.ink },
  h2: { fontFamily: font.extrabold, fontSize: 19, lineHeight: 24, color: colors.ink },
  body: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  /** Transcripts, summaries and answers read larger (HTML: 17px / 1.55–1.65). */
  bodyLg: { fontFamily: font.medium, fontSize: 17, lineHeight: 27, color: colors.ink },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24, color: colors.ink },
  meta: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  button: { fontFamily: font.bold, fontSize: 16, lineHeight: 20, color: colors.ink },
  /** Back pill, tabs, small buttons (HTML: 15/700). */
  tab: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: colors.ink },
  label: { fontFamily: font.bold, fontSize: 14, lineHeight: 18, color: colors.ink },
} as const;

export const border = { width: 1.5, color: colors.ink } as const;

/** Dashed variant for "add" actions and the merge suggestion card. */
export const borderDashed = { borderWidth: border.width, borderColor: border.color, borderStyle: 'dashed' } as const;

export const radius = { card: 20, tile: 16, small: 14, pill: 999 } as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const layout = { gutter: 18, cardGap: 12, cardPadding: 16 } as const;

export const size = {
  tap: 44,
  btnLg: 58,
  btnPrimary: 56,
  btnMd: 54,
  btnFooter: 52,
  btnSecondary: 48,
  btnSm: 40,
  btnXs: 36,
  back: 44,
  chip: 36,
  chipLg: 40,
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
    shadowColor: '#281e0a',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

export const pressed = 0.7;
