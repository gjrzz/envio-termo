import { useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import LoginIcon from '@mui/icons-material/Login';
import { useAuth } from '../contexts/AuthContext';
import backgroundImg from '../background/background.png';

/**
 * Pagina de login — tela inicial do sistema.
 */
export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ?? 'Falha ao autenticar. Verifique suas credenciais.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
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
      <Card sx={{ width: '100%', maxWidth: 420, mx: 2 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3} alignItems="center">
            <Box textAlign="center">
              <Typography
                sx={{
                  fontFamily: '"Termina", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.3rem',
                  letterSpacing: '-0.02em',
                  color: '#201A47',
                  mb: 0.5,
                }}
              >
                montebravo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Termos de Responsabilidade
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} width="100%">
              <Stack spacing={2}>
                <TextField
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                  autoFocus
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  placeholder="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
                  sx={{ mt: 1 }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
              Monte Bravo Investimentos
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
