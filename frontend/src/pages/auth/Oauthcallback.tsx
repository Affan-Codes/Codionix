import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    // Cookies are already set by backend redirect
    // Just fetch user data and redirect
    const handleCallback = async () => {
      try {
        // Give cookies a moment to be set by browser
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Fetch current user (will use cookies automatically)
        const { userApi } = await import("@/api/user.api");
        const user = await userApi.getCurrentUser();

        // Update auth context
        updateUser(user);

        navigate(ROUTES.DASHBOARD, { replace: true });
      } catch (error: any) {
        console.error("[OAuth] Failed to fetch user after callback", error);

        // If user fetch fails, redirect to login
        navigate(ROUTES.LOGIN, { replace: true });
      }
    };

    handleCallback();
  }, [navigate, updateUser]);

  return (
    <AuthLayout variant="centered">
      <div className="space-y-8 text-center">
        {/* Loading Icon */}
        <div className="flex justify-center">
          <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2Icon className="size-10 text-primary animate-spin" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Completing Sign In...
          </h1>
          <p className="text-sm text-muted-foreground">
            Just a moment while we set up your session
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
