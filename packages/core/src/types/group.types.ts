/**
 * Group Types - Shared between backend and frontend
 */

export type GroupRole = 'member' | 'lead' | 'manager';

export const GroupRoleLabels: Record<GroupRole, string> = {
  member: 'Üye',
  lead: 'Lider',
  manager: 'Yönetici',
};

export const GroupRoleColors: Record<GroupRole, { bg: string; text: string }> = {
  member: { bg: 'bg-gray-100', text: 'text-gray-700' },
  lead: { bg: 'bg-blue-100', text: 'text-blue-700' },
  manager: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export interface Group {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parent?: Group | null;
  children?: Group[];
  projectId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface UserGroup {
  id: string;
  userId: string;
  groupId: string;
  role: GroupRole;
  joinedAt: string;
  user?: {
    id: string;
    displayName: string;
    email: string;
    department: string;
  };
  group?: Group;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  parentId?: string;
  projectId?: string;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  parentId?: string;
  projectId?: string;
  isActive?: boolean;
}

export interface AddGroupMemberDto {
  userId: string;
  role?: GroupRole;
}

export interface UpdateGroupMemberDto {
  role: GroupRole;
}
