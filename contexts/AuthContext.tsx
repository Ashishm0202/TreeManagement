import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, loginUser } from "@/services/api";

const AUTH_STORAGE_KEY = "tree-management:auth";

export interface LoginOutcome {
  success: boolean;
  message: string;
  isOffline: boolean;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<LoginOutcome>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then((stored) => {
        if (stored) setUsername(stored);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (
    inputUsername: string,
    inputPassword: string
  ): Promise<LoginOutcome> => {
    const trimmedUsername = inputUsername.trim();
    try {
      const result = await loginUser(trimmedUsername, inputPassword);
      if (result.success) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, trimmedUsername);
        setUsername(trimmedUsername);
      }
      return { success: result.success, message: result.message, isOffline: false };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message, isOffline: error.isOffline };
      }
      return {
        success: false,
        message: "Something went wrong while signing in. Please try again.",
        isOffline: false,
      };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUsername(null);
  };

  const value = useMemo(
    () => ({
      isAuthenticated: username !== null,
      isLoading,
      username,
      login,
      logout,
    }),
    [username, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
