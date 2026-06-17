import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import HomeIcon from '@mui/icons-material/Home';
import { NavLink, Outlet } from 'react-router-dom';
import backgroundImg from '../../background/background.png';

const navButtonSx = {
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: '0.85rem',
  px: 2,
  py: 0.8,
  borderRadius: 1.5,
  '&:hover': {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  '&.active': {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
};

/**
 * Layout corporativo Monte Bravo - background com imagem + overlay escuro.
 */
export function Layout() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      minHeight="100vh"
      sx={{
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${backgroundImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(0.35)',
          zIndex: -1,
        },
      }}
    >
      <AppBar position="sticky">
        <Toolbar sx={{ px: { xs: 2, md: 4 }, minHeight: { xs: 56, md: 64 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1 }}>
            <Typography
              sx={{
                color: '#ffffff',
                fontFamily: '"Termina", sans-serif',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '-0.02em',
              }}
            >
              montebravo
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.75rem',
                borderLeft: '1px solid rgba(255,255,255,0.15)',
                pl: 1.5,
              }}
            >
              Termos de Responsabilidade
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5}>
            <Button component={NavLink} to="/" startIcon={<HomeIcon sx={{ fontSize: 18 }} />} sx={navButtonSx} end>
              Início
            </Button>
            <Button component={NavLink} to="/historico" startIcon={<HistoryIcon sx={{ fontSize: 18 }} />} sx={navButtonSx}>
              Histórico
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>
        <Outlet />
      </Container>

      <Box
        component="footer"
        textAlign="center"
        py={2.5}
        sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <Typography variant="body2" fontSize="0.75rem" sx={{ color: 'rgba(255,255,255,0.4)' }}>
          Monte Bravo Investimentos &middot; Sistema de Termos de Responsabilidade
        </Typography>
      </Box>
    </Box>
  );
}
