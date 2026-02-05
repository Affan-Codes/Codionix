import {
  useLogin,
  useRegister,
  useLogout as useLogoutMutation,
} from "@/hooks/mutations/useAuthMutations";
import { useCurrentUser } from "@/hooks/queries/useQueries";
import type { LoginCredentials, RegisterData, User } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
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
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: currentUser,
    isLoading: isQueryLoading,
    isError,
    isFetching,
  } = useCurrentUser({
    retry: false, // Don't retry on auth errors
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogoutMutation();

  // Mark as initialized after first user fetch attempt
  useEffect(() => {
    if (!isQueryLoading && !isFetching) {
      setIsInitialized(true);
    }
  }, [isQueryLoading, isFetching]);

  // Update user state when query completes
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else if (isError) {
      // Not authenticated or token expired
      setUser(null);
    }
  }, [currentUser, isError]);

  const login = async (credentials: LoginCredentials) => {
    const response = await loginMutation.handleSubmit(credentials);

    // Cookies are set by backend in response headers
    // Just update local user state
    setUser(response.user);
  };

  const register = async (data: RegisterData) => {
    const response = await registerMutation.handleSubmit(data);

    // Cookies are set by backend in response headers
    // Just update local user state
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await logoutMutation.handleSubmit();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local state and react query cache
      setUser(null);
      queryClient.clear();
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading:
      !isInitialized || loginMutation.isPending || registerMutation.isPending,
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
