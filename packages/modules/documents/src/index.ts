/**
 * @portal/documents
 *
 * Doküman yönetimi modülü (MinIO tabanlı)
 *
 * Usage:
 * - Types: import { FolderInfo, DocumentInfo } from '@portal/documents'
 * - Frontend: import { documentsApi } from '@portal/documents/frontend'
 */

// Re-export types from @portal/core
export type {
  FolderInfo,
  DocumentInfo,
  DocumentVersionInfo,
  CreateFolderDto,
  UpdateFolderDto,
  UploadDocumentDto,
  UpdateDocumentDto,
  FolderBreadcrumb,
} from '@portal/core';

export {
  formatFileSize,
  getFileIcon,
} from '@portal/core';

// Frontend exports
export * from './frontend';
