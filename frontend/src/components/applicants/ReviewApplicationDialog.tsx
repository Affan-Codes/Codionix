import type { Application } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  CheckCircle2Icon,
  Loader2Icon,
  XCircleIcon,
  AlertCircleIcon,
  SparklesIcon,
  FileTextIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SendIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrendingUpIcon,
  AwardIcon,
  BrainIcon,
  MessageSquareIcon,
} from "lucide-react";
import { useUpdateApplicationStatusMutation } from "@/hooks/mutations/useApplicationMutations";

interface ReviewApplicationDialogProps {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reviewSchema = z
  .object({
    status: z.enum(["ACCEPTED", "REJECTED", "UNDER_REVIEW"], {
      error: "Select decision",
    }),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "REJECTED" && !data.rejectionReason?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: "Feedback required",
      path: ["rejectionReason"],
    }
  );

type ReviewFormData = z.infer<typeof reviewSchema>;

export function ReviewApplicationDialog({
  application,
  open,
  onOpenChange,
}: ReviewApplicationDialogProps) {
  const updateStatus = useUpdateApplicationStatusMutation();
  const [step, setStep] = useState<"review" | "decide">("review");
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "cover"
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting: isValidating },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      status: "UNDER_REVIEW",
      rejectionReason: "",
    },
  });

  const selectedStatus = watch("status");
  const rejectionText = watch("rejectionReason") || "";

  useEffect(() => {
    if (open) {
      setStep("review");
      setExpandedSection("cover");
    }
  }, [open]);

  const onSubmit = async (data: ReviewFormData) => {
    if (!application) return;

    try {
      await updateStatus.handleSubmit({
        id: application.id,
        status: data.status,
        rejectionReason: data.rejectionReason?.trim() || undefined,
      });

      reset();
      onOpenChange(false);
    } catch (error) {
      // Handled
    }
  };

  const handleClose = () => {
    reset();
    setStep("review");
    onOpenChange(false);
  };

  const isLoading = isValidating || updateStatus.isPending;

  const matchMetrics = useMemo(() => {
    if (!application?.student?.skills) return null;

    const candidateSkills = application.student.skills.map((s) =>
      s.toLowerCase()
    );
    const projectSkills = application.student.skills.slice(0, 5);
    const matched = projectSkills.filter((skill) =>
      candidateSkills.includes(skill.toLowerCase())
    ).length;
    const matchRate =
      projectSkills.length > 0 ? (matched / projectSkills.length) * 100 : 0;

    const tier =
      matchRate >= 90
        ? "Elite"
        : matchRate >= 75
        ? "Strong"
        : matchRate >= 50
        ? "Good"
        : "Fair";

    return {
      matchRate: Math.round(matchRate),
      matched,
      total: projectSkills.length,
      tier,
      color:
        matchRate >= 90
          ? "from-violet-500 to-purple-600"
          : matchRate >= 75
          ? "from-blue-500 to-cyan-600"
          : matchRate >= 50
          ? "from-green-500 to-emerald-600"
          : "from-slate-400 to-slate-500",
    };
  }, [application]);

  if (!application) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[min(600px,96vw)] h-[min(840px,96vh)] p-0 gap-0 overflow-hidden rounded-3xl border-2">
        {/* SWIPE INDICATOR - Mobile only */}
        <div className="lg:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-border rounded-full z-50" />

        {/* HEADER - Persistent across steps */}
        <div className="relative h-32 lg:h-36 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border-b border-border shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDAsIDAsIDAsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-100" />

          <div className="relative h-full flex flex-col justify-between p-5 lg:p-6 gap-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-14 lg:size-16 rounded-2xl bg-linear-to-br from-primary to-primary/70 text-primary-foreground font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-background/50">
                  {application.student?.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base lg:text-lg font-black text-foreground leading-tight">
                    {application.student?.fullName}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-50 lg:max-w-none">
                    {application.student?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Match Score Badge */}
            {matchMetrics && (
              <div className="flex items-center justify-between">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r ${matchMetrics.color} text-white shadow-lg`}
                >
                  <AwardIcon className="size-4" />
                  <span className="font-black text-sm">
                    {matchMetrics.tier} Match
                  </span>
                  <span className="font-bold text-sm opacity-90">
                    {matchMetrics.matchRate}%
                  </span>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant={step === "review" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setStep("review")}
                    className="h-8 px-3 text-xs font-bold rounded-lg"
                  >
                    Review
                  </Button>
                  <Button
                    variant={step === "decide" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setStep("decide")}
                    className="h-8 px-3 text-xs font-bold rounded-lg"
                  >
                    Decide
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT - Changes based on step */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {step === "review" ? (
            <div className="p-5 lg:p-6 space-y-4">
              {/* Skills Snapshot */}
              <CollapsibleSection
                title="Skills"
                icon={BrainIcon}
                count={application.student?.skills?.length}
                expanded={expandedSection === "skills"}
                onToggle={() => toggleSection("skills")}
              >
                <div className="flex flex-wrap gap-2">
                  {application.student?.skills?.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="text-xs h-7 px-3 font-semibold"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Cover Letter */}
              <CollapsibleSection
                title="Cover Letter"
                icon={MessageSquareIcon}
                expanded={expandedSection === "cover"}
                onToggle={() => toggleSection("cover")}
              >
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {application.coverLetter}
                  </p>
                </div>
              </CollapsibleSection>

              {/* Match Analysis */}
              {matchMetrics && (
                <CollapsibleSection
                  title="Match Analysis"
                  icon={TrendingUpIcon}
                  expanded={expandedSection === "analysis"}
                  onToggle={() => toggleSection("analysis")}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Skill Coverage
                      </span>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {matchMetrics.matched}/{matchMetrics.total}
                      </span>
                    </div>
                    <Progress value={matchMetrics.matchRate} className="h-2" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          Match Rate
                        </p>
                        <p className="text-xl font-black text-foreground">
                          {matchMetrics.matchRate}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">
                          Rating
                        </p>
                        <p className="text-xl font-black text-foreground">
                          {matchMetrics.tier}
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* Resume Link */}
              {application.resumeUrl && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full gap-2 h-12 font-semibold"
                >
                  <a
                    href={application.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileTextIcon className="size-4" />
                    Open Resume
                    <ExternalLinkIcon className="size-4 ml-auto" />
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="p-5 lg:p-6 space-y-6"
            >
              {/* Quick Decision */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <SparklesIcon className="size-4 text-primary" />
                  Make Decision
                </h3>

                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-3">
                      {[
                        {
                          value: "ACCEPTED",
                          label: "Accept",
                          sublabel: "Move forward with this candidate",
                          gradient: "from-green-500 to-emerald-600",
                          icon: CheckCircle2Icon,
                        },
                        {
                          value: "UNDER_REVIEW",
                          label: "Under Review",
                          sublabel: "Need more time to evaluate",
                          gradient: "from-blue-500 to-cyan-600",
                          icon: AlertCircleIcon,
                        },
                        {
                          value: "REJECTED",
                          label: "Reject",
                          sublabel: "Not the right fit currently",
                          gradient: "from-red-500 to-rose-600",
                          icon: XCircleIcon,
                        },
                      ].map((option) => {
                        const isActive = field.value === option.value;
                        const Icon = option.icon;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            disabled={isLoading}
                            className={`w-full group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                              isActive
                                ? "border-transparent shadow-xl scale-[1.02]"
                                : "border-border hover:border-muted-foreground/30 hover:shadow-md"
                            }`}
                          >
                            {isActive && (
                              <div
                                className={`absolute inset-0 bg-linear-to-r ${option.gradient} opacity-10`}
                              />
                            )}

                            <div className="relative p-4 flex items-center gap-4">
                              <div
                                className={`size-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                  isActive
                                    ? `bg-linear-to-br ${option.gradient}`
                                    : "bg-muted group-hover:bg-muted/70"
                                }`}
                              >
                                <Icon
                                  className={`size-6 ${
                                    isActive
                                      ? "text-white"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              </div>
                              <div className="flex-1 text-left">
                                <p
                                  className={`text-base font-bold ${
                                    isActive
                                      ? "text-foreground"
                                      : "text-foreground"
                                  }`}
                                >
                                  {option.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {option.sublabel}
                                </p>
                              </div>
                              {isActive && (
                                <CheckCircle2Icon className="size-5 text-primary shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />

                {errors.status && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircleIcon className="size-4" />
                    {errors.status.message}
                  </p>
                )}
              </div>

              {/* Rejection Feedback */}
              {selectedStatus === "REJECTED" && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                  <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                        <MessageSquareIcon className="size-4" />
                        Feedback
                      </h4>
                      <span className="text-xs text-muted-foreground font-mono">
                        {rejectionText.length}/500
                      </span>
                    </div>

                    <textarea
                      {...register("rejectionReason")}
                      placeholder="Help them grow. Be specific:

'Your JS skills are solid, but we need React expertise. Build 2-3 React projects focusing on hooks, state management, and API integration. Check out our tech blog for resources.'"
                      className="w-full min-h-40 rounded-xl border-2 border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 resize-none transition-all"
                      disabled={isLoading}
                      maxLength={500}
                    />

                    {errors.rejectionReason && (
                      <p className="text-sm text-destructive flex items-center gap-2">
                        <XCircleIcon className="size-4" />
                        {errors.rejectionReason.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* FOOTER - Action bar */}
        <div className="h-20 border-t border-border bg-background/95 backdrop-blur flex items-center px-5 lg:px-6 gap-3 shrink-0">
          {step === "review" ? (
            <>
              <div className="flex-1 text-xs text-muted-foreground font-medium">
                Review complete? Make your decision →
              </div>
              <Button
                onClick={() => setStep("decide")}
                className="gap-2 h-11 px-6 font-bold bg-linear-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-lg"
              >
                Make Decision
                <ArrowRightIcon className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("review")}
                disabled={isLoading}
                className="gap-2 h-11 px-4 font-semibold"
              >
                <ArrowLeftIcon className="size-4" />
                <span className="hidden lg:inline">Back</span>
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading}
                className={`flex-1 gap-2 h-11 font-bold shadow-lg ${
                  selectedStatus === "ACCEPTED"
                    ? "bg-linear-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800"
                    : selectedStatus === "REJECTED"
                    ? "bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800"
                    : "bg-linear-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800"
                } text-white`}
              >
                {isLoading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    <span className="hidden lg:inline">Submitting...</span>
                  </>
                ) : (
                  <>
                    <SendIcon className="size-4" />
                    Submit
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: any;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="size-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="h-5 px-2 text-xs font-bold">
              {count}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUpIcon className="size-5 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="size-5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
