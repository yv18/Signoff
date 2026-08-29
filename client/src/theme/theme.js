import { createTheme } from '@mui/material/styles';

/**
 * Design tokens. One clean, monochrome light theme: white surfaces, black as
 * the single action colour, thin grey hairlines, corners at 10px or less.
 */
export const tokens = {
  // canvas + surfaces
  void: '#F6F6F7', // page background
  deep: '#FFFFFF', // default paper
  glass: '#FFFFFF', // panel surface (name kept for compatibility)
  glassHi: '#F2F2F3', // hover / raised surface

  // brand — black primary, white secondary
  iris: '#000000', // primary action colour
  irisDim: '#1A1A1A', // primary hover / pressed
  signal: '#0A0A0A', // small decorative marks
  amber: '#B45309', // warning text only

  // text
  paper: '#0A0A0A', // primary text
  muted: '#5A5A5E', // secondary text
  faint: '#8A8A90', // disabled / meta text

  // lines
  edge: '#E6E6E8',
  edgeHi: '#D4D4D7'
};

/** The one mixin every surface in the app uses: a white panel, hairline border, soft shadow. */
export const glass = (extra = {}) => ({
  background: tokens.glass,
  border: `1px solid ${tokens.edge}`,
  // string so MUI's sx transform does not multiply it by theme.shape.borderRadius
  borderRadius: '10px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 10px 30px -18px rgba(0,0,0,0.18)',
  ...extra
});

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: { default: tokens.void, paper: tokens.deep },
    primary: { main: '#000000', dark: '#1A1A1A', contrastText: '#FFFFFF' },
    secondary: { main: '#FFFFFF', dark: '#F2F2F3', contrastText: '#000000' },
    warning: { main: tokens.amber },
    text: { primary: tokens.paper, secondary: tokens.muted, disabled: tokens.faint },
    divider: tokens.edge
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
    h1: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 },
    h2: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 },
    h3: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0' },
    overline: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.14em', fontWeight: 500 }
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.void,
          color: tokens.paper,
          overflowX: 'hidden',
          WebkitFontSmoothing: 'antialiased'
        },
        '::selection': { background: '#000000', color: '#FFFFFF' },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' }
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '9px 18px',
          fontSize: 14,
          transition: 'background .16s ease, border-color .16s ease, transform .16s ease',
          '&:active': { transform: 'translateY(1px)' }
        },
        sizeLarge: { padding: '12px 22px', fontSize: 15 },
        containedPrimary: {
          background: '#000000',
          color: '#FFFFFF',
          '&:hover': { background: '#1A1A1A' }
        },
        containedSecondary: {
          background: '#FFFFFF',
          color: '#000000',
          border: `1px solid ${tokens.edgeHi}`,
          '&:hover': { background: '#F2F2F3' }
        },
        outlined: {
          background: '#FFFFFF',
          borderColor: tokens.edgeHi,
          color: '#000000',
          '&:hover': { background: '#F2F2F3', borderColor: tokens.edgeHi }
        },
        text: { color: tokens.paper, '&:hover': { background: '#F2F2F3' } }
      }
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500, borderRadius: 6 } } },
    MuiTabs: {
      styleOverrides: { indicator: { height: 2, borderRadius: 2, background: '#000000' } }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          color: tokens.faint,
          '&.Mui-selected': { color: '#000000' }
        }
      }
    },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          background: '#FFFFFF',
          transition: 'border-color .16s ease',
          '& fieldset': { borderColor: tokens.edge },
          '&:hover fieldset': { borderColor: tokens.edgeHi },
          '&.Mui-focused fieldset': { borderColor: '#000000', borderWidth: 1 }
        },
        input: { '&::placeholder': { color: tokens.faint, opacity: 1 } }
      }
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: tokens.faint, '&.Mui-focused': { color: '#000000' } } }
    },
    MuiDivider: { styleOverrides: { root: { borderColor: tokens.edge } } },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 10 } } }
  }
});
