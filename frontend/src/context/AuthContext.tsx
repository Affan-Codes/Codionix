import { clearAccessToken, getAccessToken, setAccessToken } from "@/api/axios";
import {
  useLogin,
  useRegister,
  useLogout as useLogoutMutation,
} from "@/hooks/mutations/useAuthMutations";
import { useCurrentUser } from "@/hooks/queries/useQueries";
import type { LoginCredentials, RegisterData, User } from "@/types";
import {
  clearAllAuthData,
  getAccessTokenExpiry,
  getRefreshToken,
  hasActiveSession,
  setCachedUser,
  setRefreshToken,
} from "@/utils/tokenManager";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState } from "react";
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

  // Proactive refresh timer ref
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if user has valid session (refresh token exists)
  const hasSession = hasActiveSession();

  const {
    data: currentUser,
    isLoading: isQueryLoading,
    isError,
    error,
    isFetching,
  } = useCurrentUser({
    enabled: hasSession, // Only fetch if session exists
    retry: false, // Don't retry on auth errors
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogoutMutation();

  // This prevents premature redirects during deep navigation
  useEffect(() => {
    // Don't mark as initialized until we've attempted to load the user
    if (!hasSession) {
      // No token = definitely not authenticated
      setIsInitialized(true);
      return;
    }

    if (!isQueryLoading && !isFetching) {
      // User fetch completed (either got user or got error)
      setIsInitialized(true);
    }
  }, [hasSession, isQueryLoading, isFetching]);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      setCachedUser(JSON.stringify(currentUser));
    } else if (isError) {
      // Token invalid/expired - clear everything
      setUser(null);
      clearAllAuthData();
      clearAccessToken();
    }
  }, [currentUser, isError, error]);

  // Refresh access token 1 minute before expiry
  useEffect(() => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      // No access token - clear any existing timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    // Calculate when to refresh (14 minutes = 1 min before expiry)
    const expiryTime = getAccessTokenExpiry(accessToken);
    const refreshTime = expiryTime - 60 * 1000; // 1 minute before expiry
    const now = Date.now();
    const delay = Math.max(0, refreshTime - now);

    // Clear old timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Set new timer
    refreshTimerRef.current = setTimeout(async () => {
      const currentRefreshToken = getRefreshToken();
      if (!currentRefreshToken) return;

      try {
        console.info("Proactive token refresh (1 min before expiry)");

        const { authApi } = await import("@/api/auth.api");
        const tokens = await authApi.refreshToken(currentRefreshToken);

        // Update tokens
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);

        console.info("Proactive refresh successful");
      } catch (error: any) {
        console.warn(
          "Proactive refresh failed:",
          error.message || "Unknown error",
        );
      }
    }, delay);

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [getAccessToken()]);

  const login = async (credentials: LoginCredentials) => {
    const response = await loginMutation.handleSubmit(credentials);

    // Store tokens
    setAccessToken(response.tokens.accessToken); // Memory only
    setRefreshToken(response.tokens.refreshToken); // sessionStorage

    // Update user state
    setUser(response.user);
    setCachedUser(JSON.stringify(response.user));
  };

  const register = async (data: RegisterData) => {
    const response = await registerMutation.handleSubmit(data);

    // Store tokens
    setAccessToken(response.tokens.accessToken);
    setRefreshToken(response.tokens.refreshToken);

    // Update user state
    setUser(response.user);
    setCachedUser(JSON.stringify(response.user));
  };

  const logout = async () => {
    try {
      await logoutMutation.handleSubmit();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAllAuthData(); // sessionStorage
      clearAccessToken(); // Memory
      setUser(null);

      // Clear proactive refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      queryClient.clear();
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    setCachedUser(JSON.stringify(updatedUser));
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
