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
        if (times > 10) {
          console.error('❌ Redis connection failed after 10 retries');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    this.client.on('connect', () => console.log('✅ Redis connected'));
    this.client.on('ready', () => console.log('✅ Redis ready'));
    this.client.on('error', (err) => console.error('❌ Redis error:', err.message));
    this.client.on('close', () => console.warn('⚠️ Redis connection closed'));
    this.client.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));
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

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
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

  // Location cache - FIXED: Returns string consistently
  async setLocation(userId: string, rideId: string, location: any, isActive = true): Promise<void> {
    const ttl = isActive ? 300 : 30; // 5 minutes for active rides
    await this.set(
      `location:${userId}:${rideId}`,
      JSON.stringify(location),
      ttl,
    );
  }

  async getLocation(userId: string, rideId: string): Promise<string | null> {
    return this.get(`location:${userId}:${rideId}`); // ✅ Return raw string
  }

  // Bulk location fetching
  async getLocationsBulk(userIds: string[], rideId: string): Promise<Map<string, any>> {
    const pipeline = this.client.pipeline();
    
    userIds.forEach(userId => {
      pipeline.get(`location:${userId}:${rideId}`);
    });
    
    const results = await pipeline.exec();
    const locations = new Map<string, any>();
    
    results?.forEach((result, index) => {
      const [error, data] = result;
      if (!error && data) {
        try {
          locations.set(userIds[index], JSON.parse(data as string));
        } catch (parseError) {
          console.error(`Failed to parse location for user ${userIds[index]}`);
        }
      }
    });
    
    return locations;
  }

  // Rate limiting - FIXED: Atomic operation
  async checkRateLimit(key: string, limit: number, ttl: number): Promise<boolean> {
    const script = `
      local current = redis.call('incr', KEYS[1])
      if current == 1 then
        redis.call('expire', KEYS[1], ARGV[1])
      end
      return current
    `;
    
    const current = await this.client.eval(script, 1, key, ttl) as number;
    return current <= limit;
  }

  // Location update counter
  async incrementLocationCounter(userId: string, rideId: string): Promise<number> {
    const key = `counter:location:${userId}:${rideId}`;
    const script = `
      local current = redis.call('incr', KEYS[1])
      if current == 1 then
        redis.call('expire', KEYS[1], ARGV[1])
      end
      return current
    `;
    
    return await this.client.eval(script, 1, key, 3600) as number; // 1 hour TTL
  }

  async deleteLocationCounter(userId: string, rideId: string): Promise<void> {
    await this.del(`counter:location:${userId}:${rideId}`);
  }

  async deleteAllRideCounters(rideId: string): Promise<void> {
    const pattern = `counter:location:*:${rideId}`;
    const keys = await this.client.keys(pattern);
    
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
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

  // User online status - FIXED: Added setUserOffline
  async setUserOnline(userId: string): Promise<void> {
    await this.set(`user:${userId}:online`, 'true', 300); // 5 minutes
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.del(`user:${userId}:online`);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return this.exists(`user:${userId}:online`);
  }

  // WebSocket session mapping - FIXED: Cleanup empty hashes
  async addSocketSession(userId: string, socketId: string): Promise<void> {
    await this.client.hset(`user:${userId}:sockets`, socketId, Date.now().toString());
    await this.client.expire(`user:${userId}:sockets`, 3600); // 1 hour
  }

  async removeSocketSession(userId: string, socketId: string): Promise<void> {
    await this.client.hdel(`user:${userId}:sockets`, socketId);
    
    // Clean up empty hash
    const remaining = await this.client.hlen(`user:${userId}:sockets`);
    if (remaining === 0) {
      await this.client.del(`user:${userId}:sockets`);
    }
  }

  async getUserSockets(userId: string): Promise<string[]> {
    const exists = await this.client.exists(`user:${userId}:sockets`);
    if (!exists) return [];
    
    const sockets = await this.client.hgetall(`user:${userId}:sockets`);
    return Object.keys(sockets);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    memoryUsage: string;
    keyCount: number;
  }> {
    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbsize();
      
      return {
        connected: this.client.status === 'ready',
        memoryUsage: info.match(/used_memory_human:(.+)/)?.[1] || 'unknown',
        keyCount: dbSize,
      };
    } catch (error) {
      throw new Error('Redis health check failed');
    }
  }

  // Flush all (DANGER - dev only)
  async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot flush Redis in production');
    }
    await this.client.flushall();
  }
}