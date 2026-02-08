/**
 * @portal/groups
 *
 * Grup/departman yönetimi modülü
 *
 * Usage:
 * - Types: import { Group, GroupRole } from '@portal/groups'
 * - Frontend: import { GroupsAdminPage } from '@portal/groups/frontend'
 */

// Re-export types from @portal/core
export type {
  Group,
  UserGroup,
  GroupRole,
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupMemberDto,
  UpdateGroupMemberDto,
} from '@portal/core';

export {
  GroupRoleLabels,
  GroupRoleColors,
} from '@portal/core';

// Frontend exports
export * from './frontend';
