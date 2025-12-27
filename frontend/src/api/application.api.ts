import type { ApiResponse, Application } from "@/types";
import apiClient, { invalidateCache } from "./axios";

export interface CreateApplicationInput {
  projectId: string;
  coverLetter: string;
  resumeUrl?: string;
}

export const applicationApi = {
  // Create new application
  createApplication: async (
    data: CreateApplicationInput
  ): Promise<Application> => {
    const response = await apiClient.post<ApiResponse<Application>>(
      "/applications",
      data
    );

    // CRITICAL: Invalidate multiple cache entries after application creation
    // 1. /applications* - user's application list
    // 2. /projects/{id} - project detail (currentApplicants count changed)
    // 3. /projects - project list (currentApplicants count in cards)
    invalidateCache("/applications");
    invalidateCache("/projects");

    return response.data.data!;
  },

  // Get student's applications
  getMyApplications: async (): Promise<Application[]> => {
    const response = await apiClient.get<ApiResponse<Application[]>>(
      "/applications/my-applications"
    );
    return response.data.data!;
  },

  // Get single application by ID
  getApplicationById: async (id: string): Promise<Application> => {
    const response = await apiClient.get<ApiResponse<Application>>(
      `/applications/${id}`
    );
    return response.data.data!;
  },

  // Update application status (project owner)
  updateApplicationStatus: async (
    id: string,
    status: string,
    rejectionReason?: string
  ): Promise<Application> => {
    const response = await apiClient.patch<ApiResponse<Application>>(
      `/applications/${id}/status`,
      { status, rejectionReason }
    );

    // CRITICAL: Invalidate application cache after status update
    // - /applications* - affects lists and detail views
    // - /projects/{id}/applications - project's applicant list
    invalidateCache("/applications");

    return response.data.data!;
  },
};
