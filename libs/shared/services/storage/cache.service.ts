import type { RedisService } from '@notifications/shared/services';
import { inject, injectable } from 'inversify';
import type { createClient } from 'redis';

import type { IdentityUserInfo } from '../../types/domain.types';
import type { LoggerService } from '../integrations/logger.service';
import SHARED_SYMBOLS from '../symbols';
import { RedisCache } from './redis-cache.service';

/**
 * Cache configuration type
 *
 * This type is used to define the cache configuration for the application and is responsible for
 * type checking for the different caches
 */
export type CacheConfigType = {
  IdentityUserInfo: RedisCache<IdentityUserInfo>;
};

@injectable()
/**
 * Cache service
 *
 * This service is used to group all application caches and return them by their global identifier
 */
export class CacheService {
  private cacheConfigMap: CacheConfigType;
  private redis: ReturnType<typeof createClient>;

  constructor(
    @inject(SHARED_SYMBOLS.RedisService) private redisService: RedisService,
    @inject(SHARED_SYMBOLS.LoggerService) private logger: LoggerService
  ) {
    this.redis = this.redisService.client;
    // Setting the cacheConfigMap here before connecting so that it's already available at injection time
    this.cacheConfigMap = {
      IdentityUserInfo: new RedisCache<IdentityUserInfo>(this.redis, this.logger, 'IdentityUserInfo')
    };
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
