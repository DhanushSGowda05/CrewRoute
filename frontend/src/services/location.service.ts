import * as Location from 'expo-location';
import { CONSTANTS } from '../config/constants';
import { LocationUpdate } from '../types';
import { socketService } from './socket.service';

class LocationService {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isTracking = false;

    /**
     * Request location permissions
     */
    async requestPermissions(): Promise<boolean> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('Permission request error:', error);
            return false;
        }
    }

    /**
     * Get current location once
     */
    async getCurrentLocation(): Promise<Location.LocationObject | null> {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            return location;
        } catch (error) {
            console.error('Get location error:', error);
            return null;
        }
    }

    /**
     * Start tracking location
     */
    async startTracking(rideId: string, onLocationUpdate?: (location: Location.LocationObject) => void) {
        if (this.isTracking) {
            console.log('Already tracking location');
            return;
        }

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            console.error('Location permission denied');
            return;
        }

        this.isTracking = true;

        // Send location updates every 5 seconds
        this.intervalId = setInterval(async () => {
            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                const locationUpdate: LocationUpdate = {
                    rideId,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    speed: location.coords.speed || undefined,
                    heading: location.coords.heading || undefined,
                    accuracy: location.coords.accuracy || undefined,
                    timestamp: location.timestamp,
                };

                // Send to backend via WebSocket
                socketService.sendLocationUpdate(locationUpdate);

                // Call callback if provided
                if (onLocationUpdate) {
                    onLocationUpdate(location);
                }
            } catch (error) {
                console.error('Location update error:', error);
            }
        }, CONSTANTS.LOCATION_UPDATE_INTERVAL);

        console.log('✅ Started location tracking');
    }

    /**
     * Stop tracking location
     */
    stopTracking() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isTracking = false;
        console.log('❌ Stopped location tracking');
    }

    /**
     * Check if currently tracking
     */
    getIsTracking(): boolean {
        return this.isTracking;
    }
}

export const locationService = new LocationService();