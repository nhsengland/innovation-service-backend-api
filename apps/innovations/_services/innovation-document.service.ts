import { injectable } from 'inversify';

import type { EntityManager } from 'typeorm';

import { ServiceRoleEnum } from '@innovations/shared/enums';
import { ConflictError, InnovationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
import {
  CurrentDocumentConfig,
  DocumentType,
  DocumentTypeFromVersion
} from '@innovations/shared/schemas/innovation-record';

import { BaseService } from './base.service';
import { InnovationDocumentDraftEntity, InnovationDocumentEntity } from '@innovations/shared/entities';
import type { DomainContextType } from '@innovations/shared/types';

@injectable()
export class InnovationDocumentService extends BaseService {
  constructor() {
    super();
  }

  /**
   * retrieves the latest version of a document from the database and validates the version
   * @param innovationId the innovation id
   * @param version version of the document to retrieve
   * @param type submitted or draft type
   * @param entityManager optional entity manager for running inside transaction
   * @returns the document
   */
  async getInnovationDocument<V extends DocumentType['version'], T extends DocumentTypeFromVersion<V>>(
    innovationId: string,
    version: V,
    type: 'SUBMITTED' | 'DRAFT',
    entityManager?: EntityManager
  ): Promise<T> {
    const connection = entityManager ?? this.sqlConnection.manager;
    let document: DocumentType | undefined;

    if (version === CurrentDocumentConfig.version) {
      document = (
        await connection
          .createQueryBuilder(
            type === 'SUBMITTED' ? InnovationDocumentEntity : InnovationDocumentDraftEntity,
            'document'
          )
          .where('document.id = :innovationId', { innovationId })
          .andWhere('document.version = :version', { version })
          .getOne()
      )?.document;
    } else {
      const raw = await connection.query(
        `
        SELECT TOP 1 document
        FROM ${type === 'SUBMITTED' ? 'innovation_document' : 'innovation_document_draft'}
        FOR SYSTEM_TIME ALL
        WHERE id = @0
        AND version = @1
        ORDER BY valid_to DESC
      `,
        [innovationId, version]
      );

      document = raw.length ? JSON.parse(raw[0].document) : undefined;
    }

    if (!document) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    if (document.version !== version) {
      throw new ConflictError(InnovationErrorsEnum.INNOVATION_DOCUMENT_VERSION_MISMATCH);
    }

    return document as T;
  }

  /**
   * Responsible for syncing the submitted version with the current state of draft.
   * This function is useful to make sure that the SUBMITTED document is in the same
   * state as the DRAFT.
   */
  async syncDocumentVersions(
    domainContext: DomainContextType,
    innovationId: string,
    transaction: EntityManager,
    params?: { updatedAt?: Date; description?: string }
  ): Promise<void> {
    const draftDocument = await this.getInnovationDocument(
      innovationId,
      CurrentDocumentConfig.version,
      'DRAFT',
      transaction
    );
    await transaction.update(
      InnovationDocumentEntity,
      { id: innovationId },
      {
        document: draftDocument,
        updatedAt: params?.updatedAt ?? new Date(),
        updatedBy: domainContext.id,
        isSnapshot: true,
        description: params?.description ?? 'INNOVATION-SUBMITTED'
      }
    );
  }

  /**
   * This function returns the type of IR that the role can see.
   * This is "the most consensual" but there are some exceptions, namely for the ADMIN which are not handled here.
   * Admin: on lists see the SUBMITTED version but on the info he sees the DRAFT.
   * QA/A/NA: always sees the SUBMITTED version.
   * Innovators: always sees the DRAFT version.
   */
  getDocumentTypeAccordingWithRole(role: ServiceRoleEnum): 'SUBMITTED' | 'DRAFT' {
    return [ServiceRoleEnum.INNOVATOR, ServiceRoleEnum.ADMIN].includes(role) ? 'DRAFT' : 'SUBMITTED';
  }
}
