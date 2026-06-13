// App — root component
// Wires ThemeProvider → CssBaseline → AuthProvider → SnackbarProvider → AppRouter

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { AppRouter } from './router/AppRouter';
import { theme } from './theme/theme';

const App = (): JSX.Element => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <SnackbarProvider>
        <AppRouter />
      </SnackbarProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
