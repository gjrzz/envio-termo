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
import { AssetList, getAssetKey } from '../components/AssetList/AssetList';
import { useAssignedAssets } from '../hooks/useAssignedAssets';
import { useMondayEmployee } from '../hooks/useMondayEmployee';
import { useSendTerm } from '../hooks/useSendTerm';
import { useSnackbar } from '../components/Snackbar/SnackbarProvider';
import { ApiError } from '../services/api';
import type { GlpiAsset } from '../types';

/**
 * Formata um email do colaborador, exibindo "Não informado" quando o valor
 * estiver vazio ou ausente.
 */
function formatEmail(value: string | null): string {
  return value && value.trim() ? value : 'Não informado';
}

/**
 * Formata a data de nascimento (YYYY-MM-DD) como DD/MM/YYYY, exibindo
 * "Não informado" quando o valor estiver vazio ou ausente.
 */
function formatBirthDate(value: string | null): string {
  if (!value || !value.trim()) {
    return 'Não informado';
  }

  const [year, month, day] = value.split('-');

  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }

  return value;
}

/**
 * Pagina de resultado: exibe o colaborador encontrado e os equipamentos
 * atribuidos a ele, permitindo selecionar quais devem constar no termo.
 */
export function Result() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const email = searchParams.get('email');
  const {
    data: assetsData,
    isLoading: isAssetsLoading,
    isError: isAssetsError,
    error: assetsError,
    refetch: refetchAssets,
  } = useAssignedAssets(email);
  const {
    data: employeeData,
    isLoading: isEmployeeLoading,
    isError: isEmployeeError,
    error: employeeError,
  } = useMondayEmployee(email);
  const sendTermMutation = useSendTerm();

  const [selectedAssets, setSelectedAssets] = useState<GlpiAsset[]>([]);

  const selectedKeys = useMemo(() => selectedAssets.map((asset) => getAssetKey(asset)), [selectedAssets]);

  const handleToggle = (asset: GlpiAsset): void => {
    const key = getAssetKey(asset);

    setSelectedAssets((prev) =>
      prev.some((item) => getAssetKey(item) === key)
        ? prev.filter((item) => getAssetKey(item) !== key)
        : [...prev, asset],
    );
  };

  const handleSendTerm = (): void => {
    if (!assetsData) {
      return;
    }

    sendTermMutation.mutate(
      {
        nome: assetsData.user.fullName,
        email: assetsData.user.email,
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

      {isEmployeeLoading && (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={28} />
        </Box>
      )}

      {isEmployeeError && (
        <Alert severity={employeeError instanceof ApiError && employeeError.statusCode === 404 ? 'info' : 'error'}>
          {employeeError instanceof ApiError && employeeError.statusCode === 404
            ? 'Colaborador não encontrado no Monday.com. Verifique se o email está correto.'
            : employeeError instanceof ApiError
              ? employeeError.message
              : 'Falha ao buscar dados do colaborador no Monday.com.'}
        </Alert>
      )}

      {employeeData && (
        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              Dados do colaborador
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={0.5}>
              <Typography variant="body1">
                <strong>Nome:</strong> {employeeData.fullName}
              </Typography>
              <Typography variant="body1">
                <strong>CPF:</strong> {employeeData.cpf ?? '-'}
              </Typography>
              <Typography variant="body1">
                <strong>Email Corporativo:</strong> {formatEmail(employeeData.corporateEmail)}
              </Typography>
              <Typography variant="body1">
                <strong>Email Pessoal:</strong> {formatEmail(employeeData.personalEmail)}
              </Typography>
              <Typography variant="body1">
                <strong>Telefone:</strong> {employeeData.phone ?? '-'}
              </Typography>
              <Typography variant="body1">
                <strong>Data de nascimento:</strong> {formatBirthDate(employeeData.birthDate)}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {isAssetsLoading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {isAssetsError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetchAssets()}>
              Tentar novamente
            </Button>
          }
        >
          {assetsError instanceof ApiError ? assetsError.message : 'Falha ao buscar dados no GLPI.'}
        </Alert>
      )}

      {assetsData && (
        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Typography variant="h6">Equipamentos atribuídos</Typography>
              <Chip
                label={`${assetsData.assets.length} equipamento(s) encontrado(s)`}
                color="primary"
              />
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <AssetList
              assets={assetsData.assets}
              selectedKeys={selectedKeys}
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
