// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/superbase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session) {
          // Store session data for persistence
          await AsyncStorage.setItem('supabase_session', JSON.stringify(session));
        } else {
          // Clear stored session on logout
          await AsyncStorage.removeItem('supabase_session');
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      // First, try to get session from Supabase (handles refresh tokens automatically)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        // If Supabase session fails, try AsyncStorage as fallback
        await tryRestoreFromStorage();
      } else if (session) {
        console.log('Session restored from Supabase');
        setSession(session);
        setUser(session.user);
      } else {
        // No active session, try to restore from storage
        await tryRestoreFromStorage();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tryRestoreFromStorage = async () => {
    try {
      const storedSession = await AsyncStorage.getItem('supabase_session');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        
        // Check if stored session is still valid (not expired)
        const now = Math.round(Date.now() / 1000);
        if (sessionData.expires_at && sessionData.expires_at > now) {
          // Try to refresh the session
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
          });
          
          if (!error && session) {
            console.log('Session restored from AsyncStorage');
            setSession(session);
            setUser(session.user);
            return;
          }
        }
        
        // If session is invalid or expired, remove it
        await AsyncStorage.removeItem('supabase_session');
      }
    } catch (error) {
      console.error('Error restoring session from storage:', error);
      await AsyncStorage.removeItem('supabase_session');
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      console.log('Sign in successful');
      return { error: null };
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: 'myapp://login', // Add your deep link here
      },
    });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }

      console.log('Sign up successful');
      return { error: null };
    } catch (error) {
      console.error('Sign up exception:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Clear AsyncStorage regardless of Supabase response
      await AsyncStorage.removeItem('supabase_session');
      
      // Reset state
      setUser(null);
      setSession(null);
      
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: 'myapp://reset-password', // Deep link for mobile
        }
      );

      if (error) {
        console.error('Reset password error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Reset password exception:', error);
      return { error };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};