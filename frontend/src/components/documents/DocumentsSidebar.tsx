import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus, Loader2 } from 'lucide-react';
import type { FolderInfo } from '@portal/core';

interface DocumentsSidebarProps {
  folders: FolderInfo[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: () => void;
  onFolderContextMenu?: (e: React.MouseEvent, folderId: string) => void;
  isLoading: boolean;
}

export default function DocumentsSidebar({
  folders,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onFolderContextMenu,
  isLoading,
}: DocumentsSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedFolders);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedFolders(next);
  };

  const rootFolders = folders.filter((f) => !f.parentId);
  const getChildren = (parentId: string) => folders.filter((f) => f.parentId === parentId);

  const renderFolderItem = (folder: FolderInfo, depth = 0) => {
    const children = getChildren(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg mx-1 transition-colors ${
            isSelected
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => onSelectFolder(folder.id)}
          onContextMenu={(e) => {
            if (onFolderContextMenu) {
              e.preventDefault();
              e.stopPropagation();
              onFolderContextMenu(e, folder.id);
            }
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          {isSelected ? (
            <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          )}
          <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
        </div>
        {hasChildren &&
          isExpanded &&
          children.map((child) => renderFolderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Klasörler</span>
        <button
          onClick={onCreateFolder}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-blue-600"
          title="Yeni Klasör"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {/* Root (all files) */}
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg mx-1 transition-colors mb-1 ${
            currentFolderId === null
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          onClick={() => onSelectFolder(null)}
        >
          <span className="w-5" />
          <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-sm font-medium">Tüm Klasörler</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : rootFolders.length > 0 ? (
          rootFolders.map((f) => renderFolderItem(f))
        ) : (
          <p className="text-center text-gray-400 py-8 text-sm">Henüz klasör yok</p>
        )}
      </div>
    </div>
  );
}
