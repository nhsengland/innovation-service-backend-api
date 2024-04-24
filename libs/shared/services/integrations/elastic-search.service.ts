import { Client } from '@elastic/elasticsearch';
import type { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { inject, injectable } from 'inversify';
import { ES_CONNECTION_CONFIG } from 'libs/shared/config/elastic-search.config';
import SHARED_SYMBOLS from '../symbols';
import type { LoggerService } from './logger.service';

export type CreateIndexParams = Pick<IndicesCreateRequest, 'aliases' | 'mappings' | 'settings'>;

@injectable()
export class ElasticSearchService {
  #instance: Client;

  constructor(@inject(SHARED_SYMBOLS.LoggerService) private logger: LoggerService) {
    this.logger.log('ElasticSearch::connecting');

    try {
      this.#instance = new Client(ES_CONNECTION_CONFIG);
    } catch (error: any) {
      this.logger.error('ElasticSearch::error', error);
    }

    this.logger.log('ElasticSearch::ready');
  }

  get client(): Client {
    return this.#instance;
  }

  /**
   * It creates an index on the ES node.
   * If the index already exists the function will recreate it by deleting it first.
   */
  async createIndex(index: string, params: CreateIndexParams): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index });
      if (exists) {
        await this.client.indices.delete({ index });
      }
      await this.client.indices.create({ index, ...params });
    } catch (error) {
      this.logger.error('ElasticSearch::error::createIndex', error);
    }
  }

  async destroy(): Promise<void> {
    await this.#instance.close();
  }
}
