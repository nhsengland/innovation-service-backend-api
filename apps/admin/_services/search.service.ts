import { ES_ENV } from '@admin/shared/config';
import { CurrentElasticSearchDocumentType, ElasticSearchSchema } from '@admin/shared/schemas/innovation-record';
import type { DomainService, ElasticSearchService } from '@admin/shared/services';
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

  /**
   * Creates an index based on the latest elastic search schema
   * and ingests documents automatically by default.
   *
   * TODO: Rollover strategy, create another, ingest, and then delete the old one [ALIAS]
   */
  async createAndPopulateIndex(): Promise<void> {
    await this.esService.createIndex(this.index, ElasticSearchSchema);

    const data = await this.domainService.innovations.getESDocumentsInformation();
    await this.esService.bulkInsert<CurrentElasticSearchDocumentType>(this.index, data);
  }
}
