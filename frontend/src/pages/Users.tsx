import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { apiClient, ApiError } from '../services/api';
import { useSnackbar } from '../components/Snackbar/SnackbarProvider';
import { useAuth } from '../contexts/AuthContext';

interface UserRow {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

/**
 * Pagina de gerenciamento de usuarios — CRUD + avatar + alterar senha.
 */
export function Users() {
  const { showSnackbar } = useSnackbar();
  const { user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/users-management');
      setUsers(res.data);
    } catch {
      showSnackbar('Falha ao carregar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
        await apiClient.put(`/users-management/${editingUser.id}`, { name: formName, email: formEmail });
        showSnackbar('Usuario atualizado', 'success');
      } else {
        await apiClient.post('/users-management', { name: formName, email: formEmail, password: formPassword });
        showSnackbar('Usuario criado', 'success');
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      showSnackbar(err instanceof ApiError ? err.message : 'Falha ao salvar', 'error');
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
      showSnackbar(err instanceof ApiError ? err.message : 'Falha ao excluir', 'error');
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
      await apiClient.put('/auth/change-password', { currentPassword, newPassword });
      showSnackbar('Senha alterada com sucesso', 'success');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showSnackbar(err instanceof ApiError ? err.message : 'Falha ao alterar senha', 'error');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2_000_000) {
      showSnackbar('Imagem muito grande. Maximo 2MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await apiClient.put('/auth/avatar', { avatar: base64 });
        showSnackbar('Foto atualizada', 'success');
        refreshUser();
        fetchUsers();
      } catch {
        showSnackbar('Falha ao atualizar foto', 'error');
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  };

  const columns: GridColDef<UserRow>[] = [
    {
      field: 'avatar',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <Avatar src={params.value || undefined} sx={{ width: 32, height: 32, fontSize: '0.75rem', backgroundColor: '#57489c' }}>
            {getInitials(params.row.name)}
          </Avatar>
        </Box>
      ),
    },
    { field: 'name', headerName: 'Nome', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 200 },
    {
      field: 'createdAt',
      headerName: 'Criado em',
      width: 160,
      valueFormatter: (value: string) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
      },
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 100,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center" height="100%">
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
    <Box display="flex" flexDirection="column" gap={3}>
      {/* Perfil atual */}
      <Card elevation={3} sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={3}>
          <Box position="relative">
            <Avatar
              src={currentUser?.avatar || undefined}
              sx={{ width: 72, height: 72, fontSize: '1.5rem', fontWeight: 700, backgroundColor: '#635D80' }}
            >
              {currentUser ? getInitials(currentUser.name) : '?'}
            </Avatar>
            <IconButton
              size="small"
              onClick={handleAvatarClick}
              sx={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                backgroundColor: '#57489c',
                color: '#fff',
                width: 28,
                height: 28,
                '&:hover': { backgroundColor: '#413575' },
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
          </Box>
          <Stack spacing={0.5} flex={1}>
            <Typography variant="h6">{currentUser?.name}</Typography>
            <Typography variant="body2" color="text.secondary">{currentUser?.email}</Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<LockResetIcon />}
            onClick={() => setPasswordDialogOpen(true)}
            sx={{ borderColor: 'rgba(32,26,71,0.2)', color: '#201A47' }}
          >
            Alterar senha
          </Button>
        </Stack>
      </Card>

      {/* Tabela de usuarios */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" sx={{ color: '#fff' }}>Gerenciar Usuários</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Novo usuário
        </Button>
      </Stack>

      <Card elevation={3} sx={{ height: 420 }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25]}
        />
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Nome" value={formName} onChange={(e) => setFormName(e.target.value)} fullWidth required />
            <TextField label="Email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} fullWidth required />
            {!editingUser && (
              <TextField label="Senha" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} fullWidth required />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>{editingUser ? 'Salvar' : 'Criar'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Alterar Senha */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Alterar minha senha</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Senha atual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth required />
            <TextField label="Nova senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth required />
            <TextField label="Confirmar nova senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth required />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleChangePassword}>Alterar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
