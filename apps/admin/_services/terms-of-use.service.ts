import { TermsOfUseEntity } from '@admin/shared/entities';
import type { TermsOfUseTypeEnum } from '@admin/shared/enums';
import { NotFoundError } from '@admin/shared/errors';
import { AdminErrorsEnum } from '@admin/shared/errors/errors.enums';
import type { PaginationQueryParamsType } from '@admin/shared/helpers';

import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';
import type { DomainContextType } from '@admin/shared/types';

@injectable()
export class TermsOfUseService extends BaseService {
  constructor() {
    super();
  }

  async createTermsOfUse(
    domainContext: DomainContextType,
    touPayload: {
      name: string;
      touType: TermsOfUseTypeEnum;
      summary?: string;
      releasedAt?: Date;
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    return await em.transaction(async transaction => {
      const savedToU = await transaction.save(
        TermsOfUseEntity,
        TermsOfUseEntity.new({
          name: touPayload.name,
          touType: touPayload.touType,
          summary: touPayload.summary || '',
          createdBy: domainContext.id,
          updatedBy: domainContext.id,
          releasedAt: touPayload.releasedAt || null
        })
      );

      return { id: savedToU.id };
    });
  }

  async updateTermsOfUse(
    domainContext: DomainContextType,
    touPayload: {
      name: string;
      touType: TermsOfUseTypeEnum;
      summary?: string;
      releasedAt?: Date;
    },
    touId: string,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    await em.transaction(async transaction => {
      await transaction.update(
        TermsOfUseEntity,
        { id: touId },
        {
          name: touPayload.name,
          touType: touPayload.touType,
          summary: touPayload.summary || '',
          updatedBy: domainContext.id,
          releasedAt: touPayload.releasedAt || null
        }
      );
    });

    return { id: touId };
  }

  /**
   * gets a list of terms of use according to the pagination and ordering parameters.
   * @param pagination pagination and ordering parameters.
   * @param entityManager optional entity manager
   * @returns list of terms of use and total count.
   */
  async getTermsOfUseList(
    pagination: PaginationQueryParamsType<'createdAt'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      name: string;
      touType: TermsOfUseTypeEnum;
      summary: string;
      releasedAt: Date | null;
      createdAt: Date;
    }[];
  }> {
    const em = entityManager || this.sqlConnection.manager;

    const query = em.createQueryBuilder(TermsOfUseEntity, 'tou');

    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt':
          field = 'tou.createdAt';
          break;
        default:
          field = 'tou.createdAt';
          break;
      }
      query.addOrderBy(field, order);
    }

    const termsOfUseList = await query.getManyAndCount();

    return {
      count: termsOfUseList[1],
      data: termsOfUseList[0].map(t => ({
        id: t.id,
        name: t.name,
        touType: t.touType,
        summary: t.summary,
        releasedAt: t.releasedAt,
        createdAt: t.createdAt
      }))
    };
  }

  /**
   * gets a list of terms of use according to the pagination and ordering parameters.
   * @param pagination pagination and ordering parameters.
   * @param entityManager optional entity manager
   * @returns list of terms of use and total count.
   */
  async getTermsOfUse(
    id: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    name: string;
    touType: TermsOfUseTypeEnum;
    summary: string;
    releasedAt: Date | null;
    createdAt: Date;
  }> {
    const em = entityManager || this.sqlConnection.manager;

    const tou = await em.createQueryBuilder(TermsOfUseEntity, 'tou').where('tou.id = :id', { id }).getOne();

    if (!tou) {
      throw new NotFoundError(AdminErrorsEnum.ADMIN_TERMS_OF_USE_NOT_FOUND);
    }

    return {
      id: tou.id,
      name: tou.name,
      touType: tou.touType,
      summary: tou.summary,
      releasedAt: tou.releasedAt,
      createdAt: tou.createdAt
    };
  }
}
