import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';

/**
 * Pagina inicial: campo de busca de colaborador pelo email corporativo.
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
    <Box display="flex" justifyContent="center" mt={{ xs: 2, md: 8 }}>
      <Card sx={{ width: '100%', maxWidth: 520 }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Termo de Responsabilidade
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Pesquise um colaborador pelo email corporativo para visualizar os
            equipamentos atribuídos a ele no GLPI e enviar o termo de
            responsabilidade para assinatura via DocuSign.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Pesquisar colaborador"
              placeholder="nome@empresa.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={Boolean(error)}
              helperText={error ?? 'Informe o email corporativo do colaborador'}
              fullWidth
              required
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button type="submit" variant="contained" size="large" startIcon={<SearchIcon />}>
              Buscar Equipamentos
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
