/**
 * Project composition type definitions
 * Shared between CreateProjectPage, EditProjectPage, and ProjectComposer
 */

export interface ProjectFormData {
  title: string;
  description: string;
  duration: string;
  deadline: string;
  projectType: "PROJECT" | "INTERNSHIP";
  difficultyLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  isRemote?: boolean;
  companyName?: string;
  location?: string;
  stipend?: number;
  maxApplicants?: number;
}

export interface ProjectSubmitData extends ProjectFormData {
  skills: string[];
}
