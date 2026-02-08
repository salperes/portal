import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Upload,
  FolderPlus,
  ChevronRight,
  Folder,
  LayoutGrid,
  LayoutList,
  Loader2,
  Download,
  MoreVertical,
  Edit2,
  Trash2,
  RefreshCw,
  File,
  Eye,
  Edit,
  Shield,
  FilePlus,
} from 'lucide-react';
import { useDocumentsStore } from '../store/documentsStore';
import { documentsApi, formatFileSize, canOpenWithOnlyOffice, canEditWithOnlyOffice, canOpenWithCadViewer } from '../services/documentsApi';
import type { FolderInfo, DocumentInfo, DocumentVersionInfo } from '../services/documentsApi';
import DocumentsSidebar from '../components/documents/DocumentsSidebar';
import { DocumentEditor } from '../components/documents/DocumentEditor';
import {
  CreateFolderModal,
  UploadModal,
  DocumentDetailPanel,
  RenameModal,
  DeleteConfirmModal,
} from '../components/documents/DocumentModals';
import { PermissionsModal } from '../components/documents/PermissionsModal';
import { CadViewer } from '../components/documents/CadViewer';

export default function Documents() {
  const queryClient = useQueryClient();
  const { currentFolderId, setCurrentFolder, viewMode, setViewMode, searchQuery, setSearchQuery } =
    useDocumentsStore();

  // ─── Modal state ──────────────────────────────────────────
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; type: 'folder' | 'document' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'folder' | 'document' } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; type: 'folder' | 'document' | 'empty'; x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [documentToView, setDocumentToView] = useState<{ id: string; name: string; mode: 'view' | 'edit' } | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null);
  const [cadDocToView, setCadDocToView] = useState<{ id: string; name: string } | null>(null);

  // ─── Queries ──────────────────────────────────────────────

  const { data: allFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => documentsApi.getFolders({ all: 'true' }),
  });

  const { data: folderDetail, isLoading: folderDetailLoading } = useQuery({
    queryKey: ['folder', currentFolderId],
    queryFn: () => documentsApi.getFolderById(currentFolderId!),
    enabled: !!currentFolderId,
  });

  const { data: breadcrumb = [] } = useQuery({
    queryKey: ['folder-breadcrumb', currentFolderId],
    queryFn: () => documentsApi.getFolderBreadcrumb(currentFolderId!),
    enabled: !!currentFolderId,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['documents-search', searchQuery],
    queryFn: () => documentsApi.getDocuments({ search: searchQuery }),
    enabled: searchQuery.length >= 2,
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ['document-versions', selectedDoc?.id],
    queryFn: () => documentsApi.getVersions(selectedDoc!.id),
    enabled: !!selectedDoc,
  });

  // ─── Derived data ────────────────────────────────────────

  // Sub-folders of current folder
  const subFolders = currentFolderId
    ? allFolders.filter((f) => f.parentId === currentFolderId)
    : allFolders.filter((f) => !f.parentId);

  // Documents in current folder
  const documents: DocumentInfo[] = folderDetail?.documents || [];

  const isLoading = foldersLoading || (currentFolderId ? folderDetailLoading : false);

  // ─── Mutations ────────────────────────────────────────────

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId: string | null }) =>
      documentsApi.createFolder({ name: data.name, parentId: data.parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (currentFolderId) queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
      setShowCreateFolder(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ files, description }: { files: File[]; description: string }) => {
      for (const file of files) {
        await documentsApi.uploadDocument(file, currentFolderId!, description);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
      setShowUpload(false);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (currentFolderId) queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
      setDeleteTarget(null);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
      setDeleteTarget(null);
      setSelectedDoc(null);
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => documentsApi.updateFolder(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (currentFolderId) queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
      setRenameTarget(null);
    },
  });

  const renameDocMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => documentsApi.updateDocument(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
      setRenameTarget(null);
    },
  });

  const uploadVersionMutation = useMutation({
    mutationFn: ({ docId, file, changeNote }: { docId: string; file: File; changeNote: string }) =>
      documentsApi.uploadNewVersion(docId, file, changeNote || undefined),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', vars.docId] });
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: (data: { name: string; type: 'docx' | 'xlsx' | 'pptx' | 'txt'; folderId: string }) =>
      documentsApi.createDocument(data),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
      setContextMenu(null);
      // Open in editor immediately for office files
      if (canEditWithOnlyOffice(doc.name)) {
        setDocumentToView({ id: doc.id, name: doc.name, mode: 'edit' });
      }
    },
  });

  // ─── Handlers ─────────────────────────────────────────────

  const handleDownload = useCallback(async (id: string, filename: string) => {
    await documentsApi.downloadDocument(id, filename);
  }, []);

  const handleDownloadVersion = useCallback(async (docId: string, versionNumber: number, filename: string) => {
    await documentsApi.downloadVersion(docId, versionNumber, filename);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!currentFolderId) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadMutation.mutate({ files, description: '' });
      }
    },
    [currentFolderId, uploadMutation],
  );

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'folder' | 'document' | 'empty') => {
    e.preventDefault();
    e.stopPropagation();
    const MENU_WIDTH = 200;
    const MENU_HEIGHT = 280;
    const PADDING = 8;
    let x = e.clientX;
    let y = e.clientY;
    if (x + MENU_WIDTH + PADDING > window.innerWidth) x = Math.max(PADDING, x - MENU_WIDTH);
    if (y + MENU_HEIGHT + PADDING > window.innerHeight) y = Math.max(PADDING, y - MENU_HEIGHT);
    setContextMenu({ id, type, x, y });
  };

  // Close context menu on click anywhere
  const handlePageClick = () => {
    if (contextMenu) setContextMenu(null);
  };

  // ─── Search results view ──────────────────────────────────
  const isSearching = searchQuery.length >= 2;
  const displayDocs = isSearching ? searchResults?.documents || [] : documents;

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-4" onClick={handlePageClick}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Dökümanlar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Dökümanlarınızı yönetin, paylaşın ve versiyonlayın
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              if (!currentFolderId) {
                alert('Lütfen önce bir klasör seçin.');
                return;
              }
              setShowUpload(true);
            }}
            className="flex items-center gap-2 bg-[#1890FF] text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Yükle
          </button>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <FolderPlus className="w-4 h-4" />
            Klasör
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: '500px' }}>
        {/* Left panel - Folder tree */}
        <div className="col-span-3 hidden lg:block">
          <DocumentsSidebar
            folders={allFolders}
            currentFolderId={currentFolderId}
            onSelectFolder={setCurrentFolder}
            onCreateFolder={() => setShowCreateFolder(true)}
            onFolderContextMenu={(e, folderId) => handleContextMenu(e, folderId, 'folder')}
            isLoading={foldersLoading}
          />
        </div>

        {/* Right panel - Content */}
        <div
          className="col-span-12 lg:col-span-9 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col"
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (currentFolderId) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
        >
          {/* Breadcrumb + view toggle */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 overflow-x-auto">
              <button
                onClick={() => setCurrentFolder(null)}
                className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 whitespace-nowrap"
              >
                <Folder className="w-4 h-4" />
                Ana
              </button>
              {breadcrumb.map((crumb) => (
                <span key={crumb.id} className="flex items-center">
                  <ChevronRight className="w-4 h-4 mx-0.5 text-gray-400" />
                  <button
                    onClick={() => setCurrentFolder(crumb.id)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap"
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['folders'] });
                  if (currentFolderId) queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
                title="Yenile"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                title="Liste"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                title="Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drag-drop overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-50/80 dark:bg-blue-900/30 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-500">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                <p className="text-blue-700 dark:text-blue-300 font-medium">Dosyaları bırakın</p>
              </div>
            </div>
          )}

          {/* Content area */}
          <div
            className="flex-1 p-4 relative"
            onContextMenu={(e) => {
              // Show empty area context menu if not clicking on an interactive item
              if (!currentFolderId) return;
              const target = e.target as HTMLElement;
              if (target.closest('[data-ctx-item]')) return;
              handleContextMenu(e, currentFolderId, 'empty');
            }}
          >
            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Empty - no folder selected */}
            {!isLoading && !currentFolderId && !isSearching && subFolders.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Folder className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Henüz klasör yok</p>
                <p className="text-sm mt-1">Başlamak için yeni bir klasör oluşturun</p>
              </div>
            )}

            {/* Root view - show root folders */}
            {!isLoading && !currentFolderId && !isSearching && subFolders.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">KÖK KLASÖRLER</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {subFolders.map((folder) => (
                    <div
                      key={folder.id}
                      data-ctx-item
                      className="relative p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setCurrentFolder(folder.id)}
                      onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
                    >
                      <button
                        onClick={(e) => handleContextMenu(e, folder.id, 'folder')}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      <Folder className="w-10 h-10 text-yellow-500 mb-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{folder.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(folder.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Folder selected - show subfolders + documents */}
            {!isLoading && currentFolderId && !isSearching && (
              <div className="space-y-4">
                {/* Sub-folders */}
                {subFolders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Klasörler</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {subFolders.map((folder) => (
                        <div
                          key={folder.id}
                          data-ctx-item
                          className="relative p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => setCurrentFolder(folder.id)}
                          onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
                        >
                          <button
                            onClick={(e) => handleContextMenu(e, folder.id, 'folder')}
                            className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          <div className="flex items-center gap-2">
                            <Folder className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{folder.name}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents - List view */}
                {viewMode === 'list' && displayDocs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Dosyalar</h3>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                        <div className="col-span-5">Ad</div>
                        <div className="col-span-2">Boyut</div>
                        <div className="col-span-1 text-center">v</div>
                        <div className="col-span-3">Tarih</div>
                        <div className="col-span-1"></div>
                      </div>
                      {/* Rows */}
                      {displayDocs.map((doc) => (
                        <div
                          key={doc.id}
                          data-ctx-item
                          className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          onClick={() => setSelectedDoc(doc)}
                          onDoubleClick={() => {
                            if (canOpenWithCadViewer(doc.name)) {
                              setCadDocToView({ id: doc.id, name: doc.name });
                            } else if (canOpenWithOnlyOffice(doc.name)) {
                              setDocumentToView({ id: doc.id, name: doc.name, mode: 'view' });
                            }
                          }}
                          onContextMenu={(e) => handleContextMenu(e, doc.id, 'document')}
                        >
                          <div className="col-span-5 flex items-center gap-2 min-w-0">
                            <FileIcon mimeType={doc.mimeType} />
                            <span className="text-sm truncate text-gray-900 dark:text-white">{doc.name}</span>
                          </div>
                          <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            {formatFileSize(doc.sizeBytes)}
                          </div>
                          <div className="col-span-1 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center">
                            v{doc.currentVersion}
                          </div>
                          <div className="col-span-3 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            {new Date(doc.createdAt).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="col-span-1 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDownload(doc.id, doc.name)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-blue-600"
                              title="İndir"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleContextMenu(e, doc.id, 'document')}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents - Grid view */}
                {viewMode === 'grid' && displayDocs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Dosyalar</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {displayDocs.map((doc) => (
                        <div
                          key={doc.id}
                          data-ctx-item
                          className="relative p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group text-center"
                          onClick={() => setSelectedDoc(doc)}
                          onDoubleClick={() => {
                            if (canOpenWithCadViewer(doc.name)) {
                              setCadDocToView({ id: doc.id, name: doc.name });
                            } else if (canOpenWithOnlyOffice(doc.name)) {
                              setDocumentToView({ id: doc.id, name: doc.name, mode: 'view' });
                            }
                          }}
                          onContextMenu={(e) => handleContextMenu(e, doc.id, 'document')}
                        >
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDownload(doc.id, doc.name)}
                              className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              title="İndir"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                          <FileIcon mimeType={doc.mimeType} large />
                          <p className="text-sm text-gray-700 dark:text-gray-200 truncate mt-2" title={doc.name}>
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatFileSize(doc.sizeBytes)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty folder */}
                {subFolders.length === 0 && displayDocs.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Folder className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Bu klasör boş</p>
                    <p className="text-sm mt-1">Dosya yükleyin veya alt klasör oluşturun</p>
                  </div>
                )}
              </div>
            )}

            {/* Search results */}
            {isSearching && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                  Arama sonuçları: &quot;{searchQuery}&quot;
                  {searchResults && ` (${searchResults.total} sonuç)`}
                </h3>
                {displayDocs.length > 0 ? (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {displayDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <FileIcon mimeType={doc.mimeType} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(doc.sizeBytes)} — v{doc.currentVersion}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(doc.id, doc.name); }}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-blue-600"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8">Sonuç bulunamadı</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {/* ─── Folder Context Menu ─── */}
          {contextMenu.type === 'folder' && (
            <>
              <button
                onClick={() => {
                  setCurrentFolder(contextMenu.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FolderPlus className="w-4 h-4 text-blue-500" />
                Aç
              </button>
              <button
                onClick={() => {
                  setCurrentFolder(contextMenu.id);
                  setShowCreateFolder(true);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FolderPlus className="w-4 h-4 text-green-500" />
                Yeni Alt Klasör
              </button>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => {
                  const folder = allFolders.find((f) => f.id === contextMenu.id);
                  if (folder) setRenameTarget({ id: contextMenu.id, name: folder.name, type: 'folder' });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit2 className="w-4 h-4" />
                Yeniden Adlandır
              </button>
              <button
                onClick={() => {
                  const folder = allFolders.find((f) => f.id === contextMenu.id);
                  if (folder) setPermissionsTarget({ type: 'folder', id: folder.id, name: folder.name });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Shield className="w-4 h-4 text-blue-600" />
                Erişim Yönetimi
              </button>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => {
                  const folder = allFolders.find((f) => f.id === contextMenu.id);
                  if (folder) setDeleteTarget({ id: contextMenu.id, name: folder.name, type: 'folder' });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
                Sil
              </button>
            </>
          )}

          {/* ─── Document Context Menu ─── */}
          {contextMenu.type === 'document' && (() => {
            const doc = documents.find((d) => d.id === contextMenu.id);
            const docName = doc?.name || '';
            return (
              <>
                {canOpenWithCadViewer(docName) && (
                  <button
                    onClick={() => {
                      setCadDocToView({ id: contextMenu.id, name: docName });
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Eye className="w-4 h-4 text-green-600" />
                    Görüntüle (CAD)
                  </button>
                )}
                {canOpenWithOnlyOffice(docName) && (
                  <button
                    onClick={() => {
                      setDocumentToView({ id: contextMenu.id, name: docName, mode: 'view' });
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Eye className="w-4 h-4 text-green-600" />
                    Görüntüle
                  </button>
                )}
                {canEditWithOnlyOffice(docName) && (
                  <button
                    onClick={() => {
                      setDocumentToView({ id: contextMenu.id, name: docName, mode: 'edit' });
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4 text-orange-500" />
                    Düzenle
                  </button>
                )}
                <button
                  onClick={() => {
                    if (doc) handleDownload(doc.id, doc.name);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="w-4 h-4" />
                  İndir
                </button>
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    if (doc) setRenameTarget({ id: contextMenu.id, name: doc.name, type: 'document' });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                  Yeniden Adlandır
                </button>
                <button
                  onClick={() => {
                    if (doc) setSelectedDoc(doc);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FileText className="w-4 h-4" />
                  Detaylar
                </button>
                <button
                  onClick={() => {
                    if (doc) setPermissionsTarget({ type: 'document', id: doc.id, name: doc.name });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Shield className="w-4 h-4 text-blue-600" />
                  Erişim Yönetimi
                </button>
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    if (doc) setDeleteTarget({ id: contextMenu.id, name: doc.name, type: 'document' });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </button>
              </>
            );
          })()}

          {/* ─── Empty Area Context Menu ─── */}
          {contextMenu.type === 'empty' && (
            <>
              <button
                onClick={() => {
                  const name = prompt('Dosya adı:', 'Yeni Doküman');
                  if (name && currentFolderId) {
                    createDocumentMutation.mutate({ name, type: 'docx', folderId: currentFolderId });
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                Yeni Word Dosyası
              </button>
              <button
                onClick={() => {
                  const name = prompt('Dosya adı:', 'Yeni Tablo');
                  if (name && currentFolderId) {
                    createDocumentMutation.mutate({ name, type: 'xlsx', folderId: currentFolderId });
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileText className="w-4 h-4 text-green-600" />
                Yeni Excel Dosyası
              </button>
              <button
                onClick={() => {
                  const name = prompt('Dosya adı:', 'Yeni Sunum');
                  if (name && currentFolderId) {
                    createDocumentMutation.mutate({ name, type: 'pptx', folderId: currentFolderId });
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileText className="w-4 h-4 text-orange-500" />
                Yeni PowerPoint Dosyası
              </button>
              <button
                onClick={() => {
                  const name = prompt('Dosya adı:', 'Yeni Metin');
                  if (name && currentFolderId) {
                    createDocumentMutation.mutate({ name, type: 'txt', folderId: currentFolderId });
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <File className="w-4 h-4 text-gray-500" />
                Yeni Metin Dosyası
              </button>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => {
                  setShowCreateFolder(true);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FolderPlus className="w-4 h-4 text-yellow-500" />
                Yeni Klasör
              </button>
              <button
                onClick={() => {
                  setShowUpload(true);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                Dosya Yükle
              </button>
              {currentFolderId && (
                <>
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      setPermissionsTarget({ type: 'folder', id: currentFolderId, name: folderDetail?.name || 'Klasör' });
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Shield className="w-4 h-4 text-blue-600" />
                    Erişim Yönetimi
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          parentId={currentFolderId}
          folders={allFolders}
          onSubmit={(name, parentId) => createFolderMutation.mutate({ name, parentId })}
          onClose={() => setShowCreateFolder(false)}
          isPending={createFolderMutation.isPending}
        />
      )}

      {showUpload && currentFolderId && (
        <UploadModal
          folderId={currentFolderId}
          folderName={folderDetail?.name || 'Klasör'}
          onUpload={(files, description) => uploadMutation.mutate({ files, description })}
          onClose={() => setShowUpload(false)}
          isPending={uploadMutation.isPending}
        />
      )}

      {selectedDoc && (
        <DocumentDetailPanel
          document={selectedDoc}
          versions={versions}
          isLoadingVersions={versionsLoading}
          onClose={() => setSelectedDoc(null)}
          onDownload={handleDownload}
          onDownloadVersion={handleDownloadVersion}
          onDelete={(id) => deleteDocMutation.mutate(id)}
          onUploadVersion={(docId, file, changeNote) => uploadVersionMutation.mutate({ docId, file, changeNote })}
          isDeleting={deleteDocMutation.isPending}
          isUploadingVersion={uploadVersionMutation.isPending}
          onView={(id, name) => {
            setSelectedDoc(null);
            setDocumentToView({ id, name, mode: 'view' });
          }}
          onEdit={(id, name) => {
            setSelectedDoc(null);
            setDocumentToView({ id, name, mode: 'edit' });
          }}
          onViewCad={(id, name) => {
            setSelectedDoc(null);
            setCadDocToView({ id, name });
          }}
        />
      )}

      {renameTarget && (
        <RenameModal
          currentName={renameTarget.name}
          type={renameTarget.type}
          onSubmit={(newName) => {
            if (renameTarget.type === 'folder') {
              renameFolderMutation.mutate({ id: renameTarget.id, name: newName });
            } else {
              renameDocMutation.mutate({ id: renameTarget.id, name: newName });
            }
          }}
          onClose={() => setRenameTarget(null)}
          isPending={renameFolderMutation.isPending || renameDocMutation.isPending}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          type={deleteTarget.type}
          onConfirm={() => {
            if (deleteTarget.type === 'folder') {
              deleteFolderMutation.mutate(deleteTarget.id);
            } else {
              deleteDocMutation.mutate(deleteTarget.id);
            }
          }}
          onClose={() => setDeleteTarget(null)}
          isPending={deleteFolderMutation.isPending || deleteDocMutation.isPending}
        />
      )}

      {/* ONLYOFFICE Document Editor */}
      {documentToView && (
        <DocumentEditor
          documentId={documentToView.id}
          filename={documentToView.name}
          initialMode={documentToView.mode}
          onClose={() => {
            setDocumentToView(null);
            // Refresh folder data in case document was edited and saved
            if (currentFolderId) {
              queryClient.invalidateQueries({ queryKey: ['folder', currentFolderId] });
            }
          }}
        />
      )}

      {/* CAD Viewer */}
      {cadDocToView && (
        <CadViewer
          documentId={cadDocToView.id}
          filename={cadDocToView.name}
          onClose={() => setCadDocToView(null)}
        />
      )}

      {permissionsTarget && (
        <PermissionsModal
          resourceType={permissionsTarget.type}
          resourceId={permissionsTarget.id}
          resourceName={permissionsTarget.name}
          onClose={() => setPermissionsTarget(null)}
        />
      )}
    </div>
  );
}

/* ─── Helper: File type icon ─────────────────────────────── */

function FileIcon({ mimeType, large }: { mimeType: string; large?: boolean }) {
  const size = large ? 'w-10 h-10 mx-auto' : 'w-4 h-4 flex-shrink-0';

  if (mimeType.startsWith('image/')) {
    return <File className={`${size} text-green-500`} />;
  }
  if (mimeType.includes('pdf')) {
    return <FileText className={`${size} text-red-500`} />;
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return <FileText className={`${size} text-blue-500`} />;
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return <FileText className={`${size} text-green-600`} />;
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <FileText className={`${size} text-orange-500`} />;
  }
  return <File className={`${size} text-gray-400`} />;
}
