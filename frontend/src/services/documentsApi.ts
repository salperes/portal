import api from './api';
import type {
  FolderInfo,
  DocumentInfo,
  DocumentVersionInfo,
  CreateFolderDto,
  UpdateFolderDto,
  UpdateDocumentDto,
  FolderBreadcrumb,
} from '@portal/core';

export type { FolderInfo, DocumentInfo, DocumentVersionInfo, FolderBreadcrumb } from '@portal/core';
export { formatFileSize, getFileIcon } from '@portal/core';

export const documentsApi = {
  // ─── Folder Operations ─────────────────────────────────────

  getFolders: async (params?: { parentId?: string; projectId?: string; all?: string }): Promise<FolderInfo[]> => {
    const response = await api.get('/documents/folders', { params });
    return response.data;
  },

  getFolderById: async (id: string): Promise<FolderInfo & { documents: DocumentInfo[] }> => {
    const response = await api.get(`/documents/folders/${id}`);
    return response.data;
  },

  getFolderTree: async (id?: string): Promise<FolderInfo[]> => {
    if (id) {
      const response = await api.get(`/documents/folders/${id}/tree`);
      return response.data;
    }
    // Root folders for tree
    const response = await api.get('/documents/folders');
    return response.data;
  },

  getFolderBreadcrumb: async (id: string): Promise<FolderBreadcrumb[]> => {
    const response = await api.get(`/documents/folders/${id}/breadcrumb`);
    return response.data;
  },

  createFolder: async (data: CreateFolderDto): Promise<FolderInfo> => {
    const response = await api.post('/documents/folders', data);
    return response.data;
  },

  updateFolder: async (id: string, data: UpdateFolderDto): Promise<FolderInfo> => {
    const response = await api.patch(`/documents/folders/${id}`, data);
    return response.data;
  },

  deleteFolder: async (id: string): Promise<void> => {
    await api.delete(`/documents/folders/${id}`);
  },

  // ─── Folder Permission Operations ──────────────────────────

  getFolderPermissions: async (folderId: string): Promise<FolderPermissionRule[]> => {
    const response = await api.get(`/documents/folders/${folderId}/permissions`);
    return response.data;
  },

  addFolderPermission: async (folderId: string, data: CreateFolderPermissionDto): Promise<FolderPermissionRule> => {
    const response = await api.post(`/documents/folders/${folderId}/permissions`, data);
    return response.data;
  },

  removeFolderPermission: async (folderId: string, ruleId: string): Promise<void> => {
    await api.delete(`/documents/folders/${folderId}/permissions/${ruleId}`);
  },

  getMyPermissions: async (folderId: string): Promise<FolderPermissions> => {
    const response = await api.get(`/documents/folders/${folderId}/my-permissions`);
    return response.data;
  },

  // ─── Document Permission Operations ──────────────────────────

  getDocumentPermissions: async (docId: string): Promise<PermissionRule[]> => {
    const response = await api.get(`/documents/${docId}/permissions`);
    return response.data;
  },

  addDocumentPermission: async (docId: string, data: CreateFolderPermissionDto): Promise<PermissionRule> => {
    const response = await api.post(`/documents/${docId}/permissions`, data);
    return response.data;
  },

  removeDocumentPermission: async (docId: string, ruleId: string): Promise<void> => {
    await api.delete(`/documents/${docId}/permissions/${ruleId}`);
  },

  // ─── Document Operations ───────────────────────────────────

  createDocument: async (data: { name: string; type: 'docx' | 'xlsx' | 'pptx' | 'txt'; folderId: string }): Promise<DocumentInfo> => {
    const response = await api.post('/documents/create-new', data);
    return response.data;
  },

  getDocuments: async (params?: {
    folderId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ documents: DocumentInfo[]; total: number }> => {
    const response = await api.get('/documents', { params });
    return response.data;
  },

  getDocumentById: async (id: string): Promise<DocumentInfo> => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  uploadDocument: async (file: File, folderId: string, description?: string): Promise<DocumentInfo> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);
    if (description) {
      formData.append('description', description);
    }
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateDocument: async (id: string, data: UpdateDocumentDto): Promise<DocumentInfo> => {
    const response = await api.patch(`/documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  downloadDocument: async (id: string, filename: string): Promise<void> => {
    const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ─── Recycle Bin Operations ──────────────────────────────────

  getRecycleBin: async (): Promise<{ folders: FolderInfo[]; documents: DocumentInfo[] }> => {
    const response = await api.get('/documents/recycle-bin');
    return response.data;
  },

  restoreDocument: async (id: string): Promise<DocumentInfo> => {
    const response = await api.post(`/documents/${id}/restore`);
    return response.data;
  },

  permanentDeleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}/permanent`);
  },

  restoreFolder: async (id: string): Promise<FolderInfo> => {
    const response = await api.post(`/documents/folders/${id}/restore`);
    return response.data;
  },

  permanentDeleteFolder: async (id: string): Promise<void> => {
    await api.delete(`/documents/folders/${id}/permanent`);
  },

  // ─── Version Operations ────────────────────────────────────

  getVersions: async (documentId: string): Promise<DocumentVersionInfo[]> => {
    const response = await api.get(`/documents/${documentId}/versions`);
    return response.data;
  },

  uploadNewVersion: async (
    documentId: string,
    file: File,
    changeNote?: string,
  ): Promise<DocumentVersionInfo> => {
    const formData = new FormData();
    formData.append('file', file);
    if (changeNote) {
      formData.append('changeNote', changeNote);
    }
    const response = await api.post(`/documents/${documentId}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  downloadVersion: async (documentId: string, versionNumber: number, filename: string): Promise<void> => {
    const response = await api.get(`/documents/${documentId}/versions/${versionNumber}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  getDocumentBlob: async (docId: string): Promise<Blob> => {
    const response = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
    return response.data;
  },

  downloadDocumentBuffer: async (docId: string): Promise<ArrayBuffer> => {
    const response = await api.get(`/documents/${docId}/download`, { responseType: 'arraybuffer' });
    return response.data;
  },

  // ─── ONLYOFFICE Editor Operations ────────────────────────────

  getEditorConfig: async (docId: string, mode: 'view' | 'edit' = 'view'): Promise<DocumentEditorConfig> => {
    const response = await api.get(`/documents/${docId}/editor-config`, { params: { mode } });
    return response.data;
  },

  checkEditorSupport: async (docId: string): Promise<{ canView: boolean; canEdit: boolean }> => {
    const response = await api.get(`/documents/${docId}/editor-check`);
    return response.data;
  },

  getActiveUsers: async (docId: string): Promise<ActiveUser[]> => {
    const response = await api.get(`/documents/${docId}/active-users`);
    return response.data;
  },
};

// ─── ONLYOFFICE Types ─────────────────────────────────────────

export interface DocumentEditorConfig {
  documentType: string;
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: { edit: boolean; download: boolean; print: boolean };
  };
  editorConfig: {
    mode: string;
    callbackUrl: string;
    lang: string;
    user: { id: string; name: string };
    customization?: { autosave: boolean; forcesave: boolean };
  };
  token: string;
}

export interface ActiveUser {
  id: string;
  name: string;
  joinedAt: string;
}

// ─── ONLYOFFICE File Type Helpers ────────────────────────────

const viewableExtensions = ['doc', 'docx', 'odt', 'rtf', 'txt', 'xls', 'xlsx', 'ods', 'csv', 'ppt', 'pptx', 'odp', 'pdf'];
const editableExtensions = ['docx', 'xlsx', 'pptx', 'txt', 'csv'];

export function canOpenWithOnlyOffice(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return viewableExtensions.includes(ext);
}

export function canEditWithOnlyOffice(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return editableExtensions.includes(ext);
}

// ─── CAD File Type Helpers ───────────────────────────────────

const cadExtensions = ['dwg', 'dxf'];

export function canOpenWithCadViewer(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return cadExtensions.includes(ext);
}

// ─── X-Ray/TIFF File Type Helpers ────────────────────────────

const xrayExtensions = ['tif', 'tiff', 'xtif'];

export function canOpenWithXRayViewer(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return xrayExtensions.includes(ext);
}

// ─── Image File Type Helpers ─────────────────────────────────

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

export function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return imageExtensions.includes(ext);
}

// ─── Folder Permission Types ────────────────────────────────

export interface FolderPermissionRule {
  id: string;
  targetType: 'user' | 'group' | 'role' | 'project_role';
  targetId: string | null;
  targetName: string;
  targetRole: string | null;
  permissions: string[];
  ruleType: 'grant' | 'deny';
  inherit: boolean;
  createdBy: string;
  createdAt: string;
}

export interface PermissionRule extends FolderPermissionRule {
  source: 'self' | 'inherited';
}

export interface FolderPermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  manage: boolean;
}

export interface CreateFolderPermissionDto {
  targetType: 'user' | 'group';
  targetId: string;
  permissions: string[];
}
