import type { LoginCredentials, RegisterData } from "@/types";
import { useMutationFactory } from "../useMutationFactory";
import { authApi } from "@/api/auth.api";
import { STORAGE_KEYS } from "@/constants";

/**
 * Login mutation
 */
export function useLogin() {
  return useMutationFactory({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    successMessage: "Welcome back!",
    getErrorMessage: (error: any) => {
      if (error?.response?.status === 401) {
        return "Invalid email or password";
      }
      return error?.response?.data?.error?.message || "Login failed";
    },
  });
}

/**
 * Register mutation
 */
export function useRegister() {
  return useMutationFactory({
    mutationFn: (data: RegisterData) => authApi.register(data),

    successMessage: "Account created successfully!",

    getErrorMessage: (error: any) => {
      if (error?.response?.status === 409) {
        return "An account with this email already exists";
      }
      return error?.response?.data?.error?.message || "Registration failed";
    },
  });
}

/**
 * Logout mutation
 */
export function useLogout() {
  return useMutationFactory({
    mutationFn: () => {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error("No refresh token found");
      }
      return authApi.logout(refreshToken);
    },

    successMessage: "Logged out successfully",

    // Clear all auth data on success
    // This is handled in AuthContext
  });
}

/**
 * Verify email mutation
 */
export function useVerifyEmail() {
  return useMutationFactory({
    mutationFn: (token: string) => authApi.verifyEmail(token),

    successMessage: (data) => data.message || "Email verified successfully!",

    getErrorMessage: (error: any) => {
      if (error?.response?.status === 401) {
        return "Invalid or expired verification token";
      }
      return error?.response?.data?.error?.message || "Verification failed";
    },
  });
}

/**
 * Resend verification email mutation
 */
export function useResendVerification() {
  return useMutationFactory({
    mutationFn: () => authApi.resendVerificationEmail(),

    successMessage: "Verification email sent!",

    debounceMs: 3000, // Longer debounce for email sending

    getErrorMessage: (error: any) => {
      return (
        error?.response?.data?.error?.message ||
        "Failed to resend verification email"
      );
    },
  });
}

/**
 * Forgot password mutation
 */
export function useForgotPassword() {
  return useMutationFactory({
    mutationFn: (email: string) => authApi.forgotPassword(email),

    successMessage: "Password reset email sent!",

    debounceMs: 3000, // Longer debounce for email sending

    getErrorMessage: (error: any) => {
      return (
        error?.response?.data?.error?.message || "Failed to send reset email"
      );
    },
  });
}

/**
 * Reset password mutation
 */
export function useResetPassword() {
  return useMutationFactory({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),

    successMessage: "Password reset successfully!",

    getErrorMessage: (error: any) => {
      if (error?.response?.status === 401) {
        return "Invalid or expired reset token";
      }
      return error?.response?.data?.error?.message || "Password reset failed";
    },
  });
}
