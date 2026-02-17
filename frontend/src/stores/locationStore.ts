import { create } from 'zustand';
import { RiderLocation } from '../types';

interface LocationStore {
  // State
  myLocation: { latitude: number; longitude: number } | null;
  riderLocations: Map<string, RiderLocation>;
  isTracking: boolean;

  // Actions
  setMyLocation: (location: { latitude: number; longitude: number }) => void;
  updateRiderLocation: (userId: string, location: RiderLocation) => void;
  removeRiderLocation: (userId: string) => void;
  clearRiderLocations: () => void;
  setIsTracking: (isTracking: boolean) => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  // Initial state
  myLocation: null,
  riderLocations: new Map(),
  isTracking: false,

  // Set my location
  setMyLocation: (location) => set({ myLocation: location }),

  // Update rider location
  updateRiderLocation: (userId, location) =>
    set((state) => {
      const newMap = new Map(state.riderLocations);
      newMap.set(userId, location);
      return { riderLocations: newMap };
    }),

  // Remove rider location
  removeRiderLocation: (userId) =>
    set((state) => {
      const newMap = new Map(state.riderLocations);
      newMap.delete(userId);
      return { riderLocations: newMap };
    }),

  // Clear all rider locations
  clearRiderLocations: () => set({ riderLocations: new Map() }),

  // Set tracking status
  setIsTracking: (isTracking) => set({ isTracking }),
}));