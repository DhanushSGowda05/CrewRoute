import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LocationUpdateDto } from './dto/location-update.dto';

@Injectable()
export class LocationsService {
  private updateCounters = new Map<string, number>(); // Track update count per user

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Process location update from WebSocket
   */
  async processLocationUpdate(userId: string, dto: LocationUpdateDto) {
    const { rideId, latitude, longitude, speed, heading, accuracy, timestamp } = dto;

    // 1. Validate coordinates
    if (!this.isValidCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates');
    }

    // 2. Check rate limit (100 updates per minute per user)
    const rateLimitKey = `ratelimit:location:${userId}`;
    const allowed = await this.redis.checkRateLimit(rateLimitKey, 100, 60);
    
    if (!allowed) {
      throw new Error('Rate limit exceeded');
    }

    // 3. Cache in Redis (30 second TTL for hot data)
    const locationData = {
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      accuracy: accuracy || 0,
      timestamp: timestamp || Date.now(),
    };

    await this.redis.setLocation(userId, rideId, locationData);

    // 4. Persist to database (every 10th update to save storage)
    const userKey = `${userId}:${rideId}`;
    const currentCount = this.updateCounters.get(userKey) || 0;
    const newCount = currentCount + 1;
    this.updateCounters.set(userKey, newCount);

    if (newCount % 10 === 0) {
      // Save to database
      await this.saveLocationToDatabase(userId, rideId, locationData);
    }

    return locationData;
  }

  /**
   * Save location to PostgreSQL
   */
  private async saveLocationToDatabase(
    userId: string,
    rideId: string,
    locationData: any,
  ) {
    try {
      await this.prisma.locationUpdate.create({
        data: {
          userId,
          rideId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          speed: locationData.speed,
          heading: locationData.heading,
          accuracy: locationData.accuracy,
        },
      });
    } catch (error) {
    let  errormessage= error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to save location to database:', errormessage);
      // Don't throw - location caching in Redis is more important
    }
  }

  /**
   * Get location history for a ride
   */
  async getLocationHistory(rideId: string, limit: number = 1000, offset: number = 0) {
    const locations = await this.prisma.locationUpdate.findMany({
      where: { rideId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return locations.map((loc) => ({
      userId: loc.user.id,
      username: loc.user.username,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      speed: loc.speed ? Number(loc.speed) : null,
      heading: loc.heading ? Number(loc.heading) : null,
      accuracy: loc.accuracy ? Number(loc.accuracy) : null,
      timestamp: loc.timestamp,
    }));
  }

  /**
   * Get latest location for all riders in a ride (from Redis)
   */
  async getLatestLocations(rideId: string, userIds: string[]) {
    const locations : any[] = [];

    for (const userId of userIds) {
      const location = await this.redis.getLocation(userId, rideId);
      if (location) {
        locations.push({
          userId,
          ...JSON.parse(location),
        });
      }
    }

    return locations;
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Clean up update counters when ride completes
   */
  async cleanupRideCounters(rideId: string, userIds: string[]) {
    for (const userId of userIds) {
      const key = `${userId}:${rideId}`;
      this.updateCounters.delete(key);
    }
  }
}