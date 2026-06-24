import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';

/**
 * Pagina inicial — busca de colaborador pelo email corporativo.
 * Design minimalista inspirado em Linear/Vercel.
 */
export function Home() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Informe o email corporativo do colaborador');
      return;
    }

    setError(null);
    navigate(`/resultado?email=${encodeURIComponent(trimmedEmail)}`);
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" pt={{ xs: 4, md: 10 }}>
      <Card sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Pesquisar colaborador
              </Typography>
              <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                Informe o email corporativo para localizar os equipamentos
                atribuídos e enviar o termo para assinatura.
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
              <TextField
                placeholder="nome.sobrenome@montebravo.com.br"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={Boolean(error)}
                helperText={error}
                fullWidth
                required
                autoFocus
                size="medium"
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

              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                sx={{ mt: 0.5, backgroundColor: '#57489c', '&:hover': { backgroundColor: '#413575ff' } }}
              >
                Buscar equipamentos
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
