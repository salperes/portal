import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Folder,
  File,
  Download,
  Trash2,
  Upload,
  FolderPlus,
  RefreshCw,
  ChevronRight,
  Home,
  LayoutGrid,
  List,
  Server,
  ArrowLeft,
  Check,
  X,
  Eye,
  FileText,
  Scan,
  Edit,
  Pen,
} from 'lucide-react';
import { useFileServerStore } from '../store/fileServerStore';
import { formatFileSize, canOpenWithOnlyOffice, canEditWithOnlyOffice, canOpenWithXRayViewer, canOpenWithCadViewer, fileServerApi } from '../services/fileServerApi';
import type { FileItem } from '../services/fileServerApi';
import DocumentViewer from '../components/DocumentViewer';
import DocumentViewerErrorBoundary from '../components/DocumentViewerErrorBoundary';
import { XRayViewer } from '../components/documents/XRayViewer';
import { CadViewer } from '../components/documents/CadViewer';

export default function FileServer() {
  const {
    shares,
    currentShare,
    currentPath,
    items,
    selectedItems,
    isLoading,
    error,
    viewMode,
    loadShares,
    selectShare,
    navigateTo,
    navigateUp,
    refresh,
    toggleSelectItem,
    selectAll,
    clearSelection,
    setViewMode,
    deleteSelected,
    createFolder,
    uploadFiles,
    downloadFile,
  } = useFileServerStore();

  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [documentToView, setDocumentToView] = useState<{ share: string; path: string; filename: string } | null>(null);
  const [xrayDocToView, setXrayDocToView] = useState<{ share: string; path: string; filename: string } | null>(null);
  const [cadDocToView, setCadDocToView] = useState<{ share: string; path: string; filename: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ item: FileItem; x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        uploadFiles(files);
      }
    },
    [uploadFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderInput(false);
    }
  };

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      navigateTo(newPath);
    }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (!item.isDirectory) {
      if (canOpenWithXRayViewer(item.extension)) {
        openXRayViewer(item);
      } else if (canOpenWithCadViewer(item.extension)) {
        openCadViewer(item);
      } else if (canOpenWithOnlyOffice(item.extension)) {
        openDocumentViewer(item);
      } else {
        downloadFile(item);
      }
    }
  };

  const openDocumentViewer = (item: FileItem, mode?: 'view' | 'edit') => {
    const filePath = currentPath ? `${currentPath}/${item.name}` : item.name;
    setDocumentToView({
      share: currentShare || '',
      path: filePath,
      filename: item.name,
    });
  };

  const closeDocumentViewer = () => {
    setDocumentToView(null);
  };

  const openXRayViewer = (item: FileItem) => {
    const filePath = currentPath ? `${currentPath}/${item.name}` : item.name;
    setXrayDocToView({
      share: currentShare || '',
      path: filePath,
      filename: item.name,
    });
  };

  const openCadViewer = (item: FileItem) => {
    const filePath = currentPath ? `${currentPath}/${item.name}` : item.name;
    setCadDocToView({
      share: currentShare || '',
      path: filePath,
      filename: item.name,
    });
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ item, x: e.clientX, y: e.clientY });
  };

  const handleDeleteItem = async (item: FileItem) => {
    const path = currentPath ? `${currentPath}/${item.name}` : item.name;
    if (currentShare) {
      await fileServerApi.delete(currentShare, path, item.isDirectory);
      refresh();
    }
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  const breadcrumbs = currentPath ? currentPath.split(/[/\\]/).filter(Boolean) : [];

  // Share selection view
  if (!currentShare) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Server className="text-blue-600" />
            Dosya Sunucusu
          </h1>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <RefreshCw className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Erişilebilir paylaşım bulunamadı.</p>
            <p className="text-sm mt-2">Dosya sunucusuna erişim yetkinizi kontrol edin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {shares.map((share) => (
              <button
                key={share.name}
                onClick={() => selectShare(share.name)}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all text-center group"
              >
                <Folder className="w-12 h-12 mx-auto mb-2 text-yellow-500 group-hover:text-yellow-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate block">
                  {share.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // File browser view
  return (
    <div
      className="p-6 min-h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-blue-500/20 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl">
            <Upload className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Dosyaları buraya bırakın
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => useFileServerStore.setState({ currentShare: null, currentPath: '', items: [] })}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            title="Paylaşımlara dön"
          >
            <Home />
          </button>
          {currentPath && (
            <button
              onClick={navigateUp}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="Üst klasör"
            >
              <ArrowLeft />
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Upload size={16} />
            Yükle
          </button>
          <button
            onClick={() => setShowNewFolderInput(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            <FolderPlus size={16} />
            Yeni Klasör
          </button>
          {selectedItems.size > 0 && (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm"
            >
              <Trash2 size={16} />
              Sil ({selectedItems.size})
            </button>
          )}
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-2" />
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <List />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <LayoutGrid />
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <RefreshCw className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 text-sm text-gray-600 dark:text-gray-300 overflow-x-auto">
        <button
          onClick={() => navigateTo('')}
          className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
        >
          <Server />
          {currentShare}
        </button>
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center">
            <ChevronRight className="mx-1" />
            <button
              onClick={() => navigateTo(breadcrumbs.slice(0, index + 1).join('/'))}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {crumb}
            </button>
          </span>
        ))}
      </div>

      {/* New folder input */}
      {showNewFolderInput && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Klasör adı"
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleCreateFolder}
            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Check />
          </button>
          <button
            onClick={() => {
              setShowNewFolderInput(false);
              setNewFolderName('');
            }}
            className="p-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <X />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Bu klasör boş</p>
        </div>
      )}

      {/* File list */}
      {!isLoading && items.length > 0 && viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={selectedItems.size === items.length && items.length > 0}
                onChange={() => (selectedItems.size === items.length ? clearSelection() : selectAll())}
                className="rounded"
              />
            </div>
            <div className="col-span-5">Ad</div>
            <div className="col-span-2">Boyut</div>
            <div className="col-span-3">Değiştirilme</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items */}
          {items.map((item) => (
            <div
              key={item.name}
              className={`grid grid-cols-12 gap-4 px-4 py-2 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                selectedItems.has(item.name) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => handleItemClick(item)}
              onDoubleClick={() => handleItemDoubleClick(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.name)}
                  onChange={() => toggleSelectItem(item.name)}
                  className="rounded"
                />
              </div>
              <div className="col-span-5 flex items-center gap-2 truncate">
                {item.isDirectory ? (
                  <Folder className="text-yellow-500 flex-shrink-0" />
                ) : canOpenWithXRayViewer(item.extension) ? (
                  <Scan className="text-cyan-500 flex-shrink-0" />
                ) : canOpenWithCadViewer(item.extension) ? (
                  <Pen className="text-purple-500 flex-shrink-0" />
                ) : (
                  <File className="text-gray-400 flex-shrink-0" />
                )}
                <span className="truncate text-gray-900 dark:text-white">{item.name}</span>
              </div>
              <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
                {item.isDirectory ? '-' : formatFileSize(item.size)}
              </div>
              <div className="col-span-3 text-sm text-gray-500 dark:text-gray-400">
                {new Date(item.modifiedAt).toLocaleString('tr-TR')}
              </div>
              <div className="col-span-1 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {!item.isDirectory && canOpenWithXRayViewer(item.extension) && (
                  <button
                    onClick={() => openXRayViewer(item)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-cyan-600 dark:text-cyan-400"
                    title="X-Ray Viewer"
                  >
                    <Scan size={16} />
                  </button>
                )}
                {!item.isDirectory && canOpenWithCadViewer(item.extension) && (
                  <button
                    onClick={() => openCadViewer(item)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-purple-600 dark:text-purple-400"
                    title="CAD Viewer"
                  >
                    <Eye size={16} />
                  </button>
                )}
                {!item.isDirectory && canOpenWithOnlyOffice(item.extension) && (
                  <button
                    onClick={() => openDocumentViewer(item)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-blue-600 dark:text-blue-400"
                    title="Görüntüle"
                  >
                    <Eye size={16} />
                  </button>
                )}
                {!item.isDirectory && (
                  <button
                    onClick={() => downloadFile(item)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    title="İndir"
                  >
                    <Download size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid view */}
      {!isLoading && items.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {items.map((item) => {
            const canPreview = !item.isDirectory && (canOpenWithXRayViewer(item.extension) || canOpenWithCadViewer(item.extension) || canOpenWithOnlyOffice(item.extension));
            return (
              <div
                key={item.name}
                className={`relative p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all text-center cursor-pointer group ${
                  selectedItems.has(item.name) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => handleItemClick(item)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
              >
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.name)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectItem(item.name);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded"
                  />
                </div>
                {/* Hover action buttons */}
                {!item.isDirectory && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {canPreview && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canOpenWithXRayViewer(item.extension)) openXRayViewer(item);
                          else if (canOpenWithCadViewer(item.extension)) openCadViewer(item);
                          else openDocumentViewer(item);
                        }}
                        className={`p-1 text-white rounded ${
                          canOpenWithXRayViewer(item.extension) ? 'bg-cyan-600 hover:bg-cyan-700'
                          : canOpenWithCadViewer(item.extension) ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        title={
                          canOpenWithXRayViewer(item.extension) ? 'X-Ray Viewer'
                          : canOpenWithCadViewer(item.extension) ? 'CAD Viewer'
                          : 'Görüntüle'
                        }
                      >
                        {canOpenWithXRayViewer(item.extension) ? <Scan size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(item);
                      }}
                      className="p-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
                      title="İndir"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                )}
                {item.isDirectory ? (
                  <Folder className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                ) : canOpenWithXRayViewer(item.extension) ? (
                  <Scan className="w-12 h-12 mx-auto mb-2 text-cyan-500" />
                ) : canOpenWithCadViewer(item.extension) ? (
                  <Pen className="w-12 h-12 mx-auto mb-2 text-purple-500" />
                ) : canOpenWithOnlyOffice(item.extension) ? (
                  <FileText className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                ) : (
                  <File className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-200 truncate block" title={item.name}>
                  {item.name}
                </span>
                {!item.isDirectory && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(item.size)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {documentToView && (
        <DocumentViewerErrorBoundary onReset={closeDocumentViewer}>
          <DocumentViewer
            share={documentToView.share}
            path={documentToView.path}
            filename={documentToView.filename}
            onClose={closeDocumentViewer}
          />
        </DocumentViewerErrorBoundary>
      )}

      {/* X-Ray Viewer Modal */}
      {xrayDocToView && (
        <XRayViewer
          filename={xrayDocToView.filename}
          onClose={() => setXrayDocToView(null)}
          getBuffer={async () => {
            const blob = await fileServerApi.download(xrayDocToView.share, xrayDocToView.path);
            return blob.arrayBuffer();
          }}
          onDownload={async () => {
            const blob = await fileServerApi.download(xrayDocToView.share, xrayDocToView.path);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = xrayDocToView.filename;
            link.click();
            URL.revokeObjectURL(url);
          }}
        />
      )}

      {/* CAD Viewer Modal */}
      {cadDocToView && (
        <CadViewer
          filename={cadDocToView.filename}
          onClose={() => setCadDocToView(null)}
          getBuffer={async () => {
            const blob = await fileServerApi.download(cadDocToView.share, cadDocToView.path);
            return blob.arrayBuffer();
          }}
          onDownload={async () => {
            const blob = await fileServerApi.download(cadDocToView.share, cadDocToView.path);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = cadDocToView.filename;
            link.click();
            URL.revokeObjectURL(url);
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 300),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item.isDirectory ? (
            <>
              <button
                onClick={() => {
                  handleItemClick(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Folder className="w-4 h-4 text-yellow-500" />
                Aç
              </button>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => {
                  handleDeleteItem(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
                Sil
              </button>
            </>
          ) : (
            <>
              {/* Preview options */}
              {canOpenWithXRayViewer(contextMenu.item.extension) && (
                <button
                  onClick={() => {
                    openXRayViewer(contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Scan className="w-4 h-4 text-cyan-600" />
                  Görüntüle (X-Ray)
                </button>
              )}
              {canOpenWithCadViewer(contextMenu.item.extension) && (
                <button
                  onClick={() => {
                    openCadViewer(contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4 text-purple-600" />
                  Görüntüle (CAD)
                </button>
              )}
              {canOpenWithOnlyOffice(contextMenu.item.extension) && (
                <button
                  onClick={() => {
                    openDocumentViewer(contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4 text-blue-600" />
                  Görüntüle
                </button>
              )}
              {canEditWithOnlyOffice(contextMenu.item.extension) && (
                <button
                  onClick={() => {
                    openDocumentViewer(contextMenu.item, 'edit');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4 text-orange-500" />
                  Düzenle
                </button>
              )}
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => {
                  downloadFile(contextMenu.item);
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
                  handleDeleteItem(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
                Sil
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
