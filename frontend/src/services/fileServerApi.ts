import api from './api';

export interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  createdAt: string;
  modifiedAt: string;
  extension?: string;
  mimeType?: string;
}

export interface ShareItem {
  name: string;
  path: string;
}

export interface ListFilesResponse {
  path: string;
  share: string;
  items: FileItem[];
}

export interface ListSharesResponse {
  shares: ShareItem[];
}

export interface DocumentConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: boolean;
      download: boolean;
      print: boolean;
    };
  };
  editorConfig: {
    mode: string;
    callbackUrl: string;
    lang: string;
    user: {
      id: string;
      name: string;
    };
    customization?: {
      autosave: boolean;
      forcesave: boolean;
    };
  };
  token: string;
}

export interface DocumentSupportCheck {
  canOpen: boolean;
  canEdit: boolean;
  documentType: string | null;
}

export interface ActiveUser {
  id: string;
  name: string;
  joinedAt: string;
}

export interface ActiveUsersResponse {
  users: ActiveUser[];
}

export const fileServerApi = {
  /**
   * Get list of available shares
   */
  async getShares(): Promise<ShareItem[]> {
    const response = await api.get<ListSharesResponse>('/file-server/shares');
    return response.data.shares;
  },

  /**
   * Browse directory contents
   */
  async browse(share: string, path: string = ''): Promise<ListFilesResponse> {
    const response = await api.get<ListFilesResponse>('/file-server/browse', {
      params: { share, path },
    });
    return response.data;
  },

  /**
   * Download a file
   */
  async download(share: string, path: string): Promise<Blob> {
    const response = await api.get('/file-server/download', {
      params: { share, path },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Upload a file
   */
  async upload(share: string, path: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('share', share);
    formData.append('path', path);

    await api.post('/file-server/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Delete a file or directory
   */
  async delete(share: string, path: string, isDirectory: boolean): Promise<void> {
    await api.delete('/file-server/delete', {
      params: { share, path, isDirectory: isDirectory.toString() },
    });
  },

  /**
   * Create a new folder
   */
  async createFolder(share: string, path: string): Promise<void> {
    await api.post('/file-server/create-folder', { share, path });
  },

  // Document Editor (ONLYOFFICE) APIs

  /**
   * Check if a file can be opened with ONLYOFFICE
   */
  async checkDocumentSupport(filename: string): Promise<DocumentSupportCheck> {
    const response = await api.get<DocumentSupportCheck>('/file-server/document/check', {
      params: { filename },
    });
    return response.data;
  },

  /**
   * Get ONLYOFFICE editor configuration
   */
  async getDocumentConfig(share: string, path: string, mode: 'view' | 'edit' = 'view'): Promise<DocumentConfig> {
    const response = await api.get<DocumentConfig>('/file-server/document/config', {
      params: { share, path, mode },
    });
    return response.data;
  },

  /**
   * Get active users currently editing a document
   */
  async getActiveUsers(share: string, path: string): Promise<ActiveUser[]> {
    const response = await api.get<ActiveUsersResponse>('/file-server/document/active-users', {
      params: { share, path },
    });
    return response.data.users;
  },
};

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get icon name based on file extension
 */
export function getFileIcon(extension?: string, isDirectory?: boolean): string {
  if (isDirectory) return 'folder';

  const iconMap: Record<string, string> = {
    // Documents
    pdf: 'file-pdf',
    doc: 'file-word',
    docx: 'file-word',
    xls: 'file-excel',
    xlsx: 'file-excel',
    ppt: 'file-powerpoint',
    pptx: 'file-powerpoint',
    txt: 'file-text',

    // Images
    jpg: 'file-image',
    jpeg: 'file-image',
    png: 'file-image',
    gif: 'file-image',
    svg: 'file-image',
    webp: 'file-image',

    // Archives
    zip: 'file-archive',
    rar: 'file-archive',
    '7z': 'file-archive',
    tar: 'file-archive',
    gz: 'file-archive',

    // Code
    js: 'file-code',
    ts: 'file-code',
    jsx: 'file-code',
    tsx: 'file-code',
    html: 'file-code',
    css: 'file-code',
    json: 'file-code',

    // Media
    mp3: 'file-audio',
    wav: 'file-audio',
    mp4: 'file-video',
    avi: 'file-video',
    mkv: 'file-video',
  };

  return iconMap[extension?.toLowerCase() || ''] || 'file';
}

/**
 * Check if a file can be opened with ONLYOFFICE
 */
export function canOpenWithOnlyOffice(extension?: string): boolean {
  const supportedExtensions = [
    'doc', 'docx', 'odt', 'rtf', 'txt',
    'xls', 'xlsx', 'ods', 'csv',
    'ppt', 'pptx', 'odp',
    'pdf',
  ];
  return supportedExtensions.includes(extension?.toLowerCase() || '');
}

/**
 * Check if a file can be edited (not just viewed) with ONLYOFFICE
 */
export function canEditWithOnlyOffice(extension?: string): boolean {
  const editableExtensions = ['docx', 'xlsx', 'pptx', 'txt', 'csv'];
  return editableExtensions.includes(extension?.toLowerCase() || '');
}
