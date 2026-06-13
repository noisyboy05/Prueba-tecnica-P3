// SaaS Flow — Global MUI Theme
// ADR palette: primary #1A1A1A | secondary #475569 | background #F8FAFC
// Typography: Inter (preferred) + Roboto (fallback)
// Design tokens: soft radii, minimal elevation, no text-transform on buttons

import { createTheme, alpha } from '@mui/material/styles';
// Augments MUI theme types to accept DataGrid component overrides
import '@mui/x-data-grid/themeAugmentation';

export const theme = createTheme({
  palette: {
    primary:    { main: '#1A1A1A', contrastText: '#FFFFFF' },
    secondary:  { main: '#475569', contrastText: '#FFFFFF' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text:       { primary: '#0F172A', secondary: '#475569' },
    success:    { main: '#16A34A' },
    warning:    { main: '#D97706' },
    error:      { main: '#DC2626' },
    info:       { main: '#0284C7' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.5px' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button:  { fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' },
    overline: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.06em' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, padding: '7px 20px' },
        containedPrimary: {
          '&:hover': { backgroundColor: '#2D2D2D' },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 1 },
      styleOverrides: {
        root: { borderRadius: 14, border: '1px solid #E2E8F0' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500, borderRadius: 6 } },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 0,
          '--DataGrid-overlayHeight': '300px',
        },
        columnHeaders: { backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
        columnHeaderTitle: { fontWeight: 600, fontSize: '0.8125rem' },
        cell: { borderBottom: '1px solid #F1F5F9' },
        row: {
          '&:hover': { backgroundColor: alpha('#475569', 0.04) },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: 'none', boxShadow: '1px 0 0 0 #E2E8F0' },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#E2E8F0' } },
    },
  },
});
