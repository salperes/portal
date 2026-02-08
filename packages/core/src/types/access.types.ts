/**
 * Access Control Types - Shared between backend and frontend
 */

export type ResourceType = 'folder' | 'document' | 'project';
export type RuleType = 'grant' | 'deny';
export type TargetType = 'user' | 'group' | 'role' | 'project_role';
export type PermissionType = 'read' | 'write' | 'delete' | 'manage';

export const ResourceTypeLabels: Record<ResourceType, string> = {
  folder: 'Klasör',
  document: 'Doküman',
  project: 'Proje',
};

export const RuleTypeLabels: Record<RuleType, string> = {
  grant: 'İzin Ver',
  deny: 'Reddet',
};

export const TargetTypeLabels: Record<TargetType, string> = {
  user: 'Kullanıcı',
  group: 'Grup',
  role: 'Sistem Rolü',
  project_role: 'Proje Rolü',
};

export const PermissionLabels: Record<PermissionType, string> = {
  read: 'Okuma',
  write: 'Yazma',
  delete: 'Silme',
  manage: 'Yönetme',
};

export interface AccessRule {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  ruleType: RuleType;
  targetType: TargetType;
  targetId: string | null;
  targetRole: string | null;
  projectId: string | null;
  permissions: string[];
  inherit: boolean;
  createdById: string;
  createdBy?: {
    id: string;
    displayName: string;
  };
  createdAt: string;
}

export interface CreateAccessRuleDto {
  resourceType: ResourceType;
  resourceId: string;
  ruleType: RuleType;
  targetType: TargetType;
  targetId?: string;
  targetRole?: string;
  projectId?: string;
  permissions: string[];
  inherit?: boolean;
}

export interface CheckPermissionDto {
  resourceType: ResourceType;
  resourceId: string;
  permission: PermissionType;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
}
