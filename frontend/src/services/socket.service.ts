import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import { CONSTANTS } from '../config/constants';
import { useAuthStore } from '../stores';

const WS_URL = API_CONFIG.WS_URL;
import {
  LocationUpdate,
  RiderLocation,
  UserJoinedEvent,
  UserLeftEvent,
  RideStartedEvent,
  RideCompletedEvent,
  SOSTriggeredEvent,
  ForcedLeaveEvent,
} from '../types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('✅ Socket already connected');
      return;
    }

    // ✅ Get token using the stored getFreshToken function
    const { token, getFreshToken } = useAuthStore.getState();

    let authToken = token;

    // Try to get fresh token from Clerk
    if (getFreshToken) {
      try {
        const freshToken = await getFreshToken();
        if (freshToken) {
          authToken = freshToken;
          console.log('🔄 Got fresh token for WebSocket');
        }
      } catch (err) {
        console.warn('⚠️ Could not get fresh token, using stored token');
      }
    }

    if (!authToken) {
      console.error('❌ No token found for WebSocket connection');
      return;
    }

    console.log('🔌 Connecting to WebSocket...');
    console.log('Token:', authToken.substring(0, 20) + '...');

    this.socket = io(WS_URL, {
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // ✅ Refresh token on reconnect attempts
    this.socket.io.on('reconnect_attempt', async () => {
      console.log('🔄 Reconnecting WebSocket with fresh token...');
      const { getFreshToken } = useAuthStore.getState();
      if (getFreshToken) {
        try {
          const freshToken = await getFreshToken();
          if (freshToken && this.socket) {
            this.socket.auth = { token: freshToken };
          }
        } catch (err) {
          console.warn('Could not refresh token for reconnect');
        }
      }
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);

      // Auto-reconnect if session expired
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('🔄 Attempting to reconnect...');
        setTimeout(() => this.connect(), 1000);
      }
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  /**
   * Setup default event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error.message);
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected manually');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // ==================== EMIT EVENTS ====================

  /**
   * Join a ride room
   */
  joinRide(rideId: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('joinRide', { rideId });
    console.log('📤 Emitted: joinRide', rideId);
  }

  /**
   * Leave a ride room
   */
  leaveRide(rideId: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('leaveRide', { rideId });
    console.log('📤 Emitted: leaveRide', rideId);
  }

  /**
   * Send location update
   */
  sendLocationUpdate(data: LocationUpdate) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('locationUpdate', data);
    // Don't log every location update (too verbose)
  }

  // ==================== LISTEN TO EVENTS ====================

  /**
   * Listen for connection acknowledgment
   */
  onConnected(callback: (data: { userId: string; username: string }) => void) {
    if (!this.socket) return;
    this.socket.on('connected', callback);
  }

  /**
   * Listen for joined ride acknowledgment
   */
  onJoinedRide(callback: (data: { rideId: string }) => void) {
    if (!this.socket) return;
    this.socket.on('joinedRide', callback);
  }

  /**
   * Listen for left ride acknowledgment
   */
  onLeftRide(callback: (data: { rideId: string }) => void) {
    if (!this.socket) return;
    this.socket.on('leftRide', callback);
  }

  /**
   * Listen for user joined
   */
  onUserJoined(callback: (data: UserJoinedEvent) => void) {
    if (!this.socket) return;
    this.socket.on('userJoined', callback);
  }

  /**
   * Listen for user left
   */
  onUserLeft(callback: (data: UserLeftEvent) => void) {
    if (!this.socket) return;
    this.socket.on('userLeft', callback);
  }

  /**
   * Listen for rider location updates
   */
  onRiderLocation(callback: (data: RiderLocation) => void) {
    if (!this.socket) return;
    this.socket.on('riderLocation', callback);
  }

  /**
   * Listen for location update acknowledgment
   */
  onLocationUpdateAck(callback: (data: { success: boolean; timestamp: number }) => void) {
    if (!this.socket) return;
    this.socket.on('locationUpdateAck', callback);
  }

  /**
   * Listen for ride started
   */
  onRideStarted(callback: (data: RideStartedEvent) => void) {
    if (!this.socket) return;
    this.socket.on('rideStarted', callback);
  }

  /**
   * Listen for ride completed
   */
  onRideCompleted(callback: (data: RideCompletedEvent) => void) {
    if (!this.socket) return;
    this.socket.on('rideCompleted', callback);
  }

  /**
   * Listen for SOS alert
   */
  onSOSTriggered(callback: (data: SOSTriggeredEvent) => void) {
    if (!this.socket) return;
    this.socket.on('sosTriggered', callback);
  }

  /**
   * Listen for forced leave (kicked from ride)
   */
  onForcedLeave(callback: (data: ForcedLeaveEvent) => void) {
    if (!this.socket) return;
    this.socket.on('forcedLeaveRide', callback);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }

  /**
   * Remove specific listener
   */
  off(event: string) {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

export const socketService = new SocketService();