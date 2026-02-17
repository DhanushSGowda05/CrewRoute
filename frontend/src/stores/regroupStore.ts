import { create } from 'zustand';
import { RegroupPoint } from '../types';

interface RegroupStore {
  // State
  regroupPoints: RegroupPoint[];

  // Actions
  addRegroupPoint: (point: RegroupPoint) => void;
  updateRegroupPoint: (pointId: string, updates: Partial<RegroupPoint>) => void;
  removeRegroupPoint: (pointId: string) => void;
  clearRegroupPoints: () => void;
}

export const useRegroupStore = create<RegroupStore>((set) => ({
  // Initial state
  regroupPoints: [],

  // Add regroup point
  addRegroupPoint: (point) =>
    set((state) => ({
      regroupPoints: [...state.regroupPoints, point],
    })),

  // Update regroup point
  updateRegroupPoint: (pointId, updates) =>
    set((state) => ({
      regroupPoints: state.regroupPoints.map((p) =>
        p.id === pointId ? { ...p, ...updates } : p
      ),
    })),

  // Remove regroup point
  removeRegroupPoint: (pointId) =>
    set((state) => ({
      regroupPoints: state.regroupPoints.filter((p) => p.id !== pointId),
    })),

  // Clear all regroup points
  clearRegroupPoints: () => set({ regroupPoints: [] }),
}));