import { ChevronDown, ChevronRight, Folder, FolderOpen, Server, Loader2, RefreshCw } from 'lucide-react';
import type { FileItem, ShareItem } from '../../services/fileServerApi';

interface FileServerSidebarProps {
  shares: ShareItem[];
  currentShare: string | null;
  currentPath: string;
  treeData: Record<string, FileItem[]>;
  expandedNodes: Set<string>;
  treeLoading: Set<string>;
  onSelectNode: (share: string, path: string) => void;
  onToggleNode: (share: string, path: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function FileServerSidebar({
  shares,
  currentShare,
  currentPath,
  treeData,
  expandedNodes,
  treeLoading,
  onSelectNode,
  onToggleNode,
  onRefresh,
  isLoading,
}: FileServerSidebarProps) {
  const renderFolderNode = (share: string, item: FileItem, parentPath: string, depth: number) => {
    const nodePath = parentPath ? `${parentPath}/${item.name}` : item.name;
    const key = `${share}:${nodePath}`;
    const isExpanded = expandedNodes.has(key);
    const isNodeLoading = treeLoading.has(key);
    const isSelected = currentShare === share && currentPath === nodePath;
    const children = treeData[key] || [];
    const hasChildren = isExpanded ? children.length > 0 : true; // assume expandable until proven empty

    return (
      <div key={`${share}:${nodePath}`}>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg mx-1 transition-colors ${
            isSelected
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => onSelectNode(share, nodePath)}
        >
          {isNodeLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
          ) : hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleNode(share, nodePath);
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
          <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
        </div>
        {isExpanded &&
          children.map((child) => renderFolderNode(share, child, nodePath, depth + 1))}
      </div>
    );
  };

  const renderShareNode = (share: ShareItem) => {
    const key = `${share.name}:`;
    const isExpanded = expandedNodes.has(key);
    const isNodeLoading = treeLoading.has(key);
    const isSelected = currentShare === share.name && currentPath === '';
    const children = treeData[key] || [];

    return (
      <div key={share.name}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg mx-1 transition-colors ${
            isSelected
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          onClick={() => onSelectNode(share.name, '')}
        >
          {isNodeLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleNode(share.name, '');
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          <Server className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="flex-1 text-sm font-semibold truncate">{share.name}</span>
        </div>
        {isExpanded &&
          children.map((child) => renderFolderNode(share.name, child, '', 1))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paylaşımlar</span>
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-blue-600"
          title="Yenile"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && shares.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : shares.length > 0 ? (
          shares.map((share) => renderShareNode(share))
        ) : (
          <p className="text-center text-gray-400 py-8 text-sm">Paylaşım bulunamadı</p>
        )}
      </div>
    </div>
  );
}
