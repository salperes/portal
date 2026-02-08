/**
 * Documents API Service
 *
 * @portal/documents frontend API client
 */

import type {
  FolderInfo,
  DocumentInfo,
  DocumentVersionInfo,
  CreateFolderDto,
  UpdateFolderDto,
  UpdateDocumentDto,
  FolderBreadcrumb,
} from '@portal/core';

// API instance will be injected from the main app
let apiInstance: any = null;

export const setApiInstance = (api: any) => {
  apiInstance = api;
};

const getApi = () => {
  if (!apiInstance) {
    throw new Error('API instance not set. Call setApiInstance first.');
  }
  return apiInstance;
};

export const documentsApi = {
  // ─── Folder Operations ─────────────────────────────────────

  getFolders: async (params?: { parentId?: string; projectId?: string }): Promise<FolderInfo[]> => {
    const response = await getApi().get('/documents/folders', { params });
    return response.data;
  },

  getFolderById: async (id: string): Promise<FolderInfo & { documents: DocumentInfo[] }> => {
    const response = await getApi().get(`/documents/folders/${id}`);
    return response.data;
  },

  getFolderTree: async (id: string): Promise<FolderInfo[]> => {
    const response = await getApi().get(`/documents/folders/${id}/tree`);
    return response.data;
  },

  getFolderBreadcrumb: async (id: string): Promise<FolderBreadcrumb[]> => {
    const response = await getApi().get(`/documents/folders/${id}/breadcrumb`);
    return response.data;
  },

  createFolder: async (data: CreateFolderDto): Promise<FolderInfo> => {
    const response = await getApi().post('/documents/folders', data);
    return response.data;
  },

  updateFolder: async (id: string, data: UpdateFolderDto): Promise<FolderInfo> => {
    const response = await getApi().patch(`/documents/folders/${id}`, data);
    return response.data;
  },

  deleteFolder: async (id: string): Promise<void> => {
    await getApi().delete(`/documents/folders/${id}`);
  },

  // ─── Document Operations ───────────────────────────────────

  getDocuments: async (params?: {
    folderId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ documents: DocumentInfo[]; total: number }> => {
    const response = await getApi().get('/documents', { params });
    return response.data;
  },

  getDocumentById: async (id: string): Promise<DocumentInfo> => {
    const response = await getApi().get(`/documents/${id}`);
    return response.data;
  },

  uploadDocument: async (file: File, folderId: string, description?: string): Promise<DocumentInfo> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);
    if (description) {
      formData.append('description', description);
    }
    const response = await getApi().post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateDocument: async (id: string, data: UpdateDocumentDto): Promise<DocumentInfo> => {
    const response = await getApi().patch(`/documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await getApi().delete(`/documents/${id}`);
  },

  downloadDocument: (id: string): string => {
    // Return the download URL — browser will handle the download
    return `/api/documents/${id}/download`;
  },

  // ─── Version Operations ────────────────────────────────────

  getVersions: async (documentId: string): Promise<DocumentVersionInfo[]> => {
    const response = await getApi().get(`/documents/${documentId}/versions`);
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
    const response = await getApi().post(`/documents/${documentId}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  downloadVersion: (documentId: string, versionNumber: number): string => {
    return `/api/documents/${documentId}/versions/${versionNumber}/download`;
  },
};
