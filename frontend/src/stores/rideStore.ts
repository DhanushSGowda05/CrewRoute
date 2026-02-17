import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ride, Participant } from '../types';
import { CONSTANTS } from '../config';

export type RideState = 'NONE' | 'WAITING' | 'ACTIVE' | 'ENDED';

interface RideStore {
  // State
  rideState: RideState;
  currentRide: Ride | null;
  participants: Participant[];
  myRole: 'owner' | 'participant' | null;

  // Actions
  setRideState: (state: RideState) => void;
  setCurrentRide: (ride: Ride) => void;
  setParticipants: (participants: Participant[]) => void;
  setMyRole: (role: 'owner' | 'participant') => void;

  // Lifecycle actions
  createRide: (ride: Ride) => Promise<void>;
  joinRide: (ride: Ride, participants: Participant[]) => Promise<void>;
  startRide: () => void;
  completeRide: () => void;
  leaveRide: () => Promise<void>;
  clearRide: () => Promise<void>;

  // Computed
  isOwner: () => boolean;
  canStartRide: () => boolean;
  canEndRide: () => boolean;
  
  // Persistence
  loadRideState: () => Promise<void>;
}

export const useRideStore = create<RideStore>((set, get) => ({
  // Initial state
  rideState: 'NONE',
  currentRide: null,
  participants: [],
  myRole: null,

  // Set ride state
  setRideState: (rideState) => {
    set({ rideState });
    AsyncStorage.setItem(CONSTANTS.CACHE_KEYS.RIDE_STATE, rideState);
  },

  // Set current ride
  setCurrentRide: (currentRide) => {
    set({ currentRide });
    AsyncStorage.setItem(CONSTANTS.CACHE_KEYS.CURRENT_RIDE, JSON.stringify(currentRide));
  },

  // Set participants
  setParticipants: (participants) => set({ participants }),

  // Set my role
  setMyRole: (myRole) => set({ myRole }),

  // NONE → WAITING (Create ride)
  createRide: async (ride) => {
    set({
      rideState: 'WAITING',
      currentRide: ride,
      myRole: 'owner',
    });
    await AsyncStorage.setItem(CONSTANTS.CACHE_KEYS.RIDE_STATE, 'WAITING');
    await AsyncStorage.setItem(CONSTANTS.CACHE_KEYS.CURRENT_RIDE, JSON.stringify(ride));
  },

  // NONE → WAITING (Join ride)
  joinRide: async (ride, participants) => {
    set({
      rideState: 'WAITING',
      currentRide: ride,
      participants,
      myRole: 'participant',
    });
    await AsyncStorage.setItem(CONSTANTS.CACHE_KEYS.RIDE_STATE, 'WAITING');
    await AsyncStorage.setItem(CONSTANTS.CACHE_KEYS.CURRENT_RIDE, JSON.stringify(ride));
  },

  // WAITING → ACTIVE (Start ride)
  startRide: () => {
    const { currentRide } = get();
    if (currentRide) {
      set({
        rideState: 'ACTIVE',
        currentRide: {
          ...currentRide,
          status: 'ACTIVE',
          startedAt: new Date().toISOString(),
        },
      });
      AsyncStorage.setItem(CONSTANTS.CACHE_KEYS.RIDE_STATE, 'ACTIVE');
    }
  },

  // ACTIVE → ENDED (Complete ride)
  completeRide: () => {
    const { currentRide } = get();
    if (currentRide) {
      set({
        rideState: 'ENDED',
        currentRide: {
          ...currentRide,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        },
      });
      AsyncStorage.setItem(CONSTANTS.CACHE_KEYS.RIDE_STATE, 'ENDED');
    }
  },

  // ANY → NONE (Leave ride)
  leaveRide: async () => {
    set({
      rideState: 'NONE',
      currentRide: null,
      participants: [],
      myRole: null,
    });
    await AsyncStorage.removeItem(CONSTANTS.CACHE_KEYS.RIDE_STATE);
    await AsyncStorage.removeItem(CONSTANTS.CACHE_KEYS.CURRENT_RIDE);
  },

  // Clear ride (after viewing summary)
  clearRide: async () => {
    set({
      rideState: 'NONE',
      currentRide: null,
      participants: [],
      myRole: null,
    });
    await AsyncStorage.removeItem(CONSTANTS.CACHE_KEYS.RIDE_STATE);
    await AsyncStorage.removeItem(CONSTANTS.CACHE_KEYS.CURRENT_RIDE);
  },

  // Computed: Is owner?
  isOwner: () => {
    return get().myRole === 'owner';
  },

  // Computed: Can start ride?
  canStartRide: () => {
    const { rideState, myRole } = get();
    return rideState === 'WAITING' && myRole === 'owner';
  },

  // Computed: Can end ride?
  canEndRide: () => {
    const { rideState, myRole } = get();
    return rideState === 'ACTIVE' && myRole === 'owner';
  },

  // Load ride state from storage
  loadRideState: async () => {
    try {
      const rideState = await AsyncStorage.getItem(CONSTANTS.CACHE_KEYS.RIDE_STATE);
      const currentRideStr = await AsyncStorage.getItem(CONSTANTS.CACHE_KEYS.CURRENT_RIDE);

      if (rideState && currentRideStr) {
        const currentRide = JSON.parse(currentRideStr);
        set({
          rideState: rideState as RideState,
          currentRide,
        });
      }
    } catch (error) {
      console.error('Load ride state error:', error);
    }
  },
}));