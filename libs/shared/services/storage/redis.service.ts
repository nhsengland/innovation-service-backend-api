import { inject, injectable } from 'inversify';
import { createClient } from 'redis';
import { LoggerService } from '../integrations/logger.service';
import { REDIS_DEFAULT_CONNECTION } from '../../config/redis.config';
import SHARED_SYMBOLS from '../symbols';
import { isArray } from 'lodash';

type Sets = 'elasticsearch';

@injectable()
export class RedisService {
  private redis: ReturnType<typeof createClient>;
  get client(): ReturnType<typeof createClient> {
    return this.redis;
  }

  constructor(@inject(SHARED_SYMBOLS.LoggerService) private logger: LoggerService) {
    this.redis = createClient(REDIS_DEFAULT_CONNECTION);

    this.logger.log('Initializing cache service');
    this.redis.on('error', err => this.logger.error('Redis client error', err));
    this.redis.on('ready', () => this.logger.log('Redis is ready'));
    void this.redis.connect().catch(err => this.logger.error('Redis connection failed', err));
  }

  async addToSet(key: Sets, members: string | string[]): Promise<void> {
    const values = isArray(members) ? members : [members];
    if (values?.length === 0) return;

    try {
      await this.redis.sAdd(key, values);
    } catch (err) {
      this.logger.error(`Error adding keys ${values} in set ${key}`, err);
    }
  }

  async popFromSet(key: Sets): Promise<string | null> {
    try {
      const member = await this.redis.sPop(key, 1);
      return member?.length > 0 ? member[0]! : null;
    } catch (err) {
      this.logger.error(`Error popping in set ${key}`, err);
      throw err;
    }
  }

  async destroy(): Promise<void> {
    await this.redis.quit();
  }
}
