// SnackbarContext — global feedback notifications
// Provides showSuccess, showError and showInfo to all descendants.
// Renders the Snackbar + Alert in a single place (App level).

import { createContext, useState, type ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

type Severity = 'success' | 'error' | 'warning' | 'info';

interface SnackState {
  open: boolean;
  message: string;
  severity: Severity;
}

interface SnackbarContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

export const SnackbarContext = createContext<SnackbarContextValue>({
  showSuccess: () => undefined,
  showError: () => undefined,
  showInfo: () => undefined,
});

export const SnackbarProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [snack, setSnack] = useState<SnackState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const show = (message: string, severity: Severity): void =>
    setSnack({ open: true, message, severity });

  const handleClose = (): void => setSnack((prev) => ({ ...prev, open: false }));

  return (
    <SnackbarContext.Provider
      value={{
        showSuccess: (m) => show(m, 'success'),
        showError: (m) => show(m, 'error'),
        showInfo: (m) => show(m, 'info'),
      }}
    >
      {children}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={snack.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
