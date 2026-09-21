import { ES_ENV } from '@admin/shared/config';
import { CurrentElasticSearchDocumentType, ElasticSearchSchema } from '@admin/shared/schemas/innovation-record';
import type { DomainService, ElasticSearchService } from '@admin/shared/services';
import { ElasticSearchErrorsEnum, InternalServerError } from '@admin/shared/errors';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { inject, injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class SearchService extends BaseService {
  private index: string;

  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private readonly domainService: DomainService,
    @inject(SHARED_SYMBOLS.ElasticSearchService) private readonly esService: ElasticSearchService
  ) {
    super();
    this.index = ES_ENV.esInnovationIndexName;
  }

  /** Creates the index and ingests the latest SQL documents in bounded batches. */
  async createAndPopulateIndex(): Promise<void> {
    try {
      await this.esService.createIndex(this.index, ElasticSearchSchema);

      const data = await this.domainService.innovations.getESDocumentsInformation();
      const batchSize = 500;
      const totalBatches = Math.ceil(data.length / batchSize);

      this.logger.log(`Starting Elasticsearch reindex with ${data.length} documents in ${totalBatches} batches.`);

      for (let offset = 0; offset < data.length; offset += batchSize) {
        const batch = data.slice(offset, offset + batchSize);
        const batchNumber = Math.floor(offset / batchSize) + 1;
        this.logger.log(
          `Indexing Elasticsearch reindex batch ${batchNumber}/${totalBatches} (${batch.length} documents).`
        );
        await this.esService.bulkInsert<CurrentElasticSearchDocumentType>(this.index, batch, { refresh: false });
      }

      await this.esService.refreshIndex(this.index);
      const indexedCount = await this.esService.countDocuments(this.index);

      if (indexedCount !== data.length) {
        throw new InternalServerError(ElasticSearchErrorsEnum.ES_REINDEX_VALIDATION_ERROR);
      }

      this.logger.log(`Finished Elasticsearch reindex with ${indexedCount} documents.`);
    } catch (error) {
      this.logger.error('Elasticsearch reindex failed.', error);
      throw error;
    }
  }
}
