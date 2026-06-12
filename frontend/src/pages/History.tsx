import { useMemo } from 'react';
import { Alert, Box, Chip, Paper, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useTerms } from '../hooks/useTerms';
import { ApiError } from '../services/api';
import type { TermRecord } from '../types';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  completed: 'success',
  sent: 'info',
  delivered: 'info',
  declined: 'error',
  voided: 'error',
  created: 'warning',
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

const columns: GridColDef<TermRecord>[] = [
  { field: 'nome', headerName: 'Colaborador', flex: 1, minWidth: 180 },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
  {
    field: 'createdAt',
    headerName: 'Data de envio',
    flex: 1,
    minWidth: 170,
    valueFormatter: (value: string) => formatDate(value),
  },
  {
    field: 'status',
    headerName: 'Status DocuSign',
    flex: 1,
    minWidth: 160,
    renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        color={STATUS_COLORS[params.value as string] ?? 'default'}
        sx={{ textTransform: 'capitalize' }}
      />
    ),
  },
  {
    field: 'envelopeId',
    headerName: 'Envelope ID',
    flex: 1,
    minWidth: 220,
    valueGetter: (value: string | null) => value ?? '-',
  },
];

/**
 * Pagina de historico: tabela com todos os termos enviados, seus status no
 * DocuSign e o respectivo envelope ID.
 */
export function History() {
  const { data, isLoading, isError, error } = useTerms();

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Typography variant="h4">Histórico de Termos</Typography>

      {isError && (
        <Alert severity="error">
          {error instanceof ApiError ? error.message : 'Falha ao carregar o histórico de termos.'}
        </Alert>
      )}

      <Paper elevation={3} sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
