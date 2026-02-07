# Users Module

## Overview
Kullanıcı yönetimi. AD entegrasyonu, roller, aktivasyon.

## Module Package

```
packages/modules/users/
├── src/
│   └── index.ts                # Type re-exports + additional types
├── package.json                # @portal/users
└── CLAUDE.md
```

## Usage

```typescript
// Core types (from @portal/core)
import { User, UserRole, RoleLabels, RoleColors, hasMinimumRole } from '@portal/users';

// Module-specific types
import { UsersListResponse, UpdateUserDto, UsersQueryParams } from '@portal/users';
```

---

## Code Locations

### Backend
```
backend/src/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
└── dto/
    └── update-user.dto.ts

backend/src/auth/           # Auth related
├── auth.service.ts         # Login, lastLogin update
├── ldap.service.ts         # AD authentication
└── guards/
```

### Frontend (Mevcut Lokasyon)
```
frontend/src/
├── pages/admin/UsersAdmin.tsx    # User management
├── services/usersApi.ts          # API calls
└── store/authStore.ts            # Auth state
```

### Shared Types
```
packages/core/src/types/user.types.ts
```

### Shared Entity
```
packages/core/src/entities/user.entity.ts
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Admin | List with filters |
| GET | `/api/users/stats` | Admin | Statistics |
| GET | `/api/users/departments` | Admin | Unique departments |
| GET | `/api/users/roles` | Admin | Available roles |
| GET | `/api/users/:id` | Admin | Single user |
| PATCH | `/api/users/:id` | Admin | Update |
| PATCH | `/api/users/:id/role` | Admin | Change role |
| PATCH | `/api/users/:id/activate` | Admin | Activate |
| PATCH | `/api/users/:id/deactivate` | Admin | Deactivate |
| DELETE | `/api/users/:id` | Admin | Delete |

## Roles

| Role | Level | Description |
|------|-------|-------------|
| viewer | 1 | Read only |
| user | 2 | Standard (default) |
| supervisor | 3 | Manager level |
| admin | 4 | Full access |

## Types

### Core Types (from @portal/core)
```typescript
type UserRole = 'viewer' | 'user' | 'supervisor' | 'admin';

interface User {
  id: string;
  adUsername: string;
  email: string | null;
  displayName: string | null;
  department: string | null;
  title: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  total: number;
  active: number;
  admins: number;
  weeklyLogins: number;
}
```

### Module Types
```typescript
interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

interface UpdateUserDto {
  displayName?: string;
  department?: string;
  title?: string;
  role?: UserRole;
  isActive?: boolean;
}

interface UsersQueryParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  search?: string;
}
```

## Utilities

```typescript
// Role level mapping for permission checks
const RoleLevel: Record<UserRole, number> = {
  viewer: 1, user: 2, supervisor: 3, admin: 4
};

// UI labels
const RoleLabels: Record<UserRole, string> = {
  viewer: 'İzleyici', user: 'Kullanıcı', supervisor: 'Yönetici', admin: 'Admin'
};

// UI colors
const RoleColors: Record<UserRole, { bg: string; text: string }>;

// Permission check
function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean;
```

## Auth Flow

1. User submits credentials
2. `LdapService.authenticate()` validates against AD
3. User created/updated in DB with `lastLogin`
4. Password encrypted → Redis (for SMB)
5. JWT tokens returned

## Business Rules

1. First login creates user with `lastLogin: new Date()`
2. Subsequent logins update `lastLogin`
3. AD info synced on each login (email, department, etc.)
4. Role persists (not overwritten by AD)
5. Admin role auto-assigned to users in `DEFAULT_ADMINS` or AD admin groups

## Related Files

- Entity: `packages/core/src/entities/user.entity.ts`
- Types: `packages/core/src/types/user.types.ts`
- Auth Service: `backend/src/auth/auth.service.ts`
- LDAP Service: `backend/src/auth/ldap.service.ts`
- Users Service: `backend/src/users/users.service.ts`
- Admin Page: `frontend/src/pages/admin/UsersAdmin.tsx`
- Module Types: `packages/modules/users/src/index.ts`
