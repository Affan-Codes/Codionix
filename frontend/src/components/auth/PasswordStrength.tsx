import { CheckCircle2Icon } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_]/.test(password),
  };

  const passedCount = Object.values(checks).filter(Boolean).length;
  const strength =
    passedCount === 5 ? "strong" : passedCount >= 3 ? "medium" : "weak";

  return (
    <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">
            Password Strength
          </span>
          <span
            className={`font-semibold ${
              strength === "strong"
                ? "text-green-600 dark:text-green-500"
                : strength === "medium"
                  ? "text-yellow-600 dark:text-yellow-500"
                  : "text-destructive"
            }`}
          >
            {strength === "strong"
              ? "Strong"
              : strength === "medium"
                ? "Medium"
                : "Weak"}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              strength === "strong"
                ? "w-full bg-green-500"
                : strength === "medium"
                  ? "w-2/3 bg-yellow-500"
                  : "w-1/3 bg-destructive"
            }`}
          />
        </div>
      </div>

      {/* Requirements */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Check passed={checks.length} label="8+ characters" />
        <Check passed={checks.uppercase} label="Uppercase" />
        <Check passed={checks.lowercase} label="Lowercase" />
        <Check passed={checks.number} label="Number" />
        <Check passed={checks.special} label="Special char" />
      </div>
    </div>
  );
}

function Check({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 transition-colors duration-200 ${
        passed ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
      }`}
    >
      <CheckCircle2Icon className="size-3 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
