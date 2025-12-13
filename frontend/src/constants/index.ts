export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  PROJECTS: "/projects",
  PROJECT_DETAIL: "/projects/:id",
  CREATE_PROJECT: "/projects/create",
  APPLICATIONS: "/applications",
  PROFILE: "/profile",
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER: "user",
} as const;

export const USER_ROLES = {
  STUDENT: "STUDENT",
  MENTOR: "MENTOR",
  EMPLOYER: "EMPLOYER",
  ADMIN: "ADMIN",
} as const;
