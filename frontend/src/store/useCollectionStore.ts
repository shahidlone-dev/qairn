// frontend/src/store/useCollectionStore.ts

import { create } from 'zustand';
import CollectionsApi, { ApiCollection } from '../api/collections.api';

interface CollectionState {
  collections: ApiCollection[];
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;
  
  // Actions
  fetchCollections: (force?: boolean) => Promise<void>;
  createNewCollection: (name: string, memberIds?: string[]) => Promise<ApiCollection>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  isLoading: false,
  hasFetched: false,
  error: null,

  fetchCollections: async (force = false) => {
    // If we've already fetched and aren't forcing, skip
    if (!force && get().hasFetched) return;

    set({ isLoading: true, error: null });
    try {
      const data = await CollectionsApi.getMyCollections();
      
      // Spreading into a new array ensures React sees the reference change and re-renders
      set({ 
        collections: [...(data || [])], 
        hasFetched: true, 
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, collections: [] });
    }
  },

  createNewCollection: async (name: string, memberIds: string[] = []) => {
    try {
      const newCollection = await CollectionsApi.createCollection(name, memberIds);
      
      set((state) => {
        const currentCollections = state.collections || [];
        
        // Find default "Saved" and separate from custom folders
        const defaultCol = currentCollections.find(c => c?.is_default);
        const others = currentCollections.filter(c => c && !c.is_default); 
        
        if (!newCollection) return { collections: currentCollections };

        return {
          collections: defaultCol 
            ? [defaultCol, newCollection, ...others]
            : [newCollection, ...others]
        };
      });

      return newCollection;
    } catch (err: any) {
      console.error('Store: createNewCollection failed', err);
      throw err;
    }
  }
}));