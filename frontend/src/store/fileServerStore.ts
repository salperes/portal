import { create } from 'zustand';
import { fileServerApi } from '../services/fileServerApi';
import type { FileItem, ShareItem } from '../services/fileServerApi';

interface FileServerState {
  // Data
  shares: ShareItem[];
  currentShare: string | null;
  currentPath: string;
  items: FileItem[];
  selectedItems: Set<string>;

  // Tree state
  treeData: Record<string, FileItem[]>; // key = "share:path", directory-only items
  expandedNodes: Set<string>; // key = "share:path"
  treeLoading: Set<string>; // nodes currently being loaded

  // UI State
  isLoading: boolean;
  error: string | null;
  viewMode: 'list' | 'grid';

  // Actions
  loadShares: () => Promise<void>;
  selectShare: (shareName: string) => Promise<void>;
  navigateTo: (path: string) => Promise<void>;
  navigateUp: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleSelectItem: (name: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  deleteSelected: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  uploadFiles: (files: FileList) => Promise<void>;
  downloadFile: (item: FileItem) => Promise<void>;

  // Tree actions
  expandNode: (share: string, path: string) => Promise<void>;
  collapseNode: (share: string, path: string) => void;
  toggleNode: (share: string, path: string) => Promise<void>;
}

export const useFileServerStore = create<FileServerState>((set, get) => ({
  // Initial state
  shares: [],
  currentShare: null,
  currentPath: '',
  items: [],
  selectedItems: new Set(),
  treeData: {},
  expandedNodes: new Set(),
  treeLoading: new Set(),
  isLoading: false,
  error: null,
  viewMode: 'list',

  loadShares: async () => {
    set({ isLoading: true, error: null });
    try {
      const shares = await fileServerApi.getShares();
      set({ shares, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Paylaşımlar yüklenirken hata oluştu';
      set({ error: message, isLoading: false });
    }
  },

  selectShare: async (shareName: string) => {
    set({ isLoading: true, error: null, currentShare: shareName, currentPath: '', selectedItems: new Set() });
    try {
      const result = await fileServerApi.browse(shareName, '');
      const dirs = result.items.filter((item) => item.isDirectory);
      const key = `${shareName}:`;
      const newTreeData = { ...get().treeData, [key]: dirs };
      const newExpanded = new Set([...get().expandedNodes, key]);
      set({ items: result.items, isLoading: false, treeData: newTreeData, expandedNodes: newExpanded });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Klasör içeriği yüklenirken hata oluştu';
      set({ error: message, isLoading: false, items: [] });
    }
  },

  navigateTo: async (path: string) => {
    const { currentShare } = get();
    if (!currentShare) return;

    set({ isLoading: true, error: null, selectedItems: new Set() });
    try {
      const result = await fileServerApi.browse(currentShare, path);

      // Cache directories in tree data
      const dirs = result.items.filter((item) => item.isDirectory);
      const key = `${currentShare}:${path}`;
      const newTreeData = { ...get().treeData, [key]: dirs };

      // Auto-expand all ancestor paths
      const newExpanded = new Set(get().expandedNodes);
      newExpanded.add(`${currentShare}:`); // share root
      const parts = path.split('/').filter(Boolean);
      let accumulated = '';
      for (const part of parts) {
        accumulated = accumulated ? `${accumulated}/${part}` : part;
        newExpanded.add(`${currentShare}:${accumulated}`);
      }

      set({ currentPath: path, items: result.items, isLoading: false, treeData: newTreeData, expandedNodes: newExpanded });

      // Lazy-load any uncached ancestors (fire-and-forget)
      for (const nodeKey of newExpanded) {
        if (!get().treeData[nodeKey]) {
          const colonIdx = nodeKey.indexOf(':');
          const share = nodeKey.substring(0, colonIdx);
          const nodePath = nodeKey.substring(colonIdx + 1);
          get().expandNode(share, nodePath);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Klasör içeriği yüklenirken hata oluştu';
      set({ error: message, isLoading: false });
    }
  },

  navigateUp: async () => {
    const { currentPath } = get();
    if (!currentPath) return;

    const parts = currentPath.split(/[/\\]/).filter(Boolean);
    parts.pop();
    const newPath = parts.join('/');

    await get().navigateTo(newPath);
  },

  refresh: async () => {
    const { currentShare, currentPath } = get();
    if (!currentShare) {
      await get().loadShares();
      return;
    }

    // Clear tree cache for current path so it re-fetches
    const key = `${currentShare}:${currentPath}`;
    const newTreeData = { ...get().treeData };
    delete newTreeData[key];
    set({ isLoading: true, error: null, treeData: newTreeData });

    try {
      const result = await fileServerApi.browse(currentShare, currentPath);
      const dirs = result.items.filter((item) => item.isDirectory);
      set({
        items: result.items,
        isLoading: false,
        treeData: { ...get().treeData, [key]: dirs },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Yenileme başarısız';
      set({ error: message, isLoading: false });
    }
  },

  toggleSelectItem: (name: string) => {
    const { selectedItems } = get();
    const newSelection = new Set(selectedItems);
    if (newSelection.has(name)) {
      newSelection.delete(name);
    } else {
      newSelection.add(name);
    }
    set({ selectedItems: newSelection });
  },

  selectAll: () => {
    const { items } = get();
    const allNames = new Set(items.map((item) => item.name));
    set({ selectedItems: allNames });
  },

  clearSelection: () => {
    set({ selectedItems: new Set() });
  },

  setViewMode: (mode: 'list' | 'grid') => {
    set({ viewMode: mode });
  },

  deleteSelected: async () => {
    const { currentShare, currentPath, items, selectedItems } = get();
    if (!currentShare || selectedItems.size === 0) return;

    set({ isLoading: true, error: null });
    try {
      for (const name of selectedItems) {
        const item = items.find((i) => i.name === name);
        if (item) {
          const fullPath = currentPath ? `${currentPath}/${name}` : name;
          await fileServerApi.delete(currentShare, fullPath, item.isDirectory);
        }
      }
      set({ selectedItems: new Set() });
      await get().refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Silme işlemi başarısız';
      set({ error: message, isLoading: false });
    }
  },

  createFolder: async (name: string) => {
    const { currentShare, currentPath } = get();
    if (!currentShare) return;

    set({ isLoading: true, error: null });
    try {
      const fullPath = currentPath ? `${currentPath}/${name}` : name;
      await fileServerApi.createFolder(currentShare, fullPath);
      await get().refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Klasör oluşturulamadı';
      set({ error: message, isLoading: false });
    }
  },

  uploadFiles: async (files: FileList) => {
    const { currentShare, currentPath } = get();
    if (!currentShare) return;

    set({ isLoading: true, error: null });
    try {
      for (let i = 0; i < files.length; i++) {
        await fileServerApi.upload(currentShare, currentPath, files[i]);
      }
      await get().refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Yükleme başarısız';
      set({ error: message, isLoading: false });
    }
  },

  downloadFile: async (item: FileItem) => {
    const { currentShare, currentPath } = get();
    if (!currentShare || item.isDirectory) return;

    try {
      const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      const blob = await fileServerApi.download(currentShare, fullPath);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'İndirme başarısız';
      set({ error: message });
    }
  },

  // Tree actions
  expandNode: async (share: string, path: string) => {
    const key = `${share}:${path}`;
    const { treeData, treeLoading } = get();

    // If already cached, just mark expanded
    if (treeData[key]) {
      set({ expandedNodes: new Set([...get().expandedNodes, key]) });
      return;
    }

    // Mark loading
    set({ treeLoading: new Set([...treeLoading, key]) });

    try {
      const result = await fileServerApi.browse(share, path);
      const dirs = result.items.filter((item) => item.isDirectory);
      const newTreeData = { ...get().treeData, [key]: dirs };
      const newExpanded = new Set([...get().expandedNodes, key]);
      const newLoading = new Set(get().treeLoading);
      newLoading.delete(key);
      set({ treeData: newTreeData, expandedNodes: newExpanded, treeLoading: newLoading });
    } catch {
      const newLoading = new Set(get().treeLoading);
      newLoading.delete(key);
      set({ treeLoading: newLoading });
    }
  },

  collapseNode: (share: string, path: string) => {
    const key = `${share}:${path}`;
    const newExpanded = new Set(get().expandedNodes);
    newExpanded.delete(key);
    set({ expandedNodes: newExpanded });
  },

  toggleNode: async (share: string, path: string) => {
    const key = `${share}:${path}`;
    if (get().expandedNodes.has(key)) {
      get().collapseNode(share, path);
    } else {
      await get().expandNode(share, path);
    }
  },
}));
