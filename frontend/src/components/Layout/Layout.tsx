import { AppBar, Avatar, Box, Button, Container, IconButton, Menu, MenuItem, Stack, Toolbar, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import backgroundImg from '../../background/background.png';

const navButtonSx = {
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: '0.82rem',
  fontWeight: 500,
  px: 2,
  py: 0.8,
  borderRadius: 2,
  textTransform: 'none',
  '&:hover': {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  '&.active': {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    fontWeight: 600,
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

/**
 * Layout corporativo Monte Bravo - navbar refinada com avatar.
 */
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

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
      <AppBar position="sticky" sx={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(20, 16, 48, 0.85)' }}>
        <Toolbar sx={{ px: { xs: 2, md: 4 }, minHeight: { xs: 56, md: 64 } }}>
          {/* Logo */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1 }}>
            <Typography
              sx={{
                color: '#ffffff',
                fontFamily: '"Termina", sans-serif',
                fontWeight: 700,
                fontSize: '1.05rem',
                letterSpacing: '-0.02em',
              }}
            >
              montebravo
            </Typography>
            <Box sx={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 400 }}
            >
              Termos de Responsabilidade
            </Typography>
          </Stack>

          {/* Nav */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button component={NavLink} to="/" startIcon={<HomeIcon sx={{ fontSize: 17 }} />} sx={navButtonSx} end>
              Início
            </Button>
            <Button component={NavLink} to="/historico" startIcon={<HistoryIcon sx={{ fontSize: 17 }} />} sx={navButtonSx}>
              Histórico
            </Button>
            <Button component={NavLink} to="/usuarios" startIcon={<PeopleIcon sx={{ fontSize: 17 }} />} sx={navButtonSx}>
              Usuários
            </Button>

            <Box sx={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)', mx: 1.5 }} />

            {/* Avatar + Menu */}
            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
              <Avatar
                src={user?.avatar || undefined}
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: '#635D80',
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                {user ? getInitials(user.name) : '?'}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{ mt: 1 }}
            >
              <MenuItem disabled sx={{ opacity: 1 }}>
                <Stack>
                  <Typography fontSize="0.85rem" fontWeight={600}>{user?.name}</Typography>
                  <Typography fontSize="0.75rem" color="text.secondary">{user?.email}</Typography>
                </Stack>
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); navigate('/usuarios'); }}>
                Meu perfil
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ fontSize: 16, mr: 1 }} /> Sair
              </MenuItem>
            </Menu>
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
        sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <Typography variant="body2" fontSize="0.72rem" sx={{ color: 'rgba(255,255,255,0.35)' }}>
          Monte Bravo Investimentos &middot; Sistema de Termos de Responsabilidade
        </Typography>
      </Box>
    </Box>
  );
}
