import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

interface SnackbarContextValue {
  showSnackbar: (message: string, severity?: SnackbarSeverity) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

const initialState: SnackbarState = {
  open: false,
  message: '',
  severity: 'info',
};

/**
 * Provider que expoe `useSnackbar()` para exibir mensagens de feedback
 * (sucesso, erro, alerta, informacao) em qualquer parte da aplicacao.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SnackbarState>(initialState);

  const showSnackbar = useCallback((message: string, severity: SnackbarSeverity = 'info') => {
    setState({ open: true, message, severity });
  }, []);

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={state.severity} variant="filled" sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

/**
 * Hook para exibir mensagens de feedback via Snackbar global.
 */
export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);

  if (!context) {
    throw new Error('useSnackbar deve ser usado dentro de um SnackbarProvider');
  }

  return context;
}
