import { useState } from 'react';
import { api } from '../../api/axios';

interface AuthState {
  userId: string;
  role: string;
  token: string;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const token = localStorage.getItem('jwt');
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    if (token && userId && role) return { token, userId, role };
    return null;
  });

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('jwt', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('role', data.role);
    setAuth({ token: data.token, userId: data.userId, role: data.role });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    setAuth(null);
  };

  return { auth, login, logout, isLoggedIn: !!auth };
}
