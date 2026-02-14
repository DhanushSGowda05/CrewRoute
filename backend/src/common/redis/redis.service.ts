import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => console.log('✅ Redis connected'));
    this.client.on('error', (err) => console.error('❌ Redis error:', err.message));
  }

  onModuleDestroy() {
    this.client.quit();
  }

  // Basic operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Active ride state
  async setRideState(rideId: string, state: any): Promise<void> {
    await this.set(`ride:${rideId}:state`, JSON.stringify(state), 43200); // 12 hours
  }

  async getRideState(rideId: string): Promise<any | null> {
    const data = await this.get(`ride:${rideId}:state`);
    return data ? JSON.parse(data) : null;
  }

  async deleteRideState(rideId: string): Promise<void> {
    await this.del(`ride:${rideId}:state`);
  }

  // Location cache
  async setLocation(userId: string, rideId: string, location: any): Promise<void> {
    await this.set(
      `location:${userId}:${rideId}`,
      JSON.stringify(location),
      30, // 30 seconds TTL
    );
  }

  async getLocation(userId: string, rideId: string): Promise<any | null> {
    const data = await this.get(`location:${userId}:${rideId}`);
    return data ? JSON.parse(data) : null;
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, ttl: number): Promise<boolean> {
    const current = await this.client.incr(key);
    if (current === 1) {
      await this.client.expire(key, ttl);
    }
    return current <= limit;
  }

  // Ride code lookup cache
  async cacheRideCode(rideCode: string, rideId: string): Promise<void> {
    await this.set(`ridecode:${rideCode}`, rideId, 86400); // 24 hours
  }

  async getRideIdByCode(rideCode: string): Promise<string | null> {
    return this.get(`ridecode:${rideCode}`);
  }

  async deleteRideCode(rideCode: string): Promise<void> {
    await this.del(`ridecode:${rideCode}`);
  }

  // User online status
  async setUserOnline(userId: string): Promise<void> {
    await this.set(`user:${userId}:online`, 'true', 60); // 60 seconds
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return this.exists(`user:${userId}:online`);
  }

  // WebSocket session mapping
  async addSocketSession(userId: string, socketId: string): Promise<void> {
    await this.client.hset(`user:${userId}:sockets`, socketId, Date.now().toString());
    await this.client.expire(`user:${userId}:sockets`, 3600); // 1 hour
  }

  async removeSocketSession(userId: string, socketId: string): Promise<void> {
    await this.client.hdel(`user:${userId}:sockets`, socketId);
  }

  async getUserSockets(userId: string): Promise<string[]> {
    const sockets = await this.client.hgetall(`user:${userId}:sockets`);
    return Object.keys(sockets);
  }

  // Flush all (DANGER - dev only)
  async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot flush Redis in production');
    }
    await this.client.flushall();
  }
}