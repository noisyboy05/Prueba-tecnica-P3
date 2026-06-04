import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx;
};
