import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  activeTransformationId: string | null;
  setActiveTransformation: (id: string | null) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeTransformationId: null,
      setActiveTransformation: (id) => set({ activeTransformationId: id }),
    }),
    { name: 'narrflow-app' }
  )
);
