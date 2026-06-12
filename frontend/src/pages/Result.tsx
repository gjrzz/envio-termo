import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { AssetList } from '../components/AssetList/AssetList';
import { useAssignedAssets } from '../hooks/useAssignedAssets';
import { useSendTerm } from '../hooks/useSendTerm';
import { useSnackbar } from '../components/Snackbar/SnackbarProvider';
import { ApiError } from '../services/api';
import type { GlpiAsset } from '../types';

/**
 * Pagina de resultado: exibe o colaborador encontrado e os equipamentos
 * atribuidos a ele, permitindo selecionar quais devem constar no termo.
 */
export function Result() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const email = searchParams.get('email');
  const { data, isLoading, isError, error, refetch } = useAssignedAssets(email);
  const sendTermMutation = useSendTerm();

  const [selectedAssets, setSelectedAssets] = useState<GlpiAsset[]>([]);

  const selectedIds = useMemo(() => selectedAssets.map((asset) => asset.id), [selectedAssets]);

  const handleToggle = (asset: GlpiAsset): void => {
    setSelectedAssets((prev) =>
      prev.some((item) => item.id === asset.id)
        ? prev.filter((item) => item.id !== asset.id)
        : [...prev, asset],
    );
  };

  const handleSendTerm = (): void => {
    if (!data) {
      return;
    }

    sendTermMutation.mutate(
      {
        nome: data.user.fullName,
        email: data.user.email,
        equipamentos: selectedAssets.map((asset) => ({
          id: asset.id,
          itemtype: asset.itemtype,
          name: asset.name,
          serial: asset.serial,
          inventoryNumber: asset.inventoryNumber,
        })),
      },
      {
        onSuccess: (term) => {
          showSnackbar(
            `Termo enviado com sucesso! Envelope DocuSign: ${term.envelopeId ?? '-'}`,
            'success',
          );
          navigate('/historico');
        },
        onError: (mutationError) => {
          const message =
            mutationError instanceof ApiError
              ? mutationError.message
              : 'Falha ao enviar o termo. Tente novamente.';
          showSnackbar(message, 'error');
        },
      },
    );
  };

  if (!email) {
    return (
      <Alert severity="warning">
        Nenhum email informado. Volte para a página inicial e pesquise um colaborador.
      </Alert>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Nova busca
      </Button>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          }
        >
          {error instanceof ApiError ? error.message : 'Falha ao buscar dados no GLPI.'}
        </Alert>
      )}

      {data && (
        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Typography variant="h5">{data.user.fullName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.user.email}
                </Typography>
              </Box>
              <Chip label={`${data.assets.length} equipamento(s) encontrado(s)`} color="primary" />
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="h6" gutterBottom>
              Equipamentos encontrados
            </Typography>

            <AssetList
              assets={data.assets}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />

            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                size="large"
                startIcon={<SendIcon />}
                disabled={selectedAssets.length === 0 || sendTermMutation.isPending}
                onClick={handleSendTerm}
              >
                {sendTermMutation.isPending ? 'Enviando...' : 'Enviar Termo'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
