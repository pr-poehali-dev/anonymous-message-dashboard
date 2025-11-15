interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface AuthData {
  user: User;
  token: string;
}

const AUTH_KEY = 'forum_auth';

export const saveAuth = (data: AuthData) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
};

export const getAuth = (): AuthData | null => {
  const data = localStorage.getItem(AUTH_KEY);
  return data ? JSON.parse(data) : null;
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const isAuthenticated = (): boolean => {
  return getAuth() !== null;
};

export const getAuthToken = (): string | null => {
  const auth = getAuth();
  return auth?.token || null;
};

export const getCurrentUser = (): User | null => {
  const auth = getAuth();
  return auth?.user || null;
};
