/**
 * @portal/file-server
 *
 * File Server modülü - SMB dosya tarayıcısı ve ONLYOFFICE entegrasyonu
 *
 * Usage:
 * - Types: import { FileItem, ShareItem } from '@portal/file-server'
 * - Frontend: import { FileServerPage } from '@portal/file-server/frontend'
 */

// File Server Types
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

// Document Editor Types (ONLYOFFICE)
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

// Supported file extensions
export const SUPPORTED_EXTENSIONS = {
  document: ['doc', 'docx', 'odt', 'txt', 'rtf'],
  spreadsheet: ['xls', 'xlsx', 'ods', 'csv'],
  presentation: ['ppt', 'pptx', 'odp'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
  pdf: ['pdf'],
} as const;

/**
 * Check if a file can be opened with ONLYOFFICE
 */
export function canOpenWithOnlyOffice(extension?: string): boolean {
  const supportedExtensions = [
    ...SUPPORTED_EXTENSIONS.document,
    ...SUPPORTED_EXTENSIONS.spreadsheet,
    ...SUPPORTED_EXTENSIONS.presentation,
    ...SUPPORTED_EXTENSIONS.pdf,
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
    // Archives
    zip: 'file-archive',
    rar: 'file-archive',
    '7z': 'file-archive',
  };

  return iconMap[extension?.toLowerCase() || ''] || 'file';
}

// Note: Frontend page and components are in frontend/src/
// Full migration will move them to @portal/file-server/frontend
