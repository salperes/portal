import api from './api';
import type { Project, ProjectAssignment, ProjectStatus, ProjectRole, CreateProjectDto, UpdateProjectDto } from '@portal/core';

export type { Project, ProjectAssignment, ProjectStatus, ProjectRole } from '@portal/core';
export { ProjectStatusLabels, ProjectStatusColors, ProjectRoleLabels, ProjectRoleColors } from '@portal/core';

export const projectsApi = {
  getAll: async (params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ projects: Project[]; total: number }> => {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Project & { assignments: ProjectAssignment[] }> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectDto): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProjectDto): Promise<Project> => {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  getMembers: async (projectId: string): Promise<ProjectAssignment[]> => {
    const response = await api.get(`/projects/${projectId}/members`);
    return response.data;
  },

  assignMember: async (projectId: string, userId: string, projectRole?: ProjectRole, groupId?: string): Promise<ProjectAssignment> => {
    const response = await api.post(`/projects/${projectId}/assignments`, { userId, projectRole, groupId });
    return response.data;
  },

  updateAssignment: async (projectId: string, userId: string, projectRole: ProjectRole, groupId?: string): Promise<ProjectAssignment> => {
    const response = await api.patch(`/projects/${projectId}/assignments/${userId}`, { projectRole, groupId });
    return response.data;
  },

  removeAssignment: async (projectId: string, userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/assignments/${userId}`);
  },
};
