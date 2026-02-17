export const CONSTANTS = {
  // Location tracking
  LOCATION_UPDATE_INTERVAL: 5000, // 5 seconds
  LOCATION_ACCURACY: 'high' as const,
  
  // Ride
  MAX_PARTICIPANTS: 20,
  RIDE_CODE_LENGTH: 6,
  
  // WebSocket
  WS_RECONNECT_DELAY: 3000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  
  // Map
  DEFAULT_ZOOM: 15,
  DEFAULT_LATITUDE: 12.9716,
  DEFAULT_LONGITUDE: 77.5946,
  
  // Cache
  CACHE_KEYS: {
    USER: '@crewroute/user',
    TOKEN: '@crewroute/token',
    RIDE_STATE: '@crewroute/ride_state',
    CURRENT_RIDE: '@crewroute/current_ride',
  },
};