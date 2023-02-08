import { TermsOfUseEntity } from '@admin/shared/entities';
import type { TermsOfUseTypeEnum } from '@admin/shared/enums';
import type { PaginationQueryParamsType } from '@admin/shared/helpers';
import type { DateISOType } from '@admin/shared/types';
import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class TermsOfUseService extends BaseService {
  constructor() {
    super();
  }

  async createTermsOfUse(
    requestUser: { id: string },
    touPayload: {
      name: string;
      touType: TermsOfUseTypeEnum;
      summary?: string;
      releasedAt?: DateISOType;
    }
  ): Promise<{ id: string }> {
    return await this.sqlConnection.transaction(async (transaction) => {
      const savedToU = await transaction.save(
        TermsOfUseEntity,
        TermsOfUseEntity.new({
          name: touPayload.name,
          touType: touPayload.touType,
          summary: touPayload.summary || '',
          createdBy: requestUser.id,
          updatedBy: requestUser.id,
          releasedAt: touPayload.releasedAt || null,
        })
      );

      return { id: savedToU.id };
    });
  }

  async updateTermsOfUse(
    requestUser: { id: string },
    touPayload: {
      name: string,
      touType: TermsOfUseTypeEnum,
      summary?: string,
      releasedAt?: DateISOType
    },
    touId: string
  ):
    Promise<{ id: string }> {

    await this.sqlConnection.transaction(async transaction => {

      await transaction.update(
        TermsOfUseEntity,
        { id: touId },
        {
          name: touPayload.name,
          touType: touPayload.touType,
          summary: touPayload.summary || '',
          updatedBy: requestUser.id,
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
  async getTermsOfUseList(pagination: PaginationQueryParamsType<'createdAt'>, entityManager?: EntityManager): Promise<{
    count: number;
    data: {
      id: string;
      name: string;
      touType: TermsOfUseTypeEnum;
      summary: string;
      releaseAt: DateISOType | null;
      createdAt: DateISOType;
    }[]
  }> {
    const em = entityManager || this.sqlConnection.manager;
    
    const query = em.createQueryBuilder(TermsOfUseEntity, 'tou');
    
    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt': field = 'tou.createdAt'; break;
        default:
          field = 'tou.createdAt'; break;
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
        releaseAt: t.releasedAt,
        createdAt: t.createdAt
      }))
    };
  }
}
