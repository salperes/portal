import { create } from 'zustand';
import { fileServerApi } from '../services/fileServerApi';
import { userSettingsApi } from '../services/userSettingsApi';
import type { FileItem, ShareItem } from '../services/fileServerApi';

interface FavoriteFolder {
  share: string;
  path: string;
  name: string; // display name (last segment or share name)
}

const FS_FAVORITES_KEY = 'fs-favorites'; // localStorage key for migration
const MAX_FAVORITES = 10;

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

  // Favorites
  favorites: FavoriteFolder[];

  // UI State
  isLoading: boolean;
  error: string | null;
  viewMode: 'list' | 'grid';
  showThumbnails: boolean;

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
  setShowThumbnails: (show: boolean) => void;
  deleteSelected: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  uploadFiles: (files: FileList) => Promise<void>;
  downloadFile: (item: FileItem) => Promise<void>;

  // Tree actions
  expandNode: (share: string, path: string) => Promise<void>;
  collapseNode: (share: string, path: string) => void;
  toggleNode: (share: string, path: string) => Promise<void>;

  // Favorite actions
  loadFavorites: () => Promise<void>;
  addFavorite: (share: string, path: string) => void;
  removeFavorite: (share: string, path: string) => void;
  isFavorite: (share: string, path: string) => boolean;
  expandFavorites: () => Promise<void>;
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
  favorites: [],
  isLoading: false,
  error: null,
  viewMode: 'list',
  showThumbnails: false,

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

  setShowThumbnails: (show: boolean) => {
    set({ showThumbnails: show });
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

  // Favorite actions
  loadFavorites: async () => {
    try {
      const settings = await userSettingsApi.getSettings();
      let favorites: FavoriteFolder[] = settings.fileServerFavorites || [];

      // Migrate from localStorage if DB is empty but localStorage has data
      if (favorites.length === 0) {
        try {
          const raw = localStorage.getItem(FS_FAVORITES_KEY);
          const localFavs: FavoriteFolder[] = raw ? JSON.parse(raw) : [];
          if (localFavs.length > 0) {
            favorites = localFavs;
            // Save to DB and clear localStorage
            await userSettingsApi.saveSettings({ ...settings, fileServerFavorites: favorites });
            localStorage.removeItem(FS_FAVORITES_KEY);
          }
        } catch { /* ignore localStorage errors */ }
      }

      set({ favorites });
    } catch {
      // Fallback: try localStorage if API fails (e.g. not logged in yet)
      try {
        const raw = localStorage.getItem(FS_FAVORITES_KEY);
        set({ favorites: raw ? JSON.parse(raw) : [] });
      } catch {
        set({ favorites: [] });
      }
    }
  },

  addFavorite: (share: string, path: string) => {
    const { favorites } = get();
    if (favorites.length >= MAX_FAVORITES) return;
    if (favorites.some(f => f.share === share && f.path === path)) return;
    const name = path ? path.split('/').filter(Boolean).pop() || share : share;
    const newFavorites = [...favorites, { share, path, name }];
    set({ favorites: newFavorites });
    // Save to server (fire-and-forget)
    userSettingsApi.getSettings().then(settings => {
      userSettingsApi.saveSettings({ ...settings, fileServerFavorites: newFavorites });
    }).catch(() => {});
  },

  removeFavorite: (share: string, path: string) => {
    const newFavorites = get().favorites.filter(f => !(f.share === share && f.path === path));
    set({ favorites: newFavorites });
    // Save to server (fire-and-forget)
    userSettingsApi.getSettings().then(settings => {
      userSettingsApi.saveSettings({ ...settings, fileServerFavorites: newFavorites });
    }).catch(() => {});
  },

  isFavorite: (share: string, path: string) => {
    return get().favorites.some(f => f.share === share && f.path === path);
  },

  expandFavorites: async () => {
    const { favorites } = get();
    if (favorites.length === 0) return;

    for (const fav of favorites) {
      // Expand share root
      await get().expandNode(fav.share, '');

      // Expand each ancestor path
      if (fav.path) {
        const parts = fav.path.split('/').filter(Boolean);
        let accumulated = '';
        for (const part of parts) {
          accumulated = accumulated ? `${accumulated}/${part}` : part;
          await get().expandNode(fav.share, accumulated);
        }
      }
    }
  },
}));
