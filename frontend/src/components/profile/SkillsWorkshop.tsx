import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUpdateProfileMutation } from "@/hooks/mutations/useUserMutations";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types";
import {
  PlusIcon,
  XIcon,
  Loader2Icon,
  TargetIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  Zap,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface SkillsWorkshopProps {
  user: User;
}

const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "JavaScript",
  "PostgreSQL",
  "MongoDB",
  "AWS",
  "Docker",
  "Kubernetes",
  "Git",
  "GraphQL",
  "REST APIs",
  "TailwindCSS",
  "Next.js",
  "Express",
  "FastAPI",
  "Redis",
  "Linux",
  "CI/CD",
  "Jest",
  "Figma",
  "UI/UX Design",
  "Agile",
  "System Design",
];

export function SkillsWorkshop({ user }: SkillsWorkshopProps) {
  const { updateUser } = useAuth();
  const updateProfile = useUpdateProfileMutation();

  const [localSkills, setLocalSkills] = useState<string[]>(user.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);

  const hasChanges = useMemo(() => {
    const current = [...localSkills].sort();
    const original = [...(user.skills || [])].sort();
    return JSON.stringify(current) !== JSON.stringify(original);
  }, [localSkills, user.skills]);

  const suggestions = useMemo(() => {
    return SUGGESTED_SKILLS.filter(
      (s) =>
        !localSkills.some(
          (existing) => existing.toLowerCase() === s.toLowerCase()
        )
    ).slice(0, 15);
  }, [localSkills]);

  const skillAnalysis = useMemo(() => {
    const count = localSkills.length;

    const tier =
      count >= 10
        ? {
            level: "Expert",
            score: 100,
            color: "primary",
            impact: "Maximum competitive advantage",
          }
        : count >= 7
        ? {
            level: "Advanced",
            score: 80,
            color: "primary",
            impact: "Strong competitive position",
          }
        : count >= 5
        ? {
            level: "Intermediate",
            score: 60,
            color: "achievement",
            impact: "Good matching potential",
          }
        : count >= 3
        ? {
            level: "Basic",
            score: 40,
            color: "achievement",
            impact: "Baseline credibility",
          }
        : {
            level: "Minimal",
            score: 20,
            color: "muted-foreground",
            impact: "Limited matching",
          };

    const nextTier =
      count >= 10
        ? null
        : count >= 7
        ? { target: 10, gap: 10 - count, name: "Expert" }
        : count >= 5
        ? { target: 7, gap: 7 - count, name: "Advanced" }
        : count >= 3
        ? { target: 5, gap: 5 - count, name: "Intermediate" }
        : { target: 3, gap: 3 - count, name: "Basic" };

    return { tier, nextTier, count };
  }, [localSkills]);

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) {
      toast.error("Skill cannot be empty");
      return;
    }
    if (localSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Skill already added");
      return;
    }
    if (localSkills.length >= 20) {
      toast.error("Maximum 20 skills allowed");
      return;
    }

    setLocalSkills([...localSkills, trimmed]);
    setRecentlyAdded([trimmed, ...recentlyAdded].slice(0, 3));
    setSkillInput("");
  };

  const handleRemoveSkill = (skill: string) => {
    setLocalSkills(localSkills.filter((s) => s !== skill));
    setRecentlyAdded(recentlyAdded.filter((s) => s !== skill));
  };

  const handleSave = async () => {
    try {
      const updatedUser = await updateProfile.handleSubmit({
        skills: localSkills,
      });

      updateUser(updatedUser);
      setRecentlyAdded([]);
      toast.success("Skills updated successfully");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancel = () => {
    setLocalSkills(user.skills || []);
    setSkillInput("");
    setRecentlyAdded([]);
  };

  // Auto-save reminder after 30 seconds of inactivity
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      toast("Don't forget to save your changes", {
        action: {
          label: "Save Now",
          onClick: handleSave,
        },
      });
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasChanges, localSkills]);

  const isLoading = updateProfile.isPending;

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="space-y-8">
        {/* Intelligent Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">
                Skills Workshop
              </h1>
              {hasChanges && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-achievement/10 border border-achievement/20">
                  <div className="size-1.5 rounded-full bg-achievement animate-pulse" />
                  <span className="text-xs font-medium text-achievement">
                    {localSkills.length - (user.skills?.length || 0) > 0
                      ? "+"
                      : ""}
                    {localSkills.length - (user.skills?.length || 0)} unsaved
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {localSkills.length} / 20 skills • {skillAnalysis.tier.level} tier
            </p>
          </div>
        </div>

        {/* Real-time Skill Intelligence */}
        <div className="p-6 rounded-xl border-2 border-border bg-card space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Skill Tier
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`text-3xl font-bold text-${skillAnalysis.tier.color}`}
                >
                  {skillAnalysis.tier.level}
                </div>
                {skillAnalysis.tier.level === "Expert" && (
                  <Zap className="size-6 text-primary fill-current" />
                )}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-5xl font-bold tabular-nums text-${skillAnalysis.tier.color}`}
              >
                {skillAnalysis.tier.score}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Score</div>
            </div>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 bg-${skillAnalysis.tier.color}`}
              style={{ width: `${skillAnalysis.tier.score}%` }}
            />
          </div>

          <p className="text-sm text-foreground">{skillAnalysis.tier.impact}</p>

          {skillAnalysis.nextTier && (
            <div className="pt-4 border-t border-border flex items-start gap-2">
              <TargetIcon className="size-4 text-achievement mt-0.5 shrink-0" />
              <div className="text-sm text-foreground">
                Add{" "}
                <span className="font-bold text-achievement">
                  {skillAnalysis.nextTier.gap}
                </span>{" "}
                more {skillAnalysis.nextTier.gap === 1 ? "skill" : "skills"} to
                reach{" "}
                <span className="font-bold">{skillAnalysis.nextTier.name}</span>{" "}
                tier
              </div>
            </div>
          )}

          {skillAnalysis.tier.level === "Expert" && (
            <div className="pt-4 border-t border-border flex items-start gap-2">
              <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-primary font-medium">
                Expert-level profile — you're in the top tier for matching
                algorithms
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Interface */}
        <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="size-2 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Add Skills
            </h2>
          </div>

          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill(skillInput);
                }
              }}
              placeholder="Type skill name and press Enter..."
              disabled={isLoading || localSkills.length >= 20}
              className="h-11"
            />
            <Button
              onClick={() => handleAddSkill(skillInput)}
              disabled={
                isLoading || localSkills.length >= 20 || !skillInput.trim()
              }
              variant="default"
              className="shrink-0 gap-2"
            >
              <PlusIcon className="size-4" />
              Add
            </Button>
          </div>

          {recentlyAdded.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Just added:</span>
              {recentlyAdded.map((skill) => (
                <Badge key={skill} className="gap-1.5">
                  <Sparkles className="size-3" />
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Current Skills Grid */}
        <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Your Skills ({localSkills.length})
              </h2>
            </div>
            {localSkills.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Drag to reorder (coming soon)
              </span>
            )}
          </div>

          {localSkills.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {localSkills.map((skill) => (
                <div
                  key={skill}
                  className="group relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-border bg-background hover:border-primary/20 hover:bg-primary/5 transition-all"
                >
                  <span className="text-sm font-medium text-foreground truncate flex-1">
                    {skill}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    disabled={isLoading}
                    className="opacity-0 group-hover:opacity-100 hover:scale-110 transition-all disabled:opacity-50"
                  >
                    <XIcon className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-muted">
                <TargetIcon className="size-8 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground mb-1">
                  No skills added yet
                </div>
                <div className="text-xs text-muted-foreground">
                  Start building your technical profile above
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Smart Suggestions */}
        {suggestions.length > 0 && localSkills.length < 20 && (
          <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="size-2 rounded-full bg-achievement" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Popular Skills
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">Quick add</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {suggestions.map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleAddSkill(skill)}
                  disabled={isLoading || localSkills.length >= 20}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-achievement/10 hover:text-achievement hover:border-achievement/20 border border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="size-3" />
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save Actions */}
        {hasChanges && (
          <div className="flex items-center justify-between pt-6 border-t-2 border-border sticky bottom-0 bg-background pb-4 -mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-achievement" />
              <span className="text-sm text-foreground font-medium">
                {localSkills.length - (user.skills?.length || 0) > 0 ? "+" : ""}
                {localSkills.length - (user.skills?.length || 0)}{" "}
                {Math.abs(localSkills.length - (user.skills?.length || 0)) === 1
                  ? "change"
                  : "changes"}{" "}
                pending
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="gap-2 min-w-32"
              >
                {isLoading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2Icon className="size-4" />
                    Save {localSkills.length} Skills
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
