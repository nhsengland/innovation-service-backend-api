import { inject, injectable } from 'inversify';
import { createClient } from 'redis';
import type { LoggerService } from '../integrations/logger.service';
import { REDIS_DEFAULT_CONNECTION } from '../../config/redis.config';
import SHARED_SYMBOLS from '../symbols';

type Sets = 'elasticsearch';

@injectable()
export class RedisService {
  private redis: ReturnType<typeof createClient>;
  get client() {
    return this.redis;
  }

  constructor(@inject(SHARED_SYMBOLS.LoggerService) private logger: LoggerService) {
    this.redis = createClient(REDIS_DEFAULT_CONNECTION);

    this.logger.log('Initializing cache service');
    this.redis.on('error', err => this.logger.error(err));
    this.redis.on('ready', () => this.logger.log('Redis is ready'));
    void this.redis.connect();
  }

  async addToSet(key: Sets, members: string | string[]): Promise<void> {
    try {
      await this.redis.sAdd(key, members);
    } catch (err) {
      this.logger.error(`Error adding keys ${members} in set ${key}`, err);
    }
  }

  async popFromSet(key: Sets): Promise<string | null> {
    try {
      const member = await this.redis.sPop(key, 1);
      return member?.length > 0 ? member[0]! : null;
    } catch (err) {
      this.logger.error(`Error popping in set ${key}`, err);
      return null;
    }
  }

  async destroy(): Promise<void> {
    await this.redis.quit();
  }
}
