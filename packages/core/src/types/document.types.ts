/**
 * Document Types - Shared between backend and frontend
 */

export interface FolderInfo {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string | null;
  ownerId: string;
  path: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    displayName: string;
  };
  project?: {
    id: string;
    code: string;
    name: string;
  } | null;
  children?: FolderInfo[];
  documentCount?: number;
}

export interface DocumentInfo {
  id: string;
  folderId: string;
  name: string;
  description: string | null;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  currentVersion: number;
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    displayName: string;
  };
  lockedByUser?: {
    id: string;
    displayName: string;
  } | null;
  folder?: {
    id: string;
    name: string;
  };
}

export interface DocumentVersionInfo {
  id: string;
  documentId: string;
  versionNumber: number;
  storageKey: string;
  sizeBytes: number;
  changeNote: string | null;
  createdBy: string;
  createdAt: string;
  creator?: {
    id: string;
    displayName: string;
  };
}

export interface CreateFolderDto {
  name: string;
  parentId?: string;
  projectId?: string;
}

export interface UpdateFolderDto {
  name?: string;
  parentId?: string;
}

export interface UploadDocumentDto {
  folderId: string;
  description?: string;
}

export interface UpdateDocumentDto {
  name?: string;
  description?: string;
  folderId?: string;
}

export interface FolderBreadcrumb {
  id: string;
  name: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';
  if (mimeType.startsWith('text/')) return 'text';
  return 'file';
}
