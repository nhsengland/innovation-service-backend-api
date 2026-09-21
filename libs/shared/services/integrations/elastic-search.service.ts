import { Client } from '@elastic/elasticsearch';
import type { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticSearchErrorsEnum, InternalServerError, ServiceUnavailableError } from '../../errors';
import { inject, injectable } from 'inversify';
import { ES_CONNECTION_CONFIG } from '../../config/elastic-search.config';
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
      throw new ServiceUnavailableError(ElasticSearchErrorsEnum.ES_SERVICE_UNAVAILABLE);
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
      throw new InternalServerError(ElasticSearchErrorsEnum.ES_CREATE_INDEX_ERROR);
    }
  }

  /**
   * Bulk inserts the given data into the index.
   */
  async bulkInsert<T extends { id: string }>(index: string, data: T[]): Promise<void> {
    const operations = data.flatMap(cur => {
      const { id, ...doc } = cur;
      return [{ index: { _index: index, _id: id } }, doc];
    });

    const response = await this.client.bulk({ refresh: true, operations });

    // TODO: We can check the documents that gave error and retry them.
    if (response.errors) {
      this.logger.error('ElasticSearch::error: while bulk ingesting documents.');
      throw new InternalServerError(ElasticSearchErrorsEnum.ES_BULK_INSERT_ERROR);
    }

    this.logger.log(`ElasticSearch: ${response.items.length} documents inserted in ${response.took}.`);
  }

  /*
   * Upserts a document for the given id.
   */
  async upsertDocument<T extends { id: string }>(index: string, data: T): Promise<void> {
    const { id, ...doc } = data;
    await this.client.update({ index, id, doc, doc_as_upsert: true });
  }

  async destroy(): Promise<void> {
    await this.#instance.close();
  }
}
