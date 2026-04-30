import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: RedisClientType | null = null;
  private enabled: boolean = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const kafkaEnabled = this.configService.get<boolean>('config.kafka.enabled');
    const redisConfig = this.configService.get<{
      enabled?: boolean;
      host?: string;
      port?: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
    }>('config.redis');
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async onModuleInit() {
    const redisUrl = this.configService.get('UPSTASH_REDIS_REST_URL');
    const redisToken = this.configService.get('UPSTASH_REDIS_REST_TOKEN');
  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const redisToken = this.configService.get<string>(
      'UPSTASH_REDIS_REST_TOKEN',
    );

    if (!kafkaEnabled || !redisConfig?.enabled) {
      this.logger.warn('Redis caching disabled because Kafka is off');
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
    if (!redisUrl || !redisToken || redisUrl.includes('your-redis-db')) {
      this.logger.warn(
        '⚠️ Upstash Redis not configured - caching disabled. Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env',
      );
    if (!redisUrl || !redisToken || !redisUrl.includes('your-redis-db')) {
      this.logger.warn(
        '⚠️ Upstash Redis not configured - caching disabled. Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env',
      );
      this.enabled = false;
      return;
    }

    try {
      const host = redisConfig.host || '127.0.0.1';
      const port = redisConfig.port || 6379;
      const password = redisConfig.password ? `:${encodeURIComponent(redisConfig.password)}@` : '';
      const db = Number.isInteger(redisConfig.db) ? redisConfig.db : 0;
      const url = `redis://${password}${host}:${port}/${db}`;

      this.redisClient = createClient({
        url,
      });

      this.redisClient.on('error', (error) => {
        this.logger.error(`Redis client error: ${error.message}`);
      });

      await this.redisClient.connect();
      await this.redisClient.ping();
      this.enabled = true;
      this.logger.log(`✅ Redis connected and ready at ${host}:${port}`);
    } catch (error: any) {
      this.logger.error(`❌ Redis connection failed: ${error.message}`);
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
      this.logger.log('✅ Upstash Redis connected and ready');
    } catch (error: any) {
      this.logger.error(`❌ Redis connection failed: ${error.message}`);
      this.logger.log('✅ Upstash Redis connected and ready');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Redis connection failed: ${errorMsg}`);
      this.enabled = false;
      this.redisClient = null;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (error: any) {
        this.logger.error(`Redis disconnect failed: ${error.message}`);
      }
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): RedisClientType | null {
    if (!this.enabled || !this.redisClient) {
      this.logger.warn('Redis not enabled, returning null');
      return null;
    }
    return this.redisClient;
  }

  /**
   * Check if Redis is enabled and connected
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Cache a value with TTL
   */
  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<boolean> {
    if (!this.enabled || !this.redisClient) {
      return false;
    }

    try {
      const ttl = ttlSeconds || Number(this.configService.get('REDIS_CACHE_TTL_DEFAULT')) || 300;
      await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
      const ttl = ttlSeconds || Number(this.configService.get('REDIS_CACHE_TTL_DEFAULT')) || 300;
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
      const ttlSecondsVal =
        ttlSeconds ??
        this.configService.get<number>('REDIS_CACHE_TTL_DEFAULT') ??
        300;
      await this.redisClient.setex(key, ttlSecondsVal, JSON.stringify(value));
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSecondsVal}s)`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache SET failed for ${key}: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redisClient) {
      return null;
    }

    try {
      const data = await this.redisClient.get(key);
      if (data === null) {
        this.logger.debug(`Cache MISS: ${key}`);
        return null;
      }
      this.logger.debug(`Cache HIT: ${key}`);
      if (typeof data === 'string') {
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as T;
        }
      }
      return data as T;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache GET failed for ${key}: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<boolean> {
    if (!this.enabled || !this.redisClient) {
      return false;
    }

    try {
      await this.redisClient.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache DEL failed for ${key}: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.redisClient) {
      return 0;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      for (const key of keys) {
        await this.redisClient.del(key);
      }
      this.logger.debug(`Cache DEL pattern ${pattern}: deleted ${keys.length} keys`);
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
      await this.redisClient.del(...keys);
      this.logger.debug(`Cache DEL pattern ${pattern}: deleted ${keys.length} keys`);
      await this.redisClient.del(...keys);
      this.logger.debug(
        `Cache DEL pattern ${pattern}: deleted ${keys.length} keys`,
      );
      return keys.length;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache DEL pattern failed for ${pattern}: ${errorMsg}`);
      return 0;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.enabled || !this.redisClient) {
      return 0;
    }

    try {
      const result = await this.redisClient.incr(key);
      this.logger.debug(`Cache INCR: ${key} = ${result}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache INCR failed for ${key}: ${errorMsg}`);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    if (!this.enabled || !this.redisClient) {
      return 0;
    }

    try {
      const result = await this.redisClient.decr(key);
      this.logger.debug(`Cache DECR: ${key} = ${result}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache DECR failed for ${key}: ${errorMsg}`);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.redisClient) {
      return false;
    }

    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache EXISTS failed for ${key}: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.enabled || !this.redisClient) {
      return false;
    }

    try {
      await this.redisClient.expire(key, seconds);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache EXPIRE failed for ${key}: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    if (!this.enabled || !this.redisClient) {
      return { connected: false, error: 'Redis not configured' };
    }

    try {
      const start = Date.now();
      await this.redisClient.ping();
      const latency = Date.now() - start;
      return { connected: true, latency };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { connected: false, error: errorMsg };
    }
  }
}
