import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AssetList, getAssetKey } from '../components/AssetList/AssetList';
import { useAssignedAssets } from '../hooks/useAssignedAssets';
import { useMondayEmployee } from '../hooks/useMondayEmployee';
import { useGenerateTerm } from '../hooks/useGenerateTerm';
import { useSnackbar } from '../components/Snackbar/SnackbarProvider';
import { ApiError } from '../services/api';
import type { GenerateTermResult, GlpiAsset } from '../types';

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
  const generateTermMutation = useGenerateTerm();

  const [selectedAssets, setSelectedAssets] = useState<GlpiAsset[]>([]);
  const [generatedResult, setGeneratedResult] = useState<GenerateTermResult | null>(null);
  const [recipientType, setRecipientType] = useState<'personal' | 'corporate'>('personal');
  const [sendCopyToOther, setSendCopyToOther] = useState(true);

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
    if (!employeeData) {
      showSnackbar('Dados do colaborador não disponíveis.', 'error');
      return;
    }

    generateTermMutation.mutate(
      {
        employee: {
          fullName: employeeData.fullName,
          cpf: employeeData.cpf ?? '',
          birthDate: employeeData.birthDate ?? '',
          corporateEmail: employeeData.corporateEmail ?? '',
          personalEmail: employeeData.personalEmail ?? '',
          phone: employeeData.phone ?? '',
        },
        selectedAssets: selectedAssets.map((asset) => ({
          id: asset.id,
          type: asset.itemtype,
          name: asset.name,
          inventoryNumber: asset.inventoryNumber,
          serial: asset.serial,
          model: asset.model,
          contact: asset.contact,
        })),
        recipientType,
        sendCopyToOther,
      },
      {
        onSuccess: (result) => {
          setGeneratedResult(result);
          showSnackbar(`Termo enviado para assinatura! Envelope: ${result.envelopeId}`, 'success');
        },
        onError: (mutationError) => {
          const message =
            mutationError instanceof ApiError
              ? mutationError.message
              : 'Falha ao gerar o termo. Tente novamente.';
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
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{
          alignSelf: 'flex-start',
          color: '#ffffff',
          borderColor: 'rgba(255,255,255,0.3)',
          '&:hover': {
            borderColor: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.08)',
          },
        }}
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
            ? 'Colaborador não encontrado. Verifique se o email está correto.'
            : employeeError instanceof ApiError
              ? employeeError.message
              : 'Falha ao buscar dados do colaborador.'}
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

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              Destino do Termo
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as 'personal' | 'corporate')}
              >
                <FormControlLabel
                  value="personal"
                  control={<Radio />}
                  label={`Email Pessoal: ${employeeData?.personalEmail || 'Não informado'}`}
                  disabled={!employeeData?.personalEmail}
                />
                <FormControlLabel
                  value="corporate"
                  control={<Radio />}
                  label={`Email Corporativo: ${employeeData?.corporateEmail || 'Não informado'}`}
                  disabled={!employeeData?.corporateEmail}
                />
              </RadioGroup>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={sendCopyToOther}
                  onChange={(e) => setSendCopyToOther(e.target.checked)}
                />
              }
              label={`Enviar cópia para o outro email (${recipientType === 'personal' ? employeeData?.corporateEmail || '-' : employeeData?.personalEmail || '-'})`}
              disabled={
                recipientType === 'personal'
                  ? !employeeData?.corporateEmail
                  : !employeeData?.personalEmail
              }
              sx={{ mt: 1 }}
            />

            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                size="large"
                startIcon={<SendIcon />}
                disabled={selectedAssets.length === 0 || generateTermMutation.isPending || !employeeData}
                onClick={handleSendTerm}
                sx={{ backgroundColor: '#201A47', '&:hover': { backgroundColor: '#151030' } }}
              >
                {generateTermMutation.isPending ? 'Enviando...' : 'Enviar Termo'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {generatedResult && (
        <Card elevation={3} sx={{ borderLeft: 4, borderColor: 'success.main' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6" color="success.main">
                Termo enviado com sucesso
              </Typography>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1}>
              <Typography variant="body1">
                <strong>Envelope ID:</strong> {generatedResult.envelopeId}
              </Typography>
              <Typography variant="body1">
                <strong>Status:</strong> {generatedResult.status}
              </Typography>
              <Typography variant="body1">
                <strong>Enviado para:</strong> {generatedResult.recipientName} ({generatedResult.recipientEmail})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Equipamentos incluídos: {generatedResult.assetsCount}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
