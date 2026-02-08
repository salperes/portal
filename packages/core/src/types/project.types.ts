/**
 * Project Types - Shared between backend and frontend
 */

export type ProjectStatus = 'draft' | 'active' | 'archived';
export type ProjectRole = 'viewer' | 'member' | 'lead' | 'pm';

export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  archived: 'Arşiv',
};

export const ProjectStatusColors: Record<ProjectStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  archived: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

export const ProjectRoleLabels: Record<ProjectRole, string> = {
  viewer: 'Görüntüleyici',
  member: 'Üye',
  lead: 'Lider',
  pm: 'Proje Yöneticisi',
};

export const ProjectRoleColors: Record<ProjectRole, { bg: string; text: string }> = {
  viewer: { bg: 'bg-gray-100', text: 'text-gray-700' },
  member: { bg: 'bg-blue-100', text: 'text-blue-700' },
  lead: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  pm: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string;
  owner?: {
    id: string;
    displayName: string;
  };
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  groupId: string | null;
  projectRole: ProjectRole;
  assignedAt: string;
  user?: {
    id: string;
    displayName: string;
    email: string;
    department: string;
  };
  group?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateProjectDto {
  code: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectDto {
  code?: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export interface AssignProjectMemberDto {
  userId: string;
  groupId?: string;
  projectRole?: ProjectRole;
}

export interface UpdateProjectAssignmentDto {
  projectRole: ProjectRole;
  groupId?: string;
}
