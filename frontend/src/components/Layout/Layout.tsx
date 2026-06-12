import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import HomeIcon from '@mui/icons-material/Home';
import { NavLink, Outlet } from 'react-router-dom';

const navButtonSx = {
  color: '#ffffff',
  '&.active': {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
};

/**
 * Layout principal da aplicacao: barra de navegacao no topo e area de
 * conteudo das paginas.
 */
export function Layout() {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <AssignmentIcon />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Termos de Responsabilidade
          </Typography>
          <Button component={NavLink} to="/" startIcon={<HomeIcon />} sx={navButtonSx} end>
            Início
          </Button>
          <Button component={NavLink} to="/historico" startIcon={<HistoryIcon />} sx={navButtonSx}>
            Histórico
          </Button>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
        <Outlet />
      </Container>

      <Box component="footer" textAlign="center" py={2} color="text.secondary">
        <Typography variant="body2">
          Envio de Termos de Responsabilidade &middot; Integração GLPI + DocuSign
        </Typography>
      </Box>
    </Box>
  );
}
