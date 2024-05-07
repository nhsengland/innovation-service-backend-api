import type { CurrentElasticSearchDocumentType } from '@innovations/shared/schemas/innovation-record';
import type { DomainService, ElasticSearchService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { inject, injectable } from 'inversify';
import { ENV } from '../_config';
import { BaseService } from './base.service';

@injectable()
export class SearchService extends BaseService {
  private index: string;
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.ElasticSearchService) private readonly esService: ElasticSearchService
  ) {
    super();
    this.index = ENV.esInnovationIndexName;
  }

  /**
   * This method builds that data that needs to be ingested in the
   * index. Everytime the IR changes this needs to be updated.
   */
  async ingestAllDocuments(): Promise<void> {
    const data = await this.domainService.innovations.getESDocumentsInformation();
    await this.esService.bulkInsert<CurrentElasticSearchDocumentType>(this.index, data);
  }

  /**
   * Upserts a document for a given innovation.
   * Can be used when an innovation changes and an update on the properties is needed.
   */
  async upsertDocument(innovationId: string): Promise<void> {
    const [data] = await this.domainService.innovations.getESDocumentsInformation([innovationId]);
    if (data) {
      await this.esService.upsertDocument(this.index, data);
    }
  }
}
