export const theme = {
  colors: {
    black: '#0A0A0A',
    surface: '#111111',
    card: '#1A1A1A',
    border: '#242424',
    white: '#F0F0EB',
    muted: '#5A5A5A',
    emerald: '#00E676',
    emeraldDim: '#00C85A',
    emeraldGlow: 'rgba(0,230,118,0.10)',
    amber: '#FFB800',
    red: '#FF4757',
    blue: '#00B4FF',
    orange: '#FF6B35',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, full: 100 },
} as const;

export type Theme = typeof theme;
