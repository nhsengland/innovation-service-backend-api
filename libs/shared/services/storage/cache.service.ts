import { inject, injectable } from 'inversify';
import { createClient } from 'redis';

import { REDIS_DEFAULT_CONNECTION } from '../../config/redis.config';
import type { IdentityUserInfo } from '../../types/domain.types';
import { LoggerServiceSymbol, LoggerServiceType } from '../interfaces';
import { RedisCache } from './redis-cache.service';

/**
 * Cache configuration type
 * 
 * This type is used to define the cache configuration for the application and is responsible for
 * type checking for the different caches
 */
export type CacheConfigType = {
  IdentityUserInfo: RedisCache<IdentityUserInfo>;
}

@injectable()
/**
 * Cache service
 * 
 * This service is used to group all application caches and return them by their global identifier
 */
export class CacheService {

  private cacheConfigMap: CacheConfigType;
  private redis: ReturnType<typeof createClient>;

  constructor(@inject(LoggerServiceSymbol) private logger: LoggerServiceType) {
    this.redis = createClient(REDIS_DEFAULT_CONNECTION);
    // Setting the cacheConfigMap here before connecting so that it's already available at injection time
    this.cacheConfigMap = {
      IdentityUserInfo: new RedisCache<IdentityUserInfo>(this.redis, this.logger, 'IdentityUserInfo', 300000)
    }
  }

  /**
   * initializes the cache service dependencies (ie: redis)
   * @returns self
   */
  async init(): Promise<this> {
    this.logger.log('Initializing cache service');
    this.redis.on('error', (err) => this.logger.error(err));
    this.redis.on('ready', () => this.logger.log('Redis is ready'));
    await this.redis.connect();

    return this;
  }

  /**
   * returns a cache for a given domain type
   * @param cacheId the cache global identifier
   * @returns the cache
   */
  get<T extends keyof CacheConfigType>(cacheId: T): CacheConfigType[T] {
    return this.cacheConfigMap[cacheId];
  }
}
