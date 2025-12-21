/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { ROLE_PERMISSIONS } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isStaff: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'kebab_auth_user';

// Funzione per caricare utente da localStorage
function loadStoredUser(): User | null {
  const storedUser = localStorage.getItem(STORAGE_KEY);
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Usa lazy initializer per evitare warning ESLint
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [isLoading] = useState(false);

  // Inizializza utente superadmin di default se non esiste (solo localStorage)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const users = JSON.parse(localStorage.getItem('kebab_users') || '[]');
      if (users.length === 0) {
        const defaultSuperAdmin: User = {
          id: 1,
          username: 'admin',
          password: 'admin123', // In produzione: hash
          name: 'Andrea Fabbri',
          role: 'superadmin',
          active: true,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('kebab_users', JSON.stringify([defaultSuperAdmin]));
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Se Supabase è configurato, usa il database online
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username.toLowerCase())
          .eq('password', password) // In produzione: usare hash
          .eq('active', true)
          .single();

        if (error || !data) {
          return false;
        }

        // Aggiorna last_login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id);

        const loggedUser: User = {
          id: data.id,
          username: data.username,
          password: data.password,
          name: data.name,
          role: data.role,
          active: data.active,
          created_at: data.created_at,
          last_login: new Date().toISOString(),
        };

        setUser(loggedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
        return true;
      } catch (err) {
        console.error('Errore login Supabase:', err);
        return false;
      }
    }

    // Fallback a localStorage
    const users: User[] = JSON.parse(localStorage.getItem('kebab_users') || '[]');
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (foundUser && foundUser.active) {
      // Aggiorna last_login
      const updatedUser = { ...foundUser, last_login: new Date().toISOString() };
      const updatedUsers = users.map((u) => (u.id === foundUser.id ? updatedUser : u));
      localStorage.setItem('kebab_users', JSON.stringify(updatedUsers));

      // Salva utente loggato
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role];
    return permissions.includes(permission);
  };

  const isSuperAdmin = (): boolean => user?.role === 'superadmin';
  const isAdmin = (): boolean => user?.role === 'admin' || user?.role === 'superadmin';
  const isStaff = (): boolean => !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        isSuperAdmin,
        isAdmin,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Re-export useAuth from hooks for backward compatibility
export { useAuth } from '../hooks/useAuth';
