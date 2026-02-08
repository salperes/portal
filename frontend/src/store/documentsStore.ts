import { create } from 'zustand';

interface DocumentsUIState {
  currentFolderId: string | null;
  viewMode: 'list' | 'grid';
  selectedDocIds: Set<string>;
  searchQuery: string;

  setCurrentFolder: (id: string | null) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  toggleSelectDoc: (id: string) => void;
  selectAllDocs: (ids: string[]) => void;
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
}

export const useDocumentsStore = create<DocumentsUIState>((set, get) => ({
  currentFolderId: null,
  viewMode: 'list',
  selectedDocIds: new Set(),
  searchQuery: '',

  setCurrentFolder: (id) => set({ currentFolderId: id, selectedDocIds: new Set() }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSelectDoc: (id) => {
    const selected = new Set(get().selectedDocIds);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    set({ selectedDocIds: selected });
  },
  selectAllDocs: (ids) => set({ selectedDocIds: new Set(ids) }),
  clearSelection: () => set({ selectedDocIds: new Set() }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
