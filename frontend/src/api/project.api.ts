import type {
  ApiResponse,
  Application,
  PaginatedResponse,
  Project,
} from "@/types";
import apiClient from "./axios";

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  projectType?: "PROJECT" | "INTERNSHIP";
  difficultyLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status?: "DRAFT" | "PUBLISHED" | "CLOSED";
  skills?: string; // Comma-separated
  search?: string;
}

export const projectApi = {
  // List all projects with filters
  listProjects: async (
    params: ListProjectsParams = {}
  ): Promise<PaginatedResponse<Project>> => {
    const response = await apiClient.get<
      ApiResponse<PaginatedResponse<Project>>
    >("/projects", { params });
    return response.data.data!;
  },

  // Get single project by ID
  getProjectById: async (id: string): Promise<Project> => {
    const response = await apiClient.get<ApiResponse<Project>>(
      `/projects/${id}`
    );
    return response.data.data!;
  },

  // Get current user's projects
  getMyProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get<ApiResponse<Project[]>>(
      "/projects/my-projects"
    );
    return response.data.data!;
  },

  // Create new project (mentor/employer only)
  createProject: async (data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.post<ApiResponse<Project>>(
      "/projects",
      data
    );

    return response.data.data!;
  },

  // Update project (owner only)
  updateProject: async (
    id: string,
    data: Partial<Project>
  ): Promise<Project> => {
    const response = await apiClient.patch<ApiResponse<Project>>(
      `/projects/${id}`,
      data
    );

    return response.data.data!;
  },

  // Delete project (owner only)
  deleteProject: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  // Get project applications (owner only)
  getProjectApplications: async (id: string): Promise<Application[]> => {
    const response = await apiClient.get<ApiResponse<Application[]>>(
      `/projects/${id}/applications`
    );
    return response.data.data!;
  },
};
