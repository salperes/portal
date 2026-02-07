# File Server Module

## Overview
SMB dosya tarayıcı + ONLYOFFICE doküman editörü.

## Module Package

```
packages/modules/file-server/
├── src/
│   └── index.ts                # Types ve utility exports
├── package.json                # @portal/file-server
└── CLAUDE.md
```

## Usage

```typescript
// Types
import {
  FileItem,
  ShareItem,
  DocumentConfig,
  canOpenWithOnlyOffice,
  canEditWithOnlyOffice,
  formatFileSize,
} from '@portal/file-server';
```

---

## Code Locations

### Backend
```
backend/src/file-server/
├── file-server.module.ts
├── file-server.controller.ts
├── file-server.service.ts      # SMB operations
├── document.service.ts         # ONLYOFFICE integration
└── dto/
```

### Frontend (Mevcut Lokasyon)
```
frontend/src/
├── pages/FileServer.tsx        # File browser
├── components/
│   ├── DocumentViewer.tsx      # ONLYOFFICE embed
│   └── DocumentViewerErrorBoundary.tsx
├── services/fileServerApi.ts   # API calls
└── store/fileServerStore.ts    # Browser state (Zustand)
```

## API Endpoints

### File Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/file-server/shares` | List shares |
| GET | `/api/file-server/browse` | Browse directory |
| GET | `/api/file-server/download` | Download file |
| POST | `/api/file-server/upload` | Upload file |
| DELETE | `/api/file-server/delete` | Delete file/folder |
| POST | `/api/file-server/create-folder` | Create folder |

### Document Editor
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/document/config` | JWT | Editor config |
| GET | `/document/content` | Key | File content (ONLYOFFICE) |
| POST | `/document/callback` | Public | Save callback |
| GET | `/document/check` | JWT | Can open/edit |
| GET | `/document/active-users` | JWT | Users editing |

## Types

```typescript
interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  createdAt: string;
  modifiedAt: string;
  extension?: string;
  mimeType?: string;
}

interface ShareItem {
  name: string;
  path: string;
}

interface DocumentConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: { edit: boolean; download: boolean; print: boolean; };
  };
  editorConfig: {
    mode: string;
    callbackUrl: string;
    lang: string;
    user: { id: string; name: string; };
  };
  token: string;
}
```

## Utilities

```typescript
// Check if file can be opened with ONLYOFFICE
canOpenWithOnlyOffice(extension?: string): boolean

// Check if file can be edited (not just viewed)
canEditWithOnlyOffice(extension?: string): boolean

// Format bytes to human readable
formatFileSize(bytes: number): string // "1.5 MB"

// Get icon name for file type
getFileIcon(extension?: string, isDirectory?: boolean): string
```

## SMB Connection

```typescript
// Credentials from Redis (stored at login)
const credentials = await redisService.getUserCredentials(userId);
const smb = new SMB2({
  share: `\\\\${FILE_SERVER_HOST}\\${shareName}`,
  domain: FILE_SERVER_DOMAIN,
  username: credentials.username,
  password: credentials.password,
});
```

## ONLYOFFICE Flow

1. User opens document
2. Backend generates document key, stores in Redis
3. Frontend loads ONLYOFFICE with config
4. ONLYOFFICE fetches content via `/document/content`
5. On save, ONLYOFFICE calls `/document/callback`
6. Backend downloads from ONLYOFFICE URL, writes to SMB

### Callback Status Codes
| Code | Meaning | Action |
|------|---------|--------|
| 1 | Editing | None |
| 2 | Ready to save | Save file |
| 4 | Closed, no changes | None |
| 6 | Force save | Save file |

## Redis Keys

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `user-creds:{userId}` | SMB credentials | 7 days |
| `doc-session:{share}:{path}` | Document key | 24h |
| `doc-access:{key}` | Access info | 24h |
| `doc-users:{key}` | Active editors | 24h |

## Supported File Types

### Editable (ONLYOFFICE)
- Word: `.docx`, `.doc`, `.odt`, `.rtf`
- Excel: `.xlsx`, `.xls`, `.ods`, `.csv`
- PowerPoint: `.pptx`, `.ppt`, `.odp`

### View Only
- PDF: `.pdf`
- Images: `.jpg`, `.png`, `.gif`
- Text: `.txt`, `.md`

## Business Rules

1. Shares must be in `FILE_SERVER_SHARES` env var
2. Path traversal blocked (`..` not allowed)
3. SMB credentials expire with refresh token (7 days)
4. Document session shared between users (collaborative)
5. Session invalidated after save

## Related Files

- Backend Service: `backend/src/file-server/file-server.service.ts`
- Document Service: `backend/src/file-server/document.service.ts`
- Backend Controller: `backend/src/file-server/file-server.controller.ts`
- Frontend Page: `frontend/src/pages/FileServer.tsx`
- Document Viewer: `frontend/src/components/DocumentViewer.tsx`
- Zustand Store: `frontend/src/store/fileServerStore.ts`
- Module Types: `packages/modules/file-server/src/index.ts`
