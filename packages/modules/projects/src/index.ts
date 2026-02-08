/**
 * @portal/projects
 *
 * Proje yönetimi modülü
 *
 * Usage:
 * - Types: import { Project, ProjectRole } from '@portal/projects'
 * - Frontend: import { ProjectsAdminPage } from '@portal/projects/frontend'
 */

// Re-export types from @portal/core
export type {
  Project,
  ProjectAssignment,
  ProjectStatus,
  ProjectRole,
  CreateProjectDto,
  UpdateProjectDto,
  AssignProjectMemberDto,
  UpdateProjectAssignmentDto,
} from '@portal/core';

export {
  ProjectStatusLabels,
  ProjectStatusColors,
  ProjectRoleLabels,
  ProjectRoleColors,
} from '@portal/core';

// Frontend exports
export * from './frontend';
