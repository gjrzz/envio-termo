import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { apiClient, ApiError } from '../services/api';
import { useSnackbar } from '../components/Snackbar/SnackbarProvider';
import { useAuth } from '../contexts/AuthContext';

interface UserRow {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * Pagina de gerenciamento de usuarios — CRUD completo + alterar senha.
 */
export function Users() {
  const { showSnackbar } = useSnackbar();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog de criar/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  // Dialog de alterar senha
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/users-management');
      setUsers(res.data);
    } catch (err) {
      showSnackbar('Falha ao carregar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: UserRow) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        await apiClient.put(`/users-management/${editingUser.id}`, {
          name: formName,
          email: formEmail,
        });
        showSnackbar('Usuario atualizado', 'success');
      } else {
        await apiClient.post('/users-management', {
          name: formName,
          email: formEmail,
          password: formPassword,
        });
        showSnackbar('Usuario criado', 'success');
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Falha ao salvar usuario';
      showSnackbar(message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) {
      showSnackbar('Voce nao pode excluir seu proprio usuario', 'warning');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este usuario?')) return;
    try {
      await apiClient.delete(`/users-management/${id}`);
      showSnackbar('Usuario excluido', 'success');
      fetchUsers();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Falha ao excluir usuario';
      showSnackbar(message, 'error');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showSnackbar('As senhas nao coincidem', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showSnackbar('A nova senha deve ter pelo menos 4 caracteres', 'error');
      return;
    }
    try {
      await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showSnackbar('Senha alterada com sucesso', 'success');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Falha ao alterar senha';
      showSnackbar(message, 'error');
    }
  };

  const columns: GridColDef<UserRow>[] = [
    { field: 'name', headerName: 'Nome', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
    {
      field: 'createdAt',
      headerName: 'Criado em',
      flex: 1,
      minWidth: 160,
      valueFormatter: (value: string) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
          ? value
          : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
      },
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Usuários</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<LockResetIcon />}
            onClick={() => setPasswordDialogOpen(true)}
            sx={{
              color: '#ffffff',
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Alterar minha senha
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Novo usuário
          </Button>
        </Stack>
      </Stack>

      <Card elevation={3} sx={{ height: 500 }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25]}
        />
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nome"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              fullWidth
              required
            />
            {!editingUser && (
              <TextField
                label="Senha"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                fullWidth
                required
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingUser ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Alterar Senha */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Alterar minha senha</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleChangePassword}>
            Alterar senha
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
