export type AppRole = 'ADMIN' | 'USER' | 'GUEST';

export function useRole(): AppRole {
  const token = localStorage.getItem('jwt');
  if (!token) return 'GUEST';
  const role = localStorage.getItem('role');
  return role === 'ADMIN' ? 'ADMIN' : 'USER';
}
