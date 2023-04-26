import type { createClient } from 'redis';
import type { LoggerServiceType } from '../interfaces';

const DEFAULT_CACHE_TTL = Number(process.env['REDIS_CACHE_TTL']) || 24 * 3600; // This is really || since we want to use the default if the env variable is not set or NaN

export class RedisCache<T> {
  /**
   * Redis cache instance
   * @param redis the redis connection to use. This is injected by the cache service and can be shared by multiple caches
   * @param logger the logger service to use. This is injected by the cache service
   * @param name the cache name. This is used in the cache keys
   * @param ttl the default ttl if not specified in the set method
   */
  constructor(
    private redis: ReturnType<typeof createClient>,
    private logger: LoggerServiceType,
    private name: string,
    private ttl = DEFAULT_CACHE_TTL
  ) {
    this.logger.log(`Cache ${this.name} created with ttl ${this.ttl}s`);
  }

  /**
   * gets single value from the cache
   * @param key key to be searched
   * @returns the value or undefined if not found
   */
  async get(key: string): Promise<T | undefined> {
    try {
      const value = await this.redis.get(`${this.name}_${key}`);
      return value === null ? undefined : (JSON.parse(value) as T);
    } catch (e) {
      this.logger.log(
        `Error getting key ${key} from cache ${this.name}: ${e instanceof Error && e.message}`
      );
      return undefined;
    }
  }

  /**
   * gets multiple values from the cache
   * @param keys keys to be searched
   * @returns the values founds
   */
  async getMany(keys: string[]): Promise<T[]> {
    try {
      return (await this.redis.mGet(keys.map((key) => `${this.name}_${key}`)))
        .filter((item): item is string => item !== null)
        .map((item) => JSON.parse(item) as T);
    } catch (e) {
      this.logger.log(
        `Error getting keys ${keys} from cache ${this.name}: ${e instanceof Error && e.message}`
      );
      return [];
    }
  }

  /**
   * sets single value in the cache
   * @param key the cache key
   * @param value the value to be set
   * @param _ttl the ttl in seconds, currently ignored
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.redis.set(`${this.name}_${key}`, JSON.stringify(value), { EX: ttl ?? this.ttl });
    } catch (e) {
      this.logger.log(
        `Error setting key ${key} in cache ${this.name}: ${e instanceof Error && e.message}`
      );
    }
  }

  /**
   * sets multiple values in the cache
   * @param values list of key value pairs to be set
   * @param _ttl the ttl in seconds, currently ignored
   */
  async setMany(values: { key: string; value: T }[], _ttl?: number): Promise<void> {
    try {
      // Redis doesn't support setting multiple keys with ttl (I believe running multiple sets is faster than running a single mSet + multi expires)
      // (use the commented code if you want to use mSet)
      // MSET await this.redis.mSet(values.flatMap(({key, value}) => [`${this.name}_${key}`, JSON.stringify(value)]));
      for (const value of values) {
        //MSET await this.redis.expire(`${this.name}_${value.key}`, _ttl ?? this.ttl);
        await this.redis.set(`${this.name}_${value.key}`, JSON.stringify(value.value), {
          EX: _ttl ?? this.ttl,
        });
      }
    } catch (e) {
      this.logger.log(
        `Error setting keys ${values.map(({ key }) => key)} in cache ${this.name}: ${
          e instanceof Error && e.message
        }`
      );
    }
  }

  /**
   * deletes a single value from the cache
   * @param _key the key to be deleted
   * @raises an error if the key fails to be deleted
   */
  async delete(key: string): Promise<void> {
    await this.redis.del(`${this.name}_${key}`);
  }

  /**
   * deletes multiple values from the cache
   * @param _keys the keys to be deleted
   * @raises an error if any of the keys fail to be deleted
   */
  async deleteMany(keys: string[]): Promise<void> {
    await this.redis.del(keys.map((key) => `${this.name}_${key}`));
  }
}
