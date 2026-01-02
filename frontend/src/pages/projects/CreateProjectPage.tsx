import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/constants";
import { useCreateProjectMutation } from "@/hooks/mutations/useProjectMutation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

const createProjectSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must not exceed 100 characters")
    .trim(),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .trim(),
  duration: z.string().min(1, "Duration is required").trim(),
  deadline: z.string().min(1, "Deadline is required"),
  projectType: z.enum(["PROJECT", "INTERNSHIP"], {
    error: "Project type is required",
  }),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], {
    error: "Difficulty level is required",
  }),
  status: z.enum(["DRAFT", "PUBLISHED"], {
    error: "Status is required",
  }),
  isRemote: z.boolean().optional(),
  companyName: z.string().trim().optional(),
  location: z.string().trim().optional(),
  stipend: z.string().optional(),
  maxApplicants: z.string().optional(),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const createProject = useCreateProjectMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting: isValidating },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      projectType: "PROJECT",
      difficultyLevel: "INTERMEDIATE",
      status: "DRAFT",
      isRemote: true,
      maxApplicants: "10",
    },
    mode: "onBlur",
  });

  // Handle skill addition
  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) {
      toast.error("Skill cannot be empty");
      return;
    }
    if (skills.includes(trimmed)) {
      toast.error("Skill already added");
      return;
    }
    if (skills.length >= 10) {
      toast.error("Maximum 10 skills allowed");
      return;
    }
    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  // Handle skill removal
  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  // Handle form submission
  const onSubmit = async (data: CreateProjectFormData) => {
    if (skills.length === 0) {
      toast.error("Please add at least one skill");
      return;
    }

    const projectData = {
      title: data.title,
      description: data.description,
      duration: data.duration,
      deadline: new Date(data.deadline).toISOString(),
      projectType: data.projectType,
      difficultyLevel: data.difficultyLevel,
      status: data.status,
      isRemote: data.isRemote,
      skills,
      companyName: data.companyName || undefined,
      location: data.location || undefined,
      stipend:
        data.stipend && data.stipend.trim()
          ? parseFloat(data.stipend)
          : undefined,
      maxApplicants:
        data.maxApplicants && data.maxApplicants.trim()
          ? parseInt(data.maxApplicants, 10)
          : 10,
    };

    const project = await createProject.handleSubmit(projectData);
    navigate(`/projects/${project.id}`);
  };

  const isLoading = isValidating || createProject.isPending;

  return (
    <Layout maxWidth="5xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Project
          </h1>
          <p className="mt-2 text-gray-600">
            Post a project or internship opportunity for students
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about your project
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Project Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="e.g., Build a React Dashboard for Analytics"
                  disabled={isLoading}
                  aria-invalid={!!errors.title}
                />
                {errors.title && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="description"
                  {...register("description")}
                  placeholder="Describe the project goals, what students will learn, and any specific requirements..."
                  className="w-full min-h-37.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name (Optional)</Label>
                <Input
                  id="companyName"
                  {...register("companyName")}
                  placeholder="Your company or organization name"
                  disabled={isLoading}
                  aria-invalid={!!errors.companyName}
                />
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Type, difficulty, and timeline information
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Project Type */}
                <div className="space-y-2">
                  <Label htmlFor="projectType">
                    Type <span className="text-destructive">*</span>
                  </Label>

                  <Controller
                    name="projectType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROJECT">Project</SelectItem>
                          <SelectItem value="INTERNSHIP">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.projectType && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.projectType.message}
                    </p>
                  )}
                </div>

                {/* Difficulty Level */}
                <div className="space-y-2">
                  <Label htmlFor="difficultyLevel">
                    Difficulty <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="difficultyLevel"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEGINNER">Beginner</SelectItem>
                          <SelectItem value="INTERMEDIATE">
                            Intermediate
                          </SelectItem>
                          <SelectItem value="ADVANCED">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.difficultyLevel && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.difficultyLevel.message}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Duration <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="duration"
                    {...register("duration")}
                    placeholder="e.g., 3 months, 6 weeks"
                    disabled={isLoading}
                    aria-invalid={!!errors.duration}
                  />
                  {errors.duration && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.duration.message}
                    </p>
                  )}
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <Label htmlFor="deadline">
                    Application Deadline{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    {...register("deadline")}
                    disabled={isLoading}
                    aria-invalid={!!errors.deadline}
                  />
                  {errors.deadline && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.deadline.message}
                    </p>
                  )}
                </div>

                {/* Max Applicants */}
                <div className="space-y-2">
                  <Label htmlFor="maxApplicants">Max Applicants</Label>
                  <Input
                    id="maxApplicants"
                    type="number"
                    {...register("maxApplicants")}
                    placeholder="10"
                    min="1"
                    max="100"
                    disabled={isLoading}
                    aria-invalid={!!errors.maxApplicants}
                  />
                  {errors.maxApplicants && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.maxApplicants.message}
                    </p>
                  )}
                </div>

                {/* Stipend */}
                <div className="space-y-2">
                  <Label htmlFor="stipend">Monthly Stipend (Optional)</Label>
                  <Input
                    id="stipend"
                    type="number"
                    {...register("stipend")}
                    placeholder="e.g., 5000"
                    min="0"
                    step="100"
                    disabled={isLoading}
                    aria-invalid={!!errors.stipend}
                  />
                  <p className="text-xs text-muted-foreground">In USD</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>Work arrangement details</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Is Remote */}
              <div className="flex items-center space-x-2">
                <Controller
                  name="isRemote"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="isRemote"
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  )}
                />
                <Label htmlFor="isRemote" className="font-normal">
                  This is a remote position
                </Label>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="e.g., San Francisco, CA or Hybrid"
                  disabled={isLoading}
                  aria-invalid={!!errors.location}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
              <CardDescription>
                Add technical skills needed for this project (1-10 skills)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Skill Input */}
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="e.g., React, Node.js, TypeScript"
                  disabled={isLoading || skills.length >= 10}
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={isLoading || skills.length >= 10}
                  variant="outline"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {/* Skills List */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1 text-sm text-blue-800"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        disabled={isLoading}
                        className="hover:text-blue-900"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {skills.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No skills added yet. Add at least one skill.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Publication Status</CardTitle>
              <CardDescription>
                Choose whether to publish now or save as draft
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">
                        Save as Draft (only you can see)
                      </SelectItem>
                      <SelectItem value="PUBLISHED">
                        Publish Now (visible to students)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.PROJECTS)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
