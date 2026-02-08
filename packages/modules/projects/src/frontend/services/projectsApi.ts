/**
 * Projects API Service
 *
 * @portal/projects frontend API client
 */

import type {
  Project,
  ProjectAssignment,
  CreateProjectDto,
  UpdateProjectDto,
  AssignProjectMemberDto,
  UpdateProjectAssignmentDto,
} from '@portal/core';

// API instance will be injected from the main app
let apiInstance: any = null;

export const setApiInstance = (api: any) => {
  apiInstance = api;
};

const getApi = () => {
  if (!apiInstance) {
    throw new Error('API instance not set. Call setApiInstance first.');
  }
  return apiInstance;
};

export const projectsApi = {
  // Project CRUD
  getAll: async (params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ projects: Project[]; total: number }> => {
    const response = await getApi().get('/projects', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Project & { assignments: ProjectAssignment[] }> => {
    const response = await getApi().get(`/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectDto): Promise<Project> => {
    const response = await getApi().post('/projects', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProjectDto): Promise<Project> => {
    const response = await getApi().patch(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await getApi().delete(`/projects/${id}`);
  },

  // Assignment management
  getMembers: async (projectId: string): Promise<ProjectAssignment[]> => {
    const response = await getApi().get(`/projects/${projectId}/members`);
    return response.data;
  },

  assignMember: async (projectId: string, data: AssignProjectMemberDto): Promise<ProjectAssignment> => {
    const response = await getApi().post(`/projects/${projectId}/assignments`, data);
    return response.data;
  },

  updateAssignment: async (projectId: string, userId: string, data: UpdateProjectAssignmentDto): Promise<ProjectAssignment> => {
    const response = await getApi().patch(`/projects/${projectId}/assignments/${userId}`, data);
    return response.data;
  },

  removeAssignment: async (projectId: string, userId: string): Promise<void> => {
    await getApi().delete(`/projects/${projectId}/assignments/${userId}`);
  },
};
