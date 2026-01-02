import { userApi } from "@/api/user.api";
import { STORAGE_KEYS } from "@/constants";
import {
  useLogin,
  useRegister,
  useLogout as useLogoutMutation,
} from "@/hooks/mutations/useAuthMutations";
import type { LoginCredentials, RegisterData, User } from "@/types";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogoutMutation();

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      // CRITICAL: No token = no auth. Don't trust localStorage user alone.
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // ALWAYS fetch fresh user from API to verify token + email status
        const currentUser = await userApi.getCurrentUser();
        setUser(currentUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      } catch (error) {
        // Token invalid/expired - clear everything
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await loginMutation.handleSubmit(credentials);

    setUser(response.user);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    localStorage.setItem(
      STORAGE_KEYS.ACCESS_TOKEN,
      response.tokens.accessToken
    );
    localStorage.setItem(
      STORAGE_KEYS.REFRESH_TOKEN,
      response.tokens.refreshToken
    );
  };

  const register = async (data: RegisterData) => {
    const response = await registerMutation.handleSubmit(data);

    setUser(response.user);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    localStorage.setItem(
      STORAGE_KEYS.ACCESS_TOKEN,
      response.tokens.accessToken
    );
    localStorage.setItem(
      STORAGE_KEYS.REFRESH_TOKEN,
      response.tokens.refreshToken
    );
  };

  const logout = async () => {
    try {
      await logoutMutation.handleSubmit();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading:
      isLoading || loginMutation.isPending || registerMutation.isPending,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
