import { createTheme } from '@mui/material/styles';

/**
 * Tema corporativo Monte Bravo.
 *
 * Paleta baseada na identidade visual:
 * - #242424 (preto/escuro)
 * - #201A47 (roxo profundo - cor principal)
 * - #635D80 (roxo medio)
 * - #7F808F (cinza)
 * - #F2F2F2 (cinza claro / background)
 *
 * Tipografia: DM Sans (titulos) + Inter (corpo)
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#201A47',
      light: '#635D80',
      dark: '#151030',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#635D80',
      light: '#7F808F',
      dark: '#4a4562',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F2F2F2',
      paper: '#ffffff',
    },
    text: {
      primary: '#242424',
      secondary: '#7F808F',
    },
    divider: 'rgba(32, 26, 71, 0.08)',
    success: {
      main: '#1a8754',
      light: '#e8f5ef',
    },
    error: {
      main: '#d32f2f',
      light: '#fdecea',
    },
    warning: {
      main: '#ed6c02',
      light: '#fff4e5',
    },
    info: {
      main: '#201A47',
      light: '#eeedf5',
    },
  },
  typography: {
    fontFamily: ['"Graphie"', '"Source Sans 3"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'].join(','),
    h4: {
      fontFamily: '"Termina", sans-serif',
      fontWeight: 500,
      fontSize: '1.5rem',
      letterSpacing: '-0.01em',
      color: '#242424',
    },
    h5: {
      fontFamily: '"Termina", sans-serif',
      fontWeight: 500,
      fontSize: '1.2rem',
      letterSpacing: '-0.01em',
      color: '#242424',
    },
    h6: {
      fontFamily: '"Termina", sans-serif',
      fontWeight: 500,
      fontSize: '1rem',
      letterSpacing: '-0.005em',
      color: '#242424',
    },
    subtitle1: {
      fontFamily: '"Graphie", sans-serif',
      fontWeight: 600,
      fontSize: '0.95rem',
      color: '#242424',
    },
    body1: {
      fontFamily: '"Graphie", sans-serif',
      fontSize: '0.9rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: '#242424',
    },
    body2: {
      fontFamily: '"Graphie", sans-serif',
      fontSize: '0.8rem',
      fontWeight: 400,
      color: '#7F808F',
    },
    button: {
      fontFamily: '"Termina", sans-serif',
      fontWeight: 500,
      fontSize: '0.8rem',
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(32, 26, 71, 0.04), 0 1px 2px rgba(32, 26, 71, 0.06)',
    '0 2px 6px rgba(32, 26, 71, 0.05), 0 1px 3px rgba(32, 26, 71, 0.08)',
    '0 4px 12px rgba(32, 26, 71, 0.06), 0 2px 4px rgba(32, 26, 71, 0.04)',
    '0 8px 24px rgba(32, 26, 71, 0.08), 0 2px 8px rgba(32, 26, 71, 0.04)',
    ...Array(21).fill('0 8px 24px rgba(32, 26, 71, 0.08), 0 2px 8px rgba(32, 26, 71, 0.04)'),
  ] as any,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#1a1a1a',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(36, 36, 36, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '10px 20px',
          transition: 'all 0.2s ease',
        },
        contained: {
          backgroundColor: '#201A47',
          '&:hover': {
            backgroundColor: '#151030',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(32, 26, 71, 0.2)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&.Mui-disabled': {
            backgroundColor: '#7F808F',
            color: '#ffffff',
            opacity: 0.5,
          },
        },
        outlined: {
          borderColor: 'rgba(32, 26, 71, 0.2)',
          color: '#201A47',
          '&:hover': {
            borderColor: '#201A47',
            backgroundColor: 'rgba(32, 26, 71, 0.04)',
          },
        },
        text: {
          color: '#201A47',
          '&:hover': {
            backgroundColor: 'rgba(32, 26, 71, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 2,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(32, 26, 71, 0.06)',
          transition: 'box-shadow 0.2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#201A47',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(32, 26, 71, 0.08)',
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#7F808F',
          '&.Mui-checked': {
            color: '#201A47',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#7F808F',
          '&.Mui-checked': {
            color: '#201A47',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(32, 26, 71, 0.04)',
          },
        },
      },
    },
  },
});
