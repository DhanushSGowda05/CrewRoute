import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import { CONSTANTS } from '../config/constants';
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
  async connect() {
    try {
      const token = await AsyncStorage.getItem(CONSTANTS.CACHE_KEYS.TOKEN);
      
      if (!token) {
        console.error('No token found for WebSocket connection');
        return;
      }

      this.socket = io(API_CONFIG.WS_URL, {
        auth: {
          token: token.replace('Bearer ', ''),
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: CONSTANTS.WS_RECONNECT_DELAY || 3000,
        reconnectionAttempts: CONSTANTS.WS_MAX_RECONNECT_ATTEMPTS || 5,
      });

      this.setupEventListeners();
      
      console.log('WebSocket connecting...');
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
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