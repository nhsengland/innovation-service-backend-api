import { injectable } from 'inversify';

import { InnovationDocumentEntity, InnovationEntity, InnovationSectionEntity } from '@admin/shared/entities';
import { InnovationSectionStatusEnum } from '@admin/shared/enums';
import { GenericErrorsEnum, InnovationErrorsEnum, NotFoundError, NotImplementedError } from '@admin/shared/errors';
import { CurrentCatalogTypes, createSampleDocument } from '@admin/shared/schemas/innovation-record';
import type { DomainContextType } from '@admin/shared/types';

import { BaseService } from './base.service';

@injectable()
export class DemoService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Generates a demo IR document for an innovation
   * @param domainContext the domain context
   * @param innovationId the innovation id
   */
  async updateInnovationWithDemoData(domainContext: DomainContextType, innovationId: string): Promise<void> {
    // Double check for safety
    if (process.env['DEMO_MODE'] !== 'true') {
      throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR);
    }

    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    await this.sqlConnection.transaction(async transaction => {
      const now = new Date();
      const sectionsMap = new Map(
        (
          await transaction
            .createQueryBuilder(InnovationSectionEntity, 'innovationSection')
            .where('innovation_id = :id', { id: innovationId })
            .getMany()
        ).map(s => [s.section, s])
      );

      // Create/Update all sections to submitted
      for (const sectionKey of CurrentCatalogTypes.InnovationSections) {
        if (sectionsMap.has(sectionKey)) {
          await transaction.update(
            InnovationSectionEntity,
            { id: sectionsMap.get(sectionKey)?.id },
            {
              status: InnovationSectionStatusEnum.SUBMITTED,
              submittedAt: now,
              submittedBy: { id: domainContext.id },
              updatedAt: now,
              updatedBy: domainContext.id
            }
          );
        } else {
          await transaction.insert(InnovationSectionEntity, {
            innovation: { id: innovationId },
            section: sectionKey,
            status: InnovationSectionStatusEnum.SUBMITTED,
            submittedAt: now,
            submittedBy: { id: domainContext.id },
            createdAt: now,
            createdBy: domainContext.id,
            updatedAt: now,
            updatedBy: domainContext.id
          });
        }
      }

      // Filling the example document
      const document = createSampleDocument({
        name: innovation.name,
        ...(innovation.description && { description: innovation.description }),
        countryName: innovation.countryName,
        ...(innovation.postcode && { postcode: innovation.postcode })
      });
      await transaction.update(
        InnovationDocumentEntity,
        { id: innovationId },
        { document, description: 'demo data updated' }
      );
    });
  }
}
