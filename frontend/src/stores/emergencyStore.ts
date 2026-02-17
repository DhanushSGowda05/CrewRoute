import { create } from 'zustand';
import { EmergencyAlert } from '../types';

interface EmergencyStore {
  // State
  activeAlerts: EmergencyAlert[];

  // Actions
  addAlert: (alert: EmergencyAlert) => void;
  removeAlert: (alertId: string) => void;
  clearAlerts: () => void;
}

export const useEmergencyStore = create<EmergencyStore>((set) => ({
  // Initial state
  activeAlerts: [],

  // Add alert
  addAlert: (alert) =>
    set((state) => ({
      activeAlerts: [...state.activeAlerts, alert],
    })),

  // Remove alert
  removeAlert: (alertId) =>
    set((state) => ({
      activeAlerts: state.activeAlerts.filter((a) => a.id !== alertId),
    })),

  // Clear all alerts
  clearAlerts: () => set({ activeAlerts: [] }),
}));